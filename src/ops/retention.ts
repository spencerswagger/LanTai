import { listDatasets } from "../datasets/repository";
import type { Env } from "../env";
import { recordAudit } from "../lib/audit";
import { nowIso } from "../lib/ids";
import { readPreviewPointer } from "../publish/pointer";
import { dataSnapshotKey } from "../r2/keys";

export const RETENTION_WINDOW_DAYS = 7;

export interface RetentionPlan {
  previewSnapshots: string[];
  rejectedSubmissions: string[];
}

export interface RetentionRunResult {
  confirmed: boolean;
  plan: RetentionPlan;
  deletedPreviews: number;
  clearedSubmissions: number;
}

function retentionCutoff(days = RETENTION_WINDOW_DAYS): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

/**
 * 列出某 slug 下未被当前 preview 指针引用的预览快照键（`{slug}/versions/preview-*`）。
 */
async function listOrphanPreviewSnapshots(
  env: Env,
  slug: string,
  currentPreview: string | null,
): Promise<string[]> {
  const listed = await env.BUCKET.list({ prefix: `${slug}/versions/preview-` });
  const keys: string[] = [];
  for (const object of listed.objects) {
    if (!object.key.endsWith(".json")) continue;
    if (currentPreview && object.key === dataSnapshotKey(slug, currentPreview)) continue;
    keys.push(object.key);
  }
  return keys.sort();
}

/**
 * 干跑清单：未被引用且可安全清理的预览快照键，以及超过保留窗口的已驳回提交 id。
 * 绝不包含 status='published' 的快照、latest.json 或 schema_version。
 */
export async function planRetention(env: Env): Promise<RetentionPlan> {
  const datasets = await listDatasets(env);
  const previewSnapshots: string[] = [];
  for (const dataset of datasets) {
    const pointer = await readPreviewPointer(env.BUCKET, dataset.slug);
    const current = pointer?.dataVersion ?? null;
    previewSnapshots.push(...(await listOrphanPreviewSnapshots(env, dataset.slug, current)));
  }

  const rejected = await env.DB.prepare(
    "SELECT id FROM submission WHERE status = 'rejected' AND created_at < ? ORDER BY created_at ASC",
  )
    .bind(retentionCutoff())
    .all<{ id: string }>();

  return {
    previewSnapshots: previewSnapshots.sort(),
    rejectedSubmissions: (rejected.results ?? []).map((row) => row.id),
  };
}

/**
 * 执行保留清理。confirmed !== true 时只返回干跑清单，不做任何删除。
 * 确认执行：删除未被引用的预览快照对象，并把被拒提交 payload 置空（保留行与审计）。
 */
export async function runRetention(
  env: Env,
  actor: string | null,
  confirmed: boolean,
): Promise<RetentionRunResult> {
  const plan = await planRetention(env);
  if (confirmed !== true) {
    return { confirmed: false, plan, deletedPreviews: 0, clearedSubmissions: 0 };
  }

  if (plan.previewSnapshots.length > 0) {
    await env.BUCKET.delete(plan.previewSnapshots);
  }

  for (const id of plan.rejectedSubmissions) {
    await env.DB.prepare(
      "UPDATE submission SET payload = ?, updated_at = ? WHERE id = ? AND status = 'rejected'",
    )
      .bind("", nowIso(), id)
      .run();
  }

  await recordAudit(env.DB, {
    actor,
    action: "ops.retention.run",
    target: null,
    detail: {
      deletedPreviews: plan.previewSnapshots.length,
      clearedSubmissions: plan.rejectedSubmissions.length,
    },
  });

  return {
    confirmed: true,
    plan,
    deletedPreviews: plan.previewSnapshots.length,
    clearedSubmissions: plan.rejectedSubmissions.length,
  };
}
