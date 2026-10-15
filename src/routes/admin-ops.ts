import { Hono } from "hono";
import type { AppEnv } from "../env";
import { readJsonBody } from "../lib/body";
import { currentActor } from "../middleware/access";
import { planRetention, runRetention } from "../ops/retention";

interface AuditRow {
  actor: string | null;
  action: string;
  target: string | null;
  detail: string | null;
  created_at: string;
}

function parseDetail(detail: string | null): unknown {
  if (detail === null) return null;
  try {
    return JSON.parse(detail) as unknown;
  } catch {
    return detail;
  }
}

/**
 * 后台运营子路由。无独立 accessGuard：由 adminApi barrel 统一施加鉴权。
 */
export const opsAdminRoutes = new Hono<AppEnv>();

opsAdminRoutes.get("/ops", async (c) => {
  const retention = await planRetention(c.env);
  const audit = await c.env.DB.prepare(
    "SELECT actor, action, target, detail, created_at FROM audit_log ORDER BY created_at DESC LIMIT 5",
  ).all<AuditRow>();

  return c.json({
    environment: c.env.ENVIRONMENT ?? "development",
    quotaThreshold: c.env.QUOTA_ALERT_THRESHOLD ?? "80000",
    retention,
    latestAudit: (audit.results ?? []).map((row) => ({
      actor: row.actor,
      action: row.action,
      target: row.target,
      detail: parseDetail(row.detail),
      createdAt: row.created_at,
    })),
  });
});

opsAdminRoutes.post("/ops/retention/run", async (c) => {
  const body = await readJsonBody(c);
  const result = await runRetention(c.env, currentActor(c), body.confirm === true);
  return c.json(result, 200);
});
