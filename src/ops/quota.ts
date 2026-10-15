import type { Env } from "../env";
import { recordAudit } from "../lib/audit";
import { sendMail } from "../submissions/notify";

const DEFAULT_REQUESTS_PER_DAY = 80000;

export interface QuotaUsage {
  requestsToday: number;
  d1RowsWrittenToday?: number;
  r2Bytes?: number;
}

export interface QuotaThresholds {
  requestsPerDay: number;
}

export type QuotaLevel = "ok" | "warn" | "critical";

export interface QuotaEvaluation {
  level: QuotaLevel;
  ratio: number;
  message: string;
}

/**
 * 纯函数：按“当日请求量 / 每日阈值”分级。ratio ≥ 0.8 → warn，ratio ≥ 1.0 → critical。
 */
export function evaluateQuota(usage: QuotaUsage, thresholds: QuotaThresholds): QuotaEvaluation {
  const limit = thresholds.requestsPerDay;
  const ratio = limit > 0 ? usage.requestsToday / limit : 0;
  let level: QuotaLevel = "ok";
  if (ratio >= 1) level = "critical";
  else if (ratio >= 0.8) level = "warn";

  const percent = Math.round(ratio * 100);
  const message =
    level === "ok"
      ? `配额正常（${percent}%）`
      : level === "warn"
        ? `配额接近阈值（${percent}%）`
        : `配额已超阈值（${percent}%）`;
  return { level, ratio, message };
}

export interface QuotaCheckResult {
  evaluation: QuotaEvaluation;
  alerted: boolean;
  mailed: boolean;
}

/**
 * 以 QUOTA_ALERT_THRESHOLD（默认 80000）为每日请求阈值执行检查。非 ok 级别时写审计
 * `ops.quota.alert`；配置了 ADMIN_FALLBACK_EMAIL 时经 sendMail 发信，未配置发信时仅写审计。
 */
export async function runQuotaCheck(env: Env, usage?: QuotaUsage): Promise<QuotaCheckResult> {
  const parsed = Number(env.QUOTA_ALERT_THRESHOLD ?? `${DEFAULT_REQUESTS_PER_DAY}`);
  const requestsPerDay = Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_REQUESTS_PER_DAY;
  const evaluation = evaluateQuota(usage ?? { requestsToday: 0 }, { requestsPerDay });

  if (evaluation.level === "ok") {
    return { evaluation, alerted: false, mailed: false };
  }

  let mailed = false;
  const admin = env.ADMIN_FALLBACK_EMAIL?.trim();
  if (admin) {
    const result = await sendMail(env, {
      to: admin,
      subject: "[兰台] 免费配额告警",
      text: evaluation.message,
    });
    mailed = result.sent;
  }

  await recordAudit(env.DB, {
    actor: null,
    action: "ops.quota.alert",
    target: null,
    detail: { level: evaluation.level, ratio: evaluation.ratio, threshold: requestsPerDay },
  });

  return { evaluation, alerted: true, mailed };
}
