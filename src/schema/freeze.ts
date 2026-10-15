import {
  type DatasetRow,
  getDatasetById,
  getSchemaVersion,
  type SchemaVersionRow,
} from "../datasets/repository";
import type { Env } from "../env";
import { auditStatement } from "../lib/audit";
import { ConflictError } from "../lib/errors";
import { nowIso } from "../lib/ids";
import { type CatalogIndex, upsertCatalogEntry } from "../r2/catalog";
import { schemaKey } from "../r2/keys";
import { buildManifest, type Manifest, writeManifest } from "../r2/manifest";
import { putImmutable } from "../r2/store";
import { bumpVersion, type ChangeKind, classifyChange } from "./compat";
import { assertSchemaShape } from "./validate";

export interface FreezeResult {
  dataset: DatasetRow;
  schemaVersion: SchemaVersionRow;
  changeKind: ChangeKind;
  expectedVersion: string;
  catalog: CatalogIndex;
  manifest: Manifest;
}

/**
 * 冻结一个 Schema 版本：校验结构 → 判定兼容性 → 校验版本号 → 落库冻结 →
 * 物化 JSON Schema 到 R2（同路径不可覆盖）→ 更新目录索引与 manifest → 记审计。
 */
export async function freezeSchemaVersion(
  env: Env,
  datasetId: string,
  version: string,
  actor: string | null,
): Promise<FreezeResult> {
  const dataset = await getDatasetById(env, datasetId);
  const row = await getSchemaVersion(env, datasetId, version);
  if (row.status === "frozen") {
    throw new ConflictError("already_frozen", `Schema 版本 ${version} 已冻结，不可重复冻结`);
  }

  const schemaDoc = JSON.parse(row.json_schema) as unknown;
  assertSchemaShape(schemaDoc);

  const currentVersion = dataset.current_schema_version;
  let changeKind: ChangeKind;
  if (!currentVersion) {
    changeKind = "initial";
  } else {
    const current = await getSchemaVersion(env, datasetId, currentVersion);
    changeKind = classifyChange(JSON.parse(current.json_schema), schemaDoc);
  }

  const expectedVersion = bumpVersion(currentVersion, changeKind);
  if (version !== expectedVersion) {
    throw new ConflictError(
      "version_mismatch",
      `依据兼容性判定本次冻结应使用版本 ${expectedVersion}`,
      {
        expectedVersion,
        changeKind,
      },
    );
  }

  const frozenAt = nowIso();
  await env.DB.batch([
    env.DB.prepare("UPDATE schema_version SET status = 'frozen' WHERE id = ?").bind(row.id),
    env.DB.prepare("UPDATE dataset SET current_schema_version = ? WHERE id = ?").bind(
      version,
      datasetId,
    ),
    auditStatement(env.DB, {
      actor,
      action: "schema.freeze",
      target: `${dataset.slug}@${version}`,
      detail: { changeKind },
    }),
  ]);

  await putImmutable(env.BUCKET, schemaKey(dataset.slug, version), schemaDoc);

  const catalog = await upsertCatalogEntry(env.BUCKET, {
    slug: dataset.slug,
    title: dataset.title,
    currentSchemaVersion: version,
    currentDataVersion: dataset.current_data_version ?? null,
    updatedAt: frozenAt,
  });

  const manifest = buildManifest({
    slug: dataset.slug,
    title: dataset.title,
    schemaVersion: version,
    latest: dataset.current_data_version ?? null,
    preview: dataset.current_preview_version ?? null,
  });
  await writeManifest(env.BUCKET, manifest);

  return {
    dataset: { ...dataset, current_schema_version: version },
    schemaVersion: { ...row, status: "frozen" },
    changeKind,
    expectedVersion,
    catalog,
    manifest,
  };
}
