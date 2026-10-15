import type { Env } from "../env";
import { nowIso } from "../lib/ids";

export interface SubmissionRow {
  id: string;
  dataset_id: string;
  slug: string;
  schema_version: string;
  status: string;
  token: string;
  payload: string;
  contact_email: string | null;
  source_ip_hash: string | null;
  staged_version: string | null;
  created_at: string;
  updated_at: string;
}

export interface InsertSubmissionInput {
  id: string;
  datasetId: string;
  slug: string;
  schemaVersion: string;
  status: string;
  token: string;
  payload: unknown;
  contactEmail?: string | null;
  sourceIpHash?: string | null;
  stagedVersion?: string | null;
}

/**
 * 构造一条提交写入语句。返回 PreparedStatement，便于与审计写入合并进同一批事务。
 */
export function insertSubmission(env: Env, input: InsertSubmissionInput): D1PreparedStatement {
  const now = nowIso();
  return env.DB.prepare(
    "INSERT INTO submission (id, dataset_id, slug, schema_version, status, token, payload, contact_email, source_ip_hash, staged_version, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
  ).bind(
    input.id,
    input.datasetId,
    input.slug,
    input.schemaVersion,
    input.status,
    input.token,
    JSON.stringify(input.payload),
    input.contactEmail ?? null,
    input.sourceIpHash ?? null,
    input.stagedVersion ?? null,
    now,
    now,
  );
}

export async function getSubmissionByToken(env: Env, token: string): Promise<SubmissionRow | null> {
  return env.DB.prepare("SELECT * FROM submission WHERE token = ?")
    .bind(token)
    .first<SubmissionRow>();
}

export async function updateSubmissionStatus(
  env: Env,
  id: string,
  status: string,
  stagedVersion?: string | null,
): Promise<void> {
  if (stagedVersion === undefined) {
    await env.DB.prepare("UPDATE submission SET status = ?, updated_at = ? WHERE id = ?")
      .bind(status, nowIso(), id)
      .run();
    return;
  }
  await env.DB.prepare(
    "UPDATE submission SET status = ?, staged_version = ?, updated_at = ? WHERE id = ?",
  )
    .bind(status, stagedVersion, nowIso(), id)
    .run();
}
