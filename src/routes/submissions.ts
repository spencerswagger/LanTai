import { Hono } from "hono";
import type { AppEnv } from "../env";
import { asString, readJsonBody } from "../lib/body";
import { BadRequestError } from "../lib/errors";
import { submitChange, trackSubmission } from "../submissions/submit";

/**
 * 公开写入口（匿名贡献）。不含 accessGuard：任何匿名者均可提交，
 * 门槛由 Turnstile 与限流提供。
 */
export const submissionsApi = new Hono<AppEnv>();

submissionsApi.post("/submissions", async (c) => {
  const body = await readJsonBody(c);
  const slug = asString(body.slug);
  if (!slug) throw new BadRequestError("invalid_slug", "slug 不能为空");

  const result = await submitChange(c.env, {
    slug,
    payload: body.payload,
    email: asString(body.email),
    turnstileToken: asString(body.turnstileToken),
    ip: c.req.header("CF-Connecting-IP") ?? undefined,
  });
  return c.json(result, 201);
});

submissionsApi.get("/submissions/:token", async (c) => {
  const status = await trackSubmission(c.env, c.req.param("token"));
  return c.json(status);
});
