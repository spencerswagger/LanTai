import type { Context } from "hono";
import { Hono } from "hono";
import type { AppEnv, Env } from "./env";
import { AppError } from "./lib/errors";
import { errorBody } from "./lib/response";
import { accessGuard } from "./middleware/access";
import { r2KeyForPublicPath } from "./r2/keys";
import { adminApi } from "./routes/admin";
import { healthApi } from "./routes/health";
import { submissionsApi } from "./routes/submissions";

const app = new Hono<AppEnv>();

app.onError((err, c) => {
  if (err instanceof AppError) {
    return c.json(errorBody(err.code, err.message, err.details), err.status as never);
  }
  console.error("unhandled_error", err);
  return c.json(errorBody("internal_error", "服务内部错误"), 500);
});

app.route("/api", healthApi);
app.route("/api/admin", adminApi);
app.route("/api", submissionsApi);

function servePage(path: string) {
  return (c: Context<AppEnv>) =>
    c.env.ASSETS.fetch(
      new Request(new URL(path, c.req.url).toString(), {
        method: "GET",
        headers: c.req.raw.headers,
      }),
    );
}

app.get("/admin", accessGuard, servePage("/admin.html"));
app.get("/submit", servePage("/submit.html"));

/**
 * 开发态静态读取直通：仅当 ALLOW_DEV_STATIC=true 时启用，把平台数据路径映射到 R2 对象，
 * 便于本地无自定义域时演示。生产环境读取走 R2 自定义域，不经 Worker。
 */
app.get("*", async (c, next) => {
  if (c.env.ALLOW_DEV_STATIC === "true") {
    const key = r2KeyForPublicPath(new URL(c.req.url).pathname);
    if (key) return serveR2Object(c.env.BUCKET, key);
  }
  return next();
});

app.all("/api/*", (c) => c.json(errorBody("not_found", "接口不存在"), 404));
app.all("*", (c) => c.env.ASSETS.fetch(c.req.raw));

async function serveR2Object(bucket: R2Bucket, key: string): Promise<Response> {
  const object = await bucket.get(key);
  if (!object) {
    return Response.json(errorBody("not_found", `未找到静态对象：${key}`), { status: 404 });
  }
  const headers = new Headers();
  headers.set(
    "content-type",
    object.httpMetadata?.contentType ?? "application/json; charset=utf-8",
  );
  headers.set("cache-control", object.httpMetadata?.cacheControl ?? "public, max-age=60");
  if (object.httpEtag) headers.set("etag", object.httpEtag);
  headers.set("x-lantai-served-by", "worker-dev-static");
  return new Response(object.body, { headers });
}

export { app };

export default {
  fetch: app.fetch,
} satisfies ExportedHandler<Env>;
