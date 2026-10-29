import type { Context } from "hono";
import { Hono } from "hono";
import type { AppEnv, Env } from "./env";
import { AppError } from "./lib/errors";
import { errorBody } from "./lib/response";
import { accessGuard } from "./middleware/access";
import { handleScheduled } from "./ops/cron";
import { PROTECTED_PAGES, PROTECTED_ROUTES } from "./protected-pages";
import {
  cacheControlForKey,
  isJsonGuardPath,
  latestPointerKey,
  PLATFORM_INDEX_KEY,
  readEgressKeyForPath,
  SEARCH_INDEX_KEY,
} from "./r2/keys";
import { adminApi } from "./routes/admin";
import { healthApi } from "./routes/health";
import { submissionsApi } from "./routes/submissions";

const app = new Hono<AppEnv>();

app.onError((err, c) => {
  /* 契约 §1.3 / E19 + **E32**：错误响应一律 no-store（故障不得被 CDN 缓存）。
     跳转 302 不是错误 —— 它按指针类语义缓存，见下方 `POINTER_CACHE_CONTROL`。 */
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

/*
 * 受保护页：集合在 `src/protected-pages.ts` **只声明一处**，
 * 守卫挂载点 / canonical 目标 / 部署白名单三处同源（契约 §1.2 不变式）。
 *
 *  `/<route>`        —— 守卫挂载点：Worker 不直出，鉴权由边缘 Access 承担，accessGuard 为纵深防御；
 *  `/<route>.html`   —— 只做 307 canonical 到 `/<route>`，**永不** servePage（E23 P0 根因：
 *                       test 环境 `SKIP_ACCESS_DEV=true` 时 accessGuard 直通，若这里直出页面，
 *                       匿名就能拿到后台 HTML 本体，而 Access 的路径范围只覆盖无扩展名路由）。
 * 与其它页面的资产层行为同形：`/submit.html`→`/submit`、`/index.html`→`/`。
 */
for (const route of PROTECTED_ROUTES) {
  app.get(`/${route}`, accessGuard, servePage(`/${PROTECTED_PAGES[route]}`));
}
for (const route of PROTECTED_ROUTES) {
  app.get(`/${PROTECTED_PAGES[route]}`, (c) => c.redirect(`/${route}`, 307));
}
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
        datasets?: { slug?: string }[];
      }>();
      /*
       * Sitemap 口径（Vera 裁定）：loc 的 slug 集合必须与 `/index.json` 同源一致，
       * 且**只收人类可读入口**——数据集详情页与清单文件。
       * 不收：受保护页（/admin·/review·/ops）、接口（/api/*）、以及任何快照深链
       * （`/{slug}/versions/{v}.json`：快照是给程序取数的不可变产物，不是抓取入口）。
       */
      for (const d of index?.datasets ?? []) {
        if (!d?.slug) continue;
        urls.push(`${origin}/dataset?slug=${encodeURIComponent(d.slug)}`);
        urls.push(`${origin}/${d.slug}/manifest.json`);
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
 *  - **错误响应（4xx / 5xx）一律 `no-store`**，且 404 永不含 `immutable`（E16 / E19）；
 *  - **E32（跳转响应的缓存语义）**：`/{slug}/latest.json` 命中白名单时的 **302 不是错误**，
 *    它按「指针类」缓存 —— 固定 `public, max-age=60, must-revalidate`，**绝不** `immutable`、
 *    也**不**加 `no-store`；错误面（4xx / 5xx）仍走上一行的 `no-store`，两者不互相覆盖。
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
    const redirect = await maybeRedirectLatest(c.env, key, method);
    if (redirect) return redirect;
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

/**
 * 指针类响应的缓存语义（**E32**）：60 秒 + `must-revalidate`。
 * 302 是「跳转」不是「错误」，所以既不 `immutable`（否则「最新」会滞后）也不 `no-store`
 * （否则每跳一次都要回源，指针失去缓存价值）；错误面（4xx / 5xx）仍一律 `no-store`。
 */
const POINTER_CACHE_CONTROL = "public, max-age=60, must-revalidate";

/**
 * `/{slug}/latest.json` → **302** 到包本体 `/{slug}/versions/{n}.json`。
 *
 * 为什么需要：latest.json 是「指针文档」而不是包；消费方若按 200 解析就会拿到
 * 一个没有 provider 的清单（静默空包，随后把已有协议全部标 STALE）。302 让「稳定 URL」
 * 与「包本体」两件事同时成立，且新版本发布后 Location 自动跟随指针里的 dataVersion。
 *
 * 作用域：只对 `LATEST_REDIRECT_SLUGS` 白名单内的 slug 生效（默认空 = 平台行为不变，
 * 因为 `public/dataset.html` 等页面仍按指针语义解析其他数据集的 latest.json）。
 * 缓存头见 `POINTER_CACHE_CONTROL`（E32）：**绝不能 immutable**，否则「最新」会滞后。
 *
 * 失败面（Owl 必改项 1，E32 第 4 条）—— 三种情形分开处理，都不许把「读取不可用」升级成无码 500：
 *  - **存储不可用**（`bucket.get` 抛错）→ 返回 null 交回 `serveR2Read`，由它给既有语义的
 *    `read_unavailable` 500 + `no-store`（老行为，不是这里新造的 500）；
 *  - **指针不存在** → 返回 null 交回 `serveR2Read` → 404 JSON + `no-store`；
 *  - **指针对象存在但损坏**（非 JSON / 缺 `dataVersion`）→ 直接 404 JSON + `no-store`：
 *    既不跳 `versions/undefined.json`，也不把损坏内容当 200 直出给消费方。
 */
async function maybeRedirectLatest(
  env: Env,
  key: string,
  method: string,
): Promise<Response | null> {
  if (!key.endsWith("/latest.json")) return null;
  const slug = key.slice(0, -"/latest.json".length);
  const allow = (env.LATEST_REDIRECT_SLUGS ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item !== "");
  if (!allow.includes(slug)) return null;

  let object: R2ObjectBody | null;
  try {
    object = await env.BUCKET.get(latestPointerKey(slug));
  } catch (error) {
    /* 存储故障：退回直出路径，由 serveR2Read 统一给 read_unavailable（E19 口径不变）。 */
    console.error("latest_redirect_pointer_unreadable", slug, error);
    return null;
  }
  if (!object) return null;

  let pointer: { dataVersion?: unknown } | null = null;
  try {
    pointer = JSON.parse(await object.text()) as { dataVersion?: unknown };
  } catch (error) {
    console.error("latest_redirect_pointer_malformed", slug, error);
    pointer = null;
  }
  const dataVersion = typeof pointer?.dataVersion === "string" ? pointer.dataVersion.trim() : "";
  if (dataVersion === "") {
    console.error("latest_redirect_pointer_malformed", slug, pointer?.dataVersion);
    return readEgressResponse(errorBody("not_found", NOT_FOUND_MESSAGE), 404, "no-store");
  }

  return new Response(method === "HEAD" ? null : "该地址是指针，已 302 跳转到最新包本体。\n", {
    status: 302,
    headers: {
      location: `/${slug}/versions/${dataVersion}.json`,
      "cache-control": POINTER_CACHE_CONTROL,
      "content-type": "text/plain; charset=utf-8",
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
