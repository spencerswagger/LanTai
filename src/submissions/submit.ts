import { getDatasetBySlug, getSchemaVersion } from "../datasets/repository";
import type { Env } from "../env";
import { auditStatement } from "../lib/audit";
import { BadRequestError, ConflictError, NotFoundError, TooManyRequestsError } from "../lib/errors";
import { sha256Hex } from "../lib/hash";
import { newId } from "../lib/ids";
import { isWellFormedToken, newTrackingToken } from "../lib/tokens";
import { validatePayload } from "../schema/validate";
import { notifyStatus } from "./notify";
import { checkRateLimit } from "./ratelimit";
import { getSubmissionByToken, insertSubmission } from "./repository";
import { verifyTurnstile } from "./turnstile";

export interface SubmitChangeInput {
  slug: string;
  payload: unknown;
  email?: string;
  turnstileToken?: string;
  ip?: string;
  now?: number;
}

export interface SubmitChangeResult {
  submissionId: string;
  token: string;
  status: string;
}

/**
 * 匿名提交变更：数据集存在且 Schema 已冻结 → Turnstile 校验 → IP 哈希限流 →
 * 冻结 Schema 校验 payload → 落库（pending）并记审计 → 可选发信。
 * Turnstile 失败、超频、校验失败均在落库前拒绝。
 */
export async function submitChange(
  env: Env,
  input: SubmitChangeInput,
): Promise<SubmitChangeResult> {
  const dataset = await getDatasetBySlug(env, input.slug);
  if (!dataset) {
    throw new NotFoundError("dataset_not_found", `数据集不存在：${input.slug}`);
  }
  const schemaVersion = dataset.current_schema_version;
  if (!schemaVersion) {
    throw new ConflictError("schema_not_frozen", `数据集尚未冻结 Schema：${input.slug}`, {
      slug: input.slug,
    });
  }

  const turnstile = await verifyTurnstile(env, input.turnstileToken, input.ip);
  if (!turnstile.success) {
    throw new BadRequestError("turnstile_failed", "人机校验未通过", {
      mode: turnstile.mode,
      reason: turnstile.error,
    });
  }

  const ipHash = await sha256Hex(`${env.IP_HASH_SALT ?? "lantai"}:${input.ip ?? "unknown"}`);
  const limit = checkRateLimit(ipHash, input.now);
  if (!limit.allowed) {
    throw new TooManyRequestsError("rate_limited", "提交过于频繁，请稍后再试", {
      retryAfter: limit.retryAfter,
    });
  }

  const schemaRow = await getSchemaVersion(env, dataset.id, schemaVersion);
  const validation = validatePayload(JSON.parse(schemaRow.json_schema), input.payload);
  if (!validation.valid) {
    throw new BadRequestError("schema_validation_failed", "提交内容不符合数据集 Schema", {
      errors: validation.errors,
    });
  }

  const id = newId();
  const token = newTrackingToken();
  await env.DB.batch([
    insertSubmission(env, {
      id,
      datasetId: dataset.id,
      slug: dataset.slug,
      schemaVersion,
      status: "pending",
      token,
      payload: input.payload,
      contactEmail: input.email ?? null,
      sourceIpHash: ipHash,
    }),
    auditStatement(env.DB, {
      action: "submission.create",
      target: dataset.slug,
      detail: { sub: id },
    }),
  ]);

  if (input.email) {
    await notifyStatus(env, {
      email: input.email,
      datasetSlug: dataset.slug,
      status: "pending",
      token,
    });
  }

  return { submissionId: id, token, status: "pending" };
}

export interface SubmissionStatus {
  slug: string;
  status: string;
  schemaVersion: string;
  createdAt: string;
  updatedAt: string;
  stagedVersion: string | null;
  rejectReason: string | null;
}

/**
 * 凭追踪令牌查询提交状态。令牌非法或不存在均返回 404；响应绝不包含 payload。
 */
export async function trackSubmission(env: Env, token: string): Promise<SubmissionStatus> {
  if (!isWellFormedToken(token)) {
    throw new NotFoundError("submission_not_found", "提交记录不存在");
  }
  const row = await getSubmissionByToken(env, token);
  if (!row) {
    throw new NotFoundError("submission_not_found", "提交记录不存在");
  }
  return {
    slug: row.slug,
    status: row.status,
    schemaVersion: row.schema_version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    stagedVersion: row.staged_version,
    rejectReason: row.reject_reason,
  };
}
