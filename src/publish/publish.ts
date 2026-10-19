import { getDatasetById, getSchemaVersion } from "../datasets/repository";
import type { Env } from "../env";
import { auditStatement } from "../lib/audit";
import { BadRequestError, ConflictError } from "../lib/errors";
import { sha256Hex } from "../lib/hash";
import { newId, nowIso } from "../lib/ids";
import { stableStringify } from "../lib/stable-json";
import { rebuildGlobalSearchIndex } from "../ops/search-index";
import { upsertCatalogEntry } from "../r2/catalog";
import { dataSnapshotKey } from "../r2/keys";
import { buildManifest, type ManifestDataVersion, writeManifest } from "../r2/manifest";
import { putImmutable } from "../r2/store";
import { validatePayload } from "../schema/validate";
import {
  type LatestPointer,
  type PreviewPointer,
  readPreviewPointer,
  writeLatestPointer,
  writePreviewPointer,
} from "./pointer";
import {
  type DataVersionRow,
  insertDataVersion,
  listPublishedDataVersions,
  nextDataVersionNumber,
} from "./repository";

async function resolveFrozenSchema(
  env: Env,
  datasetId: string,
  dataset: Awaited<ReturnType<typeof getDatasetById>>,
): Promise<string> {
  const schemaVersion = dataset.current_schema_version;
  if (!schemaVersion) {
    throw new ConflictError("schema_not_frozen", "数据集尚未冻结 Schema，无法发布数据");
  }
  const schemaRow = await getSchemaVersion(env, datasetId, schemaVersion);
  return schemaRow.json_schema;
}

function assertValidPayload(schemaJson: string, payload: unknown): void {
  const validation = validatePayload(JSON.parse(schemaJson), payload);
  if (!validation.valid) {
    throw new BadRequestError("schema_validation_failed", "payload 未通过冻结 Schema 校验", {
      errors: validation.errors,
    });
  }
}

function toManifestVersions(
  rows: DataVersionRow[],
  latest: string,
  preview: string | null,
): ManifestDataVersion[] {
  return rows.map((row) => ({
    version: row.version,
    publishedAt: row.published_at,
    isLatest: row.version === latest,
    isPreview: preview !== null && row.version === preview,
  }));
}

export interface PublishResult {
  version: string;
  r2Key: string;
  contentHash: string;
  pointer: LatestPointer;
}

/**
 * 发布数据集：校验冻结 Schema → 物化不可变快照 → 写 latest 指针 → 落库数据版本与指针
 * → 重建 manifest → 更新目录索引 → 记审计。
 */
export async function publishDataset(
  env: Env,
  datasetId: string,
  payload: unknown,
  actor: string | null,
): Promise<PublishResult> {
  const dataset = await getDatasetById(env, datasetId);
  const schemaJson = await resolveFrozenSchema(env, datasetId, dataset);
  assertValidPayload(schemaJson, payload);

  const schemaVersion = dataset.current_schema_version as string;
  const version = String(await nextDataVersionNumber(env, datasetId));
  const contentHash = await sha256Hex(stableStringify(payload));
  const r2Key = dataSnapshotKey(dataset.slug, version);

  await putImmutable(env.BUCKET, r2Key, payload);

  const publishedAt = nowIso();
  const pointer: LatestPointer = {
    dataset: dataset.slug,
    dataVersion: version,
    schemaVersion,
    publishedAt,
    contentHash,
  };
  await writeLatestPointer(env.BUCKET, dataset.slug, pointer);

  const row: DataVersionRow = {
    id: newId(),
    dataset_id: datasetId,
    version,
    r2_key: r2Key,
    content_hash: contentHash,
    source_submission_id: null,
    status: "published",
    published_at: publishedAt,
  };
  await env.DB.batch([
    insertDataVersion(env, row),
    env.DB.prepare("UPDATE dataset SET current_data_version = ?, updated_at = ? WHERE id = ?").bind(
      version,
      publishedAt,
      datasetId,
    ),
    auditStatement(env.DB, {
      actor,
      action: "data.publish",
      target: `${dataset.slug}@${version}`,
      detail: { contentHash },
    }),
  ]);

  const preview =
    dataset.current_preview_version ??
    (await readPreviewPointer(env.BUCKET, dataset.slug))?.dataVersion ??
    null;
  const versions = await listPublishedDataVersions(env, datasetId);
  const manifest = buildManifest({
    slug: dataset.slug,
    title: dataset.title,
    schemaVersion,
    dataVersions: toManifestVersions(versions, version, preview),
    latest: version,
    preview,
  });
  await writeManifest(env.BUCKET, manifest);

  await upsertCatalogEntry(env.BUCKET, {
    slug: dataset.slug,
    title: dataset.title,
    currentSchemaVersion: schemaVersion,
    currentDataVersion: version,
    hasData: true,
    updatedAt: publishedAt,
  });

  await rebuildGlobalSearchIndex(env);

  return { version, r2Key, contentHash, pointer };
}

export interface StageResult {
  version: string;
  pointer: PreviewPointer;
}

/**
 * 预发布数据集：仅走指针机制（供 P4 复用）。物化不可变快照并写 preview 指针，
 * 不更新 dataset.current_data_version、不写 latest。
 */
export async function stageDataset(
  env: Env,
  datasetId: string,
  payload: unknown,
  actor: string | null,
): Promise<StageResult> {
  const dataset = await getDatasetById(env, datasetId);
  const schemaJson = await resolveFrozenSchema(env, datasetId, dataset);
  assertValidPayload(schemaJson, payload);

  const schemaVersion = dataset.current_schema_version as string;
  const version = `preview-${Date.now()}`;
  const r2Key = dataSnapshotKey(dataset.slug, version);

  await putImmutable(env.BUCKET, r2Key, payload);

  const stagedAt = nowIso();
  const pointer: PreviewPointer = {
    dataset: dataset.slug,
    dataVersion: version,
    schemaVersion,
    stagedAt,
    nonProduction: true,
  };
  await writePreviewPointer(env.BUCKET, dataset.slug, pointer);

  await env.DB.batch([
    env.DB.prepare(
      "UPDATE dataset SET current_preview_version = ?, updated_at = ? WHERE id = ?",
    ).bind(version, stagedAt, datasetId),
    auditStatement(env.DB, {
      actor,
      action: "data.stage",
      target: `${dataset.slug}@${version}`,
    }),
  ]);

  return { version, pointer };
}
