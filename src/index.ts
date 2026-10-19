import type { Context } from "hono";
import { Hono } from "hono";
import type { AppEnv, Env } from "./env";
import { AppError } from "./lib/errors";
import { errorBody } from "./lib/response";
import { accessGuard } from "./middleware/access";
import { handleScheduled } from "./ops/cron";
import {
  cacheControlForKey,
  isJsonGuardPath,
  PLATFORM_INDEX_KEY,
  readEgressKeyForPath,
  SEARCH_INDEX_KEY,
} from "./r2/keys";
import { adminApi } from "./routes/admin";
import { healthApi } from "./routes/health";
import { submissionsApi } from "./routes/submissions";

const app = new Hono<AppEnv>();

app.onError((err, c) => {
  /* 契约 §1.3 / E19：一切非 2xx 一律 no-store，故障不得被 CDN 缓存。 */
  if (err instanceof AppError) {
    return c.json(errorBody(err.code, err.message, err.details), err.status as never, {
      "cache-control": "no-store",
    });
  }
  console.error("unhandled_error", err);
  return c.json(errorBody("internal_error", "服务内部错误"), 500, {
    "cache-control": "no-store",
  });
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
app.get("/review", accessGuard, servePage("/review.html"));
app.get("/ops", accessGuard, servePage("/ops.html"));
/*
 * `.html` 直连形态也要过 accessGuard（验收 E23 判据：无凭据 GET /admin.html 必须 302 到 Access 登录）。
 * 不加这几条时，`/admin.html` 会被 assets 的 html_handling 307 到无守卫的 `/admin`——
 * 匿名最终仍拿不到后台 HTML（护栏未破），但那一跳**不经过** accessGuard，
 * 与 `run_worker_first` 白名单里列 `/admin.html`/`/review.html`/`/ops.html` 的意图（ADR 0001）不符。
 */
app.get("/admin.html", accessGuard, servePage("/admin.html"));
app.get("/review.html", accessGuard, servePage("/review.html"));
app.get("/ops.html", accessGuard, servePage("/ops.html"));
app.get("/submit", servePage("/submit.html"));

/**
 * 站点地图：数据目录本身在 R2（index.json），故在请求时合成，
 * 保证列出全部已发布数据集，不随静态文件过期。
 */
app.get("/sitemap.xml", async (c) => {
  const origin = new URL(c.req.url).origin;
  const urls: string[] = [`${origin}/`, `${origin}/search`, `${origin}/docs/`];
  try {
    const object = await c.env.BUCKET.get(PLATFORM_INDEX_KEY);
    if (object) {
      const index = await object.json<{
        datasets?: { slug?: string; currentDataVersion?: string }[];
      }>();
      for (const d of index?.datasets ?? []) {
        if (!d?.slug) continue;
        urls.push(`${origin}/dataset?slug=${encodeURIComponent(d.slug)}`);
        urls.push(`${origin}/${d.slug}/manifest.json`);
        if (d.currentDataVersion) {
          urls.push(
            `${origin}/${d.slug}/versions/${encodeURIComponent(d.currentDataVersion)}.json`,
          );
        }
      }
    }
  } catch {
    /* 目录暂不可用时仍返回基础站点地图，不阻塞抓取。 */
  }
  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map((u) => `  <url><loc>${escapeXml(u)}</loc></url>`).join("\n") +
    "\n</urlset>\n";
  return new Response(xml, {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=300",
    },
  });
});

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * 公开读取出口（契约 docs/contracts/public-read-egress.md，E1–E31）：
 * 8 类读取路径由**同源 Worker 从 R2 直出**，排在资产兜底之前。
 *
 * 实现纪律（供 Hawk 断言）：
 *  - 不查 D1、不做 payload 计算、不做鉴权；slug/版本合法性不反查，对象不存在即 404（E14）；
 *  - 仅 GET / HEAD（HEAD 用 `bucket.head`，不开体流），**命中读取家族**的其余方法
 *    405 `method_not_allowed` + `allow: GET, HEAD`（E31 第 1、2 项）；
 *  - `cache-control` 逐字节复制 R2 对象 `httpMetadata`，仅缺失时用 `cacheControlForKey` 兜底（E16）；
 *  - 不引入自持缓存（不用 Cache API / KV 缓存读取响应），否则 E17「发布后立即可见」不成立（E18）；
 *  - v1 不做条件请求（不做 304、忽略 query、不协商 Accept），保证 E12 / E18 的字节稳定性；
 *  - 响应头白名单 = content-type / cache-control / etag，禁止任何 `x-lantai-*`（E29）；
 *  - **一切非 2xx 一律 `no-store`**，且 404 永不含 `immutable`（E16 / E19）。
 */
app.all("*", async (c, next) => {
  const pathname = new URL(c.req.url).pathname;
  const key = readEgressKeyForPath(pathname);
  const method = c.req.method.toUpperCase();
  const isReadMethod = method === "GET" || method === "HEAD";

  if (key) {
    if (!isReadMethod) {
      return readEgressResponse(
        errorBody("method_not_allowed", "公开读取出口只支持 GET / HEAD"),
        405,
        "no-store",
        { allow: "GET, HEAD" },
      );
    }
    return serveR2Read(c.env.BUCKET, key, method);
  }

  /* `.json` 守卫（契约 §1.1 定稿 / 验收 E21(a)(b)、E26）：未命中家族但
     **以 `.json` 结尾**、**或**「去掉唯一尾斜杠后以 `.json` 结尾」的请求，一律 JSON 404 + no-store，
     **永不**回退成资产层的 HTML / 空 body。尾斜杠形态**不是**别名（E21(a)：`/acc-b/manifest.json/`
     即使对象存在也必须 404）。 */
  if (isJsonGuardPath(pathname)) {
    return readEgressResponse(errorBody("not_found", NOT_FOUND_MESSAGE), 404, "no-store");
  }

  /* 契约 §1.3 405 行注 + 验收 E31 第 5 项：**未命中读取家族**的非 GET / HEAD 一律 **404**（不是 405），
     也必须是 JSON + `no-store` —— 405 只留给「命中读取家族但方法不对」的情形。
     不显式兜住时，Hono 会对已注册的页面路由（`/admin` 等）按「方法不匹配」回 405 且 body 非 JSON。
     `/api/*` 不在此列：接口路由在更早注册处已终结响应，未命中的 API 路径仍由下方
     `app.all("/api/*")` 回 404「接口不存在」（口径不变，避免动写侧）。 */
  if (!isReadMethod && !pathname.startsWith("/api/")) {
    return readEgressResponse(errorBody("not_found", NOT_FOUND_MESSAGE), 404, "no-store");
  }

  return next();
});

app.all("/api/*", (c) => c.json(errorBody("not_found", "接口不存在"), 404));
app.all("*", (c) => c.env.ASSETS.fetch(c.req.raw));

/** 读取出口的 content-type 恒定值（契约把该值写死在响应头白名单里）。 */
const JSON_CONTENT_TYPE = "application/json; charset=utf-8";

/**
 * 读取出口 404 的**固定短文本**（契约 §1.3 / 验收 E26，Ada 已定全环境不放宽）：
 * 不含 R2 键串、不含请求路径片段、不含绑定名（BUCKET/R2）、不含绝对路径与堆栈，
 * 也不留旧 dev 直通文案「未找到静态对象」。排障信息只进 Worker 日志（console.error 可带完整 key）。
 */
const NOT_FOUND_MESSAGE = "该地址没有可公开读取的对象";

/** 空目录 / 空搜索索引的合成结果：空 ≠ 坏（E1 / E5），永不 404。 */
const SYNTHETIC_EMPTY_INDEX = { generatedAt: "", datasets: [] };

/** 读取出口的 500 错误码（契约 §1.3）：1/2 用各自的不可用码，其余一律 `read_unavailable`。 */
function readFailureCode(key: string): string {
  if (key === PLATFORM_INDEX_KEY) return "index_unavailable";
  if (key === SEARCH_INDEX_KEY) return "search_index_unavailable";
  return "read_unavailable";
}

function readEgressResponse(
  body: unknown,
  status: number,
  cacheControl: string,
  extraHeaders: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": JSON_CONTENT_TYPE,
      "cache-control": cacheControl,
      ...extraHeaders,
    },
  });
}

