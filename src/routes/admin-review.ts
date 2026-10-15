import { Hono } from "hono";
import type { AppEnv } from "../env";
import { asString, readJsonBody } from "../lib/body";
import { currentActor } from "../middleware/access";
import { promoteSubmission, rejectSubmission, stageSubmission } from "../review/actions";
import { buildReviewViews } from "../review/views";
import { listSubmissions } from "../submissions/repository";

const DEFAULT_STATUSES = ["pending", "staged"];

/**
 * 后台审阅子路由。无独立 accessGuard：由 adminApi barrel 统一施加鉴权。
 */
export const reviewAdminRoutes = new Hono<AppEnv>();

reviewAdminRoutes.get("/submissions", async (c) => {
  const raw = c.req.query("status");
  const statuses = raw
    ? raw
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s !== "")
    : DEFAULT_STATUSES;

  const rows = await listSubmissions(c.env, statuses);
  return c.json({
    submissions: rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      datasetId: row.dataset_id,
      status: row.status,
      schemaVersion: row.schema_version,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      hasEmail: row.contact_email !== null && row.contact_email.trim() !== "",
    })),
  });
});

reviewAdminRoutes.get("/submissions/:id", async (c) => {
  const views = await buildReviewViews(c.env, c.req.param("id"));
  return c.json(views);
});

reviewAdminRoutes.post("/submissions/:id/stage", async (c) => {
  const result = await stageSubmission(c.env, c.req.param("id"), currentActor(c));
  return c.json(result, 200);
});

reviewAdminRoutes.post("/submissions/:id/promote", async (c) => {
  const result = await promoteSubmission(c.env, c.req.param("id"), currentActor(c));
  return c.json(result, 200);
});

reviewAdminRoutes.post("/submissions/:id/reject", async (c) => {
  const body = await readJsonBody(c);
  const reason = asString(body.reason) ?? null;
  const result = await rejectSubmission(c.env, c.req.param("id"), currentActor(c), reason);
  return c.json(result, 200);
});
