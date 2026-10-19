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
import { readPreviewPointer } from "../publish/pointer";
import { listPublishedDataVersions } from "../publish/repository";
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

  const currentDataVersion = dataset.current_data_version ?? null;
  const catalog = await upsertCatalogEntry(env.BUCKET, {
    slug: dataset.slug,
    title: dataset.title,
    currentSchemaVersion: version,
    currentDataVersion,
    /* 注册 ≠ 数据：冻结即入目录（R7），未发布过数据时标 hasData:false（R3）。 */
    hasData: currentDataVersion !== null,
    updatedAt: frozenAt,
  });

  /*
   * R8：freeze 成功即写 manifest（首次冻结 → dataVersions:[]、latest:null、preview:null）。
   * 对已发布过的数据集再冻结时，manifest 必须保留既有已发布版本列表——
   * 否则会出现 latest 不在 dataVersions[] 里的非法清单（R8 不变式：latest ∈ {null} ∪ dataVersions[].version）。
   * preview 快照不进 dataVersions[]（上层已定：preview 不进，isPreview v1 恒 false）。
   */
  /* preview 的唯一权威 = preview.json 指针（E11 / T12）：re-freeze 也不能让 manifest.preview
     与指针脱钩（否则读者经 manifest.preview 拼路径会拿到 404）。 */
  const previewVersion = (await readPreviewPointer(env.BUCKET, dataset.slug))?.dataVersion ?? null;
  const publishedVersions = await listPublishedDataVersions(env, datasetId);
  const manifest = buildManifest({
    slug: dataset.slug,
    title: dataset.title,
    schemaVersion: version,
    dataVersions: publishedVersions.map((row) => ({
      version: row.version,
      publishedAt: row.published_at,
      isLatest: row.version === currentDataVersion,
      isPreview: false,
    })),
    latest: currentDataVersion,
    preview: previewVersion,
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
