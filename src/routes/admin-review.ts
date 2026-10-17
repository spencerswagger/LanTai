import { Hono } from "hono";
import type { AppEnv } from "../env";
import { asString, readJsonBody } from "../lib/body";
import { currentActor } from "../middleware/access";
import { promoteSubmission, rejectSubmission, stageSubmission } from "../review/actions";
import {
  buildReviewRender,
  buildReviewSummary,
  buildReviewViews,
  loadReviewPayload,
} from "../review/views";
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

/** 轻量摘要（大 payload 首屏用）：无完整 render/jsonTree/current，diff 截断。 */
reviewAdminRoutes.get("/submissions/:id/summary", async (c) => {
  const summary = await buildReviewSummary(c.env, c.req.param("id"));
  return c.json(summary);
});

/** 按需加载候选 payload（原始 JSON），供前端懒加载树视图。 */
reviewAdminRoutes.get("/submissions/:id/payload", async (c) => {
  const payload = await loadReviewPayload(c.env, c.req.param("id"));
  return c.json({ payload });
});

/** 按需构建结构化只读渲染描述。 */
reviewAdminRoutes.get("/submissions/:id/render", async (c) => {
  const render = await buildReviewRender(c.env, c.req.param("id"));
  return c.json({ render });
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