async function serveR2Read(bucket: R2Bucket, key: string, method: string): Promise<Response> {
  const isIndex = key === PLATFORM_INDEX_KEY;
  const isSearchIndex = key === SEARCH_INDEX_KEY;
  /* HEAD 只取元数据：用 head() 而不是 get()，避免开出一个不会被消费的 R2 体流
     （悬挂句柄在本地/边缘都是实打实的资源泄漏，Hono 的 HEAD 包装不会替你关闭它）。 */
  const bodyless = method === "HEAD";

  let object: R2Object | null;
  try {
    object = bodyless ? await bucket.head(key) : await bucket.get(key);
  } catch (error) {
    /* R2 抛错 = 真的坏了：500 JSON，绝不降级成 404，也不合成空索引（E19）。 */
    console.error("read_egress_r2_error", key, error);
    return readEgressResponse(
      errorBody(readFailureCode(key), "读取静态发布物失败，请稍后重试"),
      500,
      "no-store",
    );
  }

  try {
    if (!object) {
      if (isIndex || isSearchIndex) {
        /* 对象缺失 → 200 合成空索引（空 ≠ 坏）。 */
        return readEgressResponse(SYNTHETIC_EMPTY_INDEX, 200, cacheControlForKey(key));
      }
      /* 版本 / 清单 / 指针 / Schema 不存在 → 404 JSON，且 404 一律 no-store（永不含 immutable）。 */
      return readEgressResponse(errorBody("not_found", NOT_FOUND_MESSAGE), 404, "no-store");
    }

    const headers = new Headers();
    headers.set("content-type", JSON_CONTENT_TYPE);
    headers.set("cache-control", object.httpMetadata?.cacheControl ?? cacheControlForKey(key));
    if (object.httpEtag) headers.set("etag", object.httpEtag);
    if (bodyless) return new Response(null, { headers });
    return new Response((object as R2ObjectBody).body, { headers });
  } catch (error) {
    /* 兜底（契约 §1.3 `internal_error`）：读取出口未捕获异常也必须是 JSON + no-store。 */
    console.error("read_egress_internal_error", key, error);
    return readEgressResponse(errorBody("internal_error", "服务内部错误"), 500, "no-store");
  }
}

export { app };

export default {
  fetch: app.fetch,
  scheduled: handleScheduled,
} satisfies ExportedHandler<Env>;
