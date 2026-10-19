import type { Env } from "../env";

export interface DataVersionRow {
  id: string;
  dataset_id: string;
  version: string;
  r2_key: string;
  content_hash: string;
  source_submission_id: string | null;
  status: string;
  published_at: string;
}

/**
 * 计算下一个数据版本号：取该数据集已发布（status='published'）的最大纯数字版本号 +1，
 * 无则为 1。非数字版本（如 preview-*）不参与编号。
 */
export async function nextDataVersionNumber(env: Env, datasetId: string): Promise<number> {
  const result = await env.DB.prepare(
    "SELECT version FROM data_version WHERE dataset_id = ? AND status = 'published'",
  )
    .bind(datasetId)
    .all<{ version: string }>();
  const rows = result.results ?? [];
  let max = 0;
  for (const row of rows) {
    if (/^\d+$/.test(row.version)) {
      const value = Number(row.version);
      if (value > max) max = value;
    }
  }
  return max + 1;
}

/** 构造数据版本 INSERT 语句，供与审计写入合并进同一批事务。 */
export function insertDataVersion(env: Env, row: DataVersionRow): D1PreparedStatement {
  return env.DB.prepare(
    "INSERT INTO data_version (id, dataset_id, version, r2_key, content_hash, source_submission_id, status, published_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
  ).bind(
    row.id,
    row.dataset_id,
    row.version,
    row.r2_key,
    row.content_hash,
    row.source_submission_id,
    row.status,
    row.published_at,
  );
}

export async function listDataVersions(env: Env, datasetId: string): Promise<DataVersionRow[]> {
  const result = await env.DB.prepare(
    "SELECT * FROM data_version WHERE dataset_id = ? ORDER BY published_at ASC",
  )
    .bind(datasetId)
    .all<DataVersionRow>();
  return result.results ?? [];
}

/** 只取正式发布版本（`status='published'`）：manifest 的 `dataVersions[]` 只用这一组（R8）。 */
export async function listPublishedDataVersions(
  env: Env,
  datasetId: string,
): Promise<DataVersionRow[]> {
  const result = await env.DB.prepare(
    "SELECT * FROM data_version WHERE dataset_id = ? AND status = 'published' ORDER BY published_at ASC",
  )
    .bind(datasetId)
    .all<DataVersionRow>();
  return result.results ?? [];
}

export async function getDataVersion(
  env: Env,
  datasetId: string,
  version: string,
): Promise<DataVersionRow | null> {
  return env.DB.prepare("SELECT * FROM data_version WHERE dataset_id = ? AND version = ?")
    .bind(datasetId, version)
    .first<DataVersionRow>();
}
