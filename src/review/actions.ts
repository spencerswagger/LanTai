import type { Env } from "../env";
import { auditStatement } from "../lib/audit";
import { nowIso } from "../lib/ids";
import { publishDataset, stageDataset } from "../publish/publish";
import { notifyStatus } from "../submissions/notify";
import { getSubmissionById } from "../submissions/repository";
import { assertTransition, type SubmissionStatus } from "./state-machine";

export interface StageSubmissionResult {
  status: "staged";
  previewVersion: string;
  stagingUrl: string;
}

export interface PromoteSubmissionResult {
  status: "published";
  dataVersion: string;
}

export interface RejectSubmissionResult {
  status: "rejected";
}

/**
 * 预发布：pending → staged。复用 P2 的 stageDataset 产出预览版本与 preview 指针
 * （绝不触碰 latest），随后更新 submission 并落审计、通知贡献者。
 */
export async function stageSubmission(
  env: Env,
  submissionId: string,
  actor: string | null,
): Promise<StageSubmissionResult> {
  const submission = await getSubmissionById(env, submissionId);
  assertTransition(submission.status as SubmissionStatus, "staged");

  const payload = JSON.parse(submission.payload) as unknown;
  const staged = await stageDataset(env, submission.dataset_id, payload, actor);

  const stagedAt = nowIso();
  await env.DB.batch([
    env.DB.prepare(
      "UPDATE submission SET status = 'staged', staged_version = ?, staged_at = ?, reviewed_by = ?, updated_at = ? WHERE id = ?",
    ).bind(staged.version, stagedAt, actor, stagedAt, submission.id),
    auditStatement(env.DB, {
      actor,
      action: "review.stage",
      target: submission.id,
      detail: { previewVersion: staged.version },
    }),
  ]);

  await notifyStatus(env, {
    email: submission.contact_email,
    datasetSlug: submission.slug,
    status: "staged",
    token: submission.token,
  });

  return {
    status: "staged",
    previewVersion: staged.version,
    stagingUrl: `/${submission.slug}/preview.json`,
  };
}

/**
 * 正式发布：staged → published。复用 P2 的 publishDataset：内部按冻结 Schema 校验、
 * 物化不可变快照、更新 latest 并记审计；校验失败时抛 BadRequestError 且不写快照。
 */
export async function promoteSubmission(
  env: Env,
  submissionId: string,
  actor: string | null,
): Promise<PromoteSubmissionResult> {
  const submission = await getSubmissionById(env, submissionId);
  assertTransition(submission.status as SubmissionStatus, "published");

  const payload = JSON.parse(submission.payload) as unknown;
  const published = await publishDataset(env, submission.dataset_id, payload, actor);

  const publishedAt = nowIso();
  await env.DB.batch([
    env.DB.prepare(
      "UPDATE submission SET status = 'published', published_at = ?, reviewed_by = ?, updated_at = ? WHERE id = ?",
    ).bind(publishedAt, actor, publishedAt, submission.id),
    auditStatement(env.DB, {
      actor,
      action: "review.promote",
      target: submission.id,
      detail: { dataVersion: published.version },
    }),
  ]);

  await notifyStatus(env, {
    email: submission.contact_email,
    datasetSlug: submission.slug,
    status: "published",
    token: submission.token,
  });

  return { status: "published", dataVersion: published.version };
}

/**
 * 驳回：pending / staged → rejected。published 为终态，状态机拦截。
 */
export async function rejectSubmission(
  env: Env,
  submissionId: string,
  actor: string | null,
  reason?: string | null,
): Promise<RejectSubmissionResult> {
  const submission = await getSubmissionById(env, submissionId);
  assertTransition(submission.status as SubmissionStatus, "rejected");

  const rejectedAt = nowIso();
  const normalizedReason = reason ?? null;
  await env.DB.batch([
    env.DB.prepare(
      "UPDATE submission SET status = 'rejected', reject_reason = ?, reviewed_by = ?, updated_at = ? WHERE id = ?",
    ).bind(normalizedReason, actor, rejectedAt, submission.id),
    auditStatement(env.DB, {
      actor,
      action: "review.reject",
      target: submission.id,
      detail: { reason: normalizedReason },
    }),
  ]);

  await notifyStatus(env, {
    email: submission.contact_email,
    datasetSlug: submission.slug,
    status: "rejected",
    token: submission.token,
  });

  return { status: "rejected" };
}
