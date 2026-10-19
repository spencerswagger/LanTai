import { getDatasetById } from "../datasets/repository";
import type { Env } from "../env";
import { auditStatement } from "../lib/audit";
import { ConflictError, NotFoundError } from "../lib/errors";
import { nowIso } from "../lib/ids";
import { upsertCatalogEntry } from "../r2/catalog";
import { buildManifest, type ManifestDataVersion, writeManifest } from "../r2/manifest";
import { type LatestPointer, writeLatestPointer } from "./pointer";
import { getDataVersion, listPublishedDataVersions } from "./repository";

export interface RollbackResult {
  rolledBackTo: string;
  previous: string | null;
}

/**
 * 回滚 latest 指针到指定已发布版本：重写 latest 指针 → 更新 dataset 指针 →
 * 重建 manifest（isLatest 指向目标）→ 更新目录索引 → 记审计。历史快照一律保留。
 */
export async function rollbackDataset(
  env: Env,
  datasetId: string,
  targetVersion: string,
  actor: string | null,
): Promise<RollbackResult> {
  const dataset = await getDatasetById(env, datasetId);
  const schemaVersion = dataset.current_schema_version;
  if (!schemaVersion) {
    throw new ConflictError("schema_not_frozen", "数据集尚未冻结 Schema，无法回滚数据");
  }

  const target = await getDataVersion(env, datasetId, targetVersion);
  if (target?.status !== "published") {
    throw new NotFoundError("data_version_not_found", `数据版本不存在：${targetVersion}`);
  }

  const previous = dataset.current_data_version ?? null;
  const rolledAt = nowIso();
  const pointer: LatestPointer = {
    dataset: dataset.slug,
    dataVersion: targetVersion,
    schemaVersion,
    publishedAt: target.published_at,
    contentHash: target.content_hash,
  };
  await writeLatestPointer(env.BUCKET, dataset.slug, pointer);

  await env.DB.batch([
    env.DB.prepare("UPDATE dataset SET current_data_version = ?, updated_at = ? WHERE id = ?").bind(
      targetVersion,
      rolledAt,
      datasetId,
    ),
    auditStatement(env.DB, {
      actor,
      action: "data.rollback",
      target: `${dataset.slug}@${targetVersion}`,
      detail: { from: previous, to: targetVersion },
    }),
  ]);

  const preview = dataset.current_preview_version ?? null;
  const versions = await listPublishedDataVersions(env, datasetId);
  const dataVersions: ManifestDataVersion[] = versions.map((row) => ({
    version: row.version,
    publishedAt: row.published_at,
    isLatest: row.version === targetVersion,
    isPreview: preview !== null && row.version === preview,
  }));
  const manifest = buildManifest({
    slug: dataset.slug,
    title: dataset.title,
    schemaVersion,
    dataVersions,
    latest: targetVersion,
    preview,
  });
  await writeManifest(env.BUCKET, manifest);

  await upsertCatalogEntry(env.BUCKET, {
    slug: dataset.slug,
    title: dataset.title,
    currentSchemaVersion: schemaVersion,
    currentDataVersion: targetVersion,
    hasData: true,
    updatedAt: rolledAt,
  });

  return { rolledBackTo: targetVersion, previous };
}
