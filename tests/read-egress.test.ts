import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import type { Env } from "../src/env";
import {
  isJsonGuardPath,
  manifestKey,
  normalizeReadPath,
  readEgressKeyForPath,
  SEARCH_INDEX_KEY,
} from "../src/r2/keys";
import { callApp, json, postJson } from "./helpers";

/**
 * 公开读取出口（契约 docs/contracts/public-read-egress.md，R1–R15）。
 * 注意：本文件**不依赖** ALLOW_DEV_STATIC——该开关已退役，读取出口在 dev/preprod/prod 语义一致。
 *
 * 纪律：每次读取都必须把响应体读完（R2 的 body 是流，不消费会残留 WAL 句柄）。
 */

const schema = {
  type: "object",
  properties: { name: { type: "string", title: "名称" }, age: { type: "number" } },
  required: ["name"],
};

const CACHE = {
  index: "public, max-age=300",
  pointer: "public, max-age=60, must-revalidate",
  immutable: "public, max-age=31536000, immutable",
};

interface ReadResult {
  res: Response;
  text: string;
  body: Record<string, unknown>;
}

/** 读取出口响应头白名单：只允许 content-type / cache-control / etag
    （以及边缘加的 cf-*；405 按契约另带 `allow: GET, HEAD`）。 */
function assertHeaderWhitelist(res: Response): void {
  for (const name of res.headers.keys()) {
    const lower = name.toLowerCase();
    expect(lower.startsWith("x-lantai")).toBe(false);
    expect([
      "content-type",
      "cache-control",
      "etag",
      "allow",
      "cf-cache-status",
      "cf-ray",
    ]).toContain(lower);
  }
}

async function read(
  path: string,
  init?: RequestInit,
  overrides: Partial<Env> = {},
): Promise<ReadResult> {
  const res = await callApp(path, init, overrides);
  const text = await res.text();
  return { res, text, body: JSON.parse(text) as Record<string, unknown> };
}

async function register(slug: string): Promise<string> {
  const res = await postJson("/api/admin/datasets", { slug, title: slug, schema });
  const { dataset } = await json<{ dataset: { id: string } }>(res);
  return dataset.id;
}

async function registerAndFreeze(slug: string): Promise<string> {
  const id = await register(slug);
  const res = await postJson(`/api/admin/datasets/${id}/freeze`, { version: "1.0.0" });
  expect(res.status).toBe(200);
  return id;
}

describe("read egress · 空库（R1/R2）", () => {
  it("合成空索引而非 404：/index.json 与 /search/index.json 恒 200", async () => {
    const index = await read("/index.json");
    expect(index.res.status).toBe(200);
    expect(index.res.headers.get("cache-control")).toBe(CACHE.index);
    expect(index.res.headers.get("content-type")).toContain("application/json");
    expect(index.body).toEqual({ generatedAt: "", datasets: [] });
    assertHeaderWhitelist(index.res);

    const search = await read("/search/index.json");
    expect(search.res.status).toBe(200);
    expect(search.res.headers.get("cache-control")).toBe(CACHE.index);
    expect(search.body).toEqual({ generatedAt: "", datasets: [] });
    assertHeaderWhitelist(search.res);
  });
});

describe("read egress · 仅冻结未发布（R3/R7/R8/R10）", () => {
  it("目录收录 hasData:false；搜索索引不含；latest 404；manifest 200", async () => {
    await registerAndFreeze("egress-frozen");

    const index = await read("/index.json");
    const entry = (index.body.datasets as Record<string, unknown>[]).find(
      (d) => d.slug === "egress-frozen",
    );
    expect(entry).toBeDefined();
    // 键集白名单（R3/R6）：不得出现任何 payload 值。
    expect(Object.keys(entry as object).sort()).toEqual([
      "currentDataVersion",
      "currentSchemaVersion",
      "hasData",
      "slug",
      "title",
      "updatedAt",
    ]);
    expect(entry?.hasData).toBe(false);
    expect(entry?.currentDataVersion).toBeNull();

    // R7：从未发布过数据 → 不在全局搜索索引。
    const search = await read("/search/index.json");
    expect(
      (search.body.datasets as { slug: string }[]).some((d) => d.slug === "egress-frozen"),
    ).toBe(false);

    // R7：/{slug}/search-index.json 该情形 404 JSON（不是 200 空对象）。
    const perSlug = await read("/egress-frozen/search-index.json");
    expect(perSlug.res.status).toBe(404);
    expect(perSlug.body).toMatchObject({ error: { code: "not_found" } });
    expect(perSlug.res.headers.get("cache-control")).toBe("no-store");

    // R8：未发布也要有 manifest；dataVersions 空、latest null、preview null、schema.url 可 200。
    const manifest = await read("/egress-frozen/manifest.json");
    expect(manifest.res.status).toBe(200);
    expect(manifest.res.headers.get("cache-control")).toBe(CACHE.index);
    expect(manifest.body).toMatchObject({
      slug: "egress-frozen",
      schema: { version: "1.0.0", url: "/schemas/egress-frozen/1.0.0.json" },
      dataVersions: [],
      latest: null,
      preview: null,
    });
    const schemaDoc = await read("/schemas/egress-frozen/1.0.0.json");
    expect(schemaDoc.res.status).toBe(200);
    expect(schemaDoc.res.headers.get("cache-control")).toBe(CACHE.immutable);

    // R10：仅冻结未发布 → latest 404 JSON，绝不 200 空对象。
    const latest = await read("/egress-frozen/latest.json");
    expect(latest.res.status).toBe(404);
    expect(latest.body).toMatchObject({ error: { code: "not_found" } });
    expect(latest.res.headers.get("cache-control")).toBe("no-store");

    // preview 同理。
    const preview = await read("/egress-frozen/preview.json");
    expect(preview.res.status).toBe(404);
    expect(preview.res.headers.get("cache-control")).toBe("no-store");
  });
});

describe("read egress · 已发布（R6/R9/R10/R12）", () => {
  it("8 条路径的缓存头、404 语义与响应头白名单", async () => {
    const id = await registerAndFreeze("egress-pub");
    await postJson(`/api/admin/datasets/${id}/publish`, { payload: { name: "alice", age: 30 } });

    const manifest = await read("/egress-pub/manifest.json");
    expect(manifest.res.headers.get("cache-control")).toBe(CACHE.index);
    expect(manifest.body.latest).toBe("1");

    const latest = await read("/egress-pub/latest.json");
    expect(latest.res.status).toBe(200);
    expect(latest.res.headers.get("cache-control")).toBe(CACHE.pointer);
    // R10：latest 的 dataVersion 必须等于 manifest.latest。
    expect(latest.body.dataVersion).toBe(manifest.body.latest);

    const snapshot = await read("/egress-pub/versions/1.json");
    expect(snapshot.res.status).toBe(200);
    expect(snapshot.res.headers.get("cache-control")).toBe(CACHE.immutable);
    expect(snapshot.body).toEqual({ name: "alice", age: 30 });
    expect(snapshot.res.headers.get("etag")).toBeTruthy();

    // R9：同一 URL 两次读取字节一致；v1 不做 304（条件请求也只返回 200 全量）。
    const again = await read("/egress-pub/versions/1.json");
    expect(again.text).toBe(snapshot.text);
    const conditional = await read("/egress-pub/versions/1.json", {
      headers: { "if-none-match": snapshot.res.headers.get("etag") ?? "*" },
    });
    expect(conditional.res.status).toBe(200);

    const perSlug = await read("/egress-pub/search-index.json");
    expect(perSlug.res.status).toBe(200);
    expect(perSlug.res.headers.get("cache-control")).toBe(CACHE.index);

    const index = await read("/index.json");
    const entry = (index.body.datasets as Record<string, unknown>[]).find(
      (d) => d.slug === "egress-pub",
    );
    expect(entry?.hasData).toBe(true);
    expect(entry?.currentDataVersion).toBe("1");

    for (const res of [manifest.res, latest.res, snapshot.res, perSlug.res, index.res]) {
      assertHeaderWhitelist(res);
    }
  });

  it("R6：目录与搜索索引都不含 payload 值（哨兵串）", async () => {
    const id = await registerAndFreeze("egress-sentinel");
    await postJson(`/api/admin/datasets/${id}/publish`, {
      payload: { name: "SENTINEL-7f3a91", age: 7 },
    });

    const index = await read("/index.json");
    const search = await read("/search/index.json");
    expect(index.text).not.toContain("SENTINEL-7f3a91");
    expect(search.text).not.toContain("SENTINEL-7f3a91");

    // R4：搜索索引 doc 键集白名单（多键即失败）。
    const doc = (search.body.datasets as Record<string, unknown>[]).find(
      (d) => d.slug === "egress-sentinel",
    );
    expect(Object.keys(doc as object).sort()).toEqual([
      "dataVersion",
      "fields",
      "schemaVersion",
      "slug",
      "title",
    ]);
    expect(doc?.fields).toEqual([
      { name: "name", title: "名称", type: "string" },
      { name: "age", title: null, type: "number" },
    ]);
  });
});

describe("read egress · 未登记 slug（R11）", () => {
  it("manifest / latest / versions / schemas 全 404 JSON，绝不回退成 HTML", async () => {
    for (const path of [
      "/nope-slug/manifest.json",
      "/nope-slug/latest.json",
      "/nope-slug/preview.json",
      "/nope-slug/versions/9.json",
      "/nope-slug/search-index.json",
      "/schemas/nope-slug/9.9.9.json",
      // 宽松匹配：形态奇怪的 slug 也必须由读取出口接管（404 JSON 而非 200 HTML）。
      "/Not_A_Slug/versions/1.json",
      // 尾斜杠归一化后仍归家族：不能在剥斜杠这一步掉到资产层。
      "/nope-slug/manifest.json/",
    ]) {
      const { res, text } = await read(path);
      expect(res.status).toBe(404);
      expect(text.startsWith("{")).toBe(true);
      expect(text.startsWith("<!doctype html")).toBe(false);
      expect(res.headers.get("cache-control")).toBe("no-store");
      expect(res.headers.get("cache-control")).not.toContain("immutable");
      assertHeaderWhitelist(res);
    }
  });
});

describe("read egress · 500 语义（R10：R2 抛错不得降级成 404）", () => {
  it("R2 抛错时目录 500 index_unavailable，其余读取路径 500 JSON", async () => {
    const broken = {
      get: async () => {
        throw new Error("r2 down");
      },
    } as unknown as R2Bucket;

    const index = await read("/index.json", undefined, { BUCKET: broken });
    expect(index.res.status).toBe(500);
    expect(index.body).toMatchObject({ error: { code: "index_unavailable" } });
    expect(index.res.headers.get("cache-control")).toBe("no-store");

    const search = await read("/search/index.json", undefined, { BUCKET: broken });
    expect(search.res.status).toBe(500);
    expect(search.body).toMatchObject({ error: { code: "search_index_unavailable" } });

    const latest = await read("/some-slug/latest.json", undefined, { BUCKET: broken });
    expect(latest.res.status).toBe(500);
    expect(latest.res.headers.get("cache-control")).toBe("no-store");
  });
});

describe("read egress · 缓存头来自 R2 元数据（R12/R13）", () => {
  it("cache-control 逐字节复制对象 httpMetadata；空库不落任何对象", async () => {
    await registerAndFreeze("egress-meta");
    // 写侧元数据是唯一来源：读取侧不得自行分层（也不得再包一层自持缓存）。
    const stored = await env.BUCKET.head(manifestKey("egress-meta"));
    expect(stored?.httpMetadata?.cacheControl).toBe(CACHE.index);

    const res = await read("/egress-meta/manifest.json");
    expect(res.res.headers.get("cache-control")).toBe(stored?.httpMetadata?.cacheControl);

    // 空库时搜索索引对象不存在：读取侧合成空索引，而不是写一个对象。
    expect(await env.BUCKET.head(SEARCH_INDEX_KEY)).toBeNull();
  });
});
describe("read egress · 发布后立即可见（R13）", () => {
  it("publish 后带 no-cache 取 latest / index / search-index 立即是新值", async () => {
    const id = await registerAndFreeze("egress-fresh");
    await postJson(`/api/admin/datasets/${id}/publish`, { payload: { name: "v1", age: 1 } });
    const first = await read("/egress-fresh/latest.json", {
      headers: { "cache-control": "no-cache" },
    });
    expect(first.body.dataVersion).toBe("1");

    await postJson(`/api/admin/datasets/${id}/publish`, { payload: { name: "v2", age: 2 } });

    // 读取出口不引入自持缓存，因此无需 purge 就能取到新值。
    const latest = await read("/egress-fresh/latest.json", {
      headers: { "cache-control": "no-cache" },
    });
    expect(latest.body.dataVersion).toBe("2");
    const index = await read("/index.json", { headers: { "cache-control": "no-cache" } });
    expect(
      (index.body.datasets as { slug: string; currentDataVersion: string | null }[]).find(
        (d) => d.slug === "egress-fresh",
      )?.currentDataVersion,
    ).toBe("2");
    const search = await read("/search/index.json", { headers: { "cache-control": "no-cache" } });
    expect(
      (search.body.datasets as { slug: string; dataVersion: string | null }[]).find(
        (d) => d.slug === "egress-fresh",
      )?.dataVersion,
    ).toBe("2");

    // immutable 路径内容永不变化：v1 仍是 v1 的字节。
    const v1 = await read("/egress-fresh/versions/1.json");
    expect(v1.body).toEqual({ name: "v1", age: 1 });
  });
});

describe("read egress · 路由匹配（R11 宽松匹配）", () => {
  it("任意 slug 形态都归读取出口；非读取路径不接管", () => {
    for (const path of [
      "/index.json",
      "/search/index.json",
      "/demo/manifest.json",
      "/demo/latest.json",
      "/demo/preview.json",
      "/demo/versions/3.json",
      "/demo/search-index.json",
      "/schemas/demo/1.0.0.json",
      "/Not_A_Slug/versions/x.y.json",
      "/zzz/search-index.json",
    ]) {
      expect(readEgressKeyForPath(path)).toBe(path.replace(/^\/+/, ""));
    }
    for (const path of [
      "/",
      "/admin",
      "/review",
      "/ops",
      "/search",
      "/dataset",
      "/docs/reader.html",
      "/styles.css",
      "/api/health",
      "/sitemap.xml",
      "/index.json/extra",
      "/a/b/manifest.json",
    ]) {
      expect(readEgressKeyForPath(path)).toBeNull();
    }
  });

  it("尾斜杠归一化：剥掉唯一尾斜杠后再判家族（契约 §1.1 第 1 步）", () => {
    expect(normalizeReadPath("/demo/manifest.json/")).toBe("demo/manifest.json");
    expect(normalizeReadPath("//index.json/")).toBe("index.json");
    expect(normalizeReadPath("/")).toBe("");
    // 只剥**一个**：双重尾斜杠「末尾恰有一个 /」不成立，故原样保留（仍含空段 → 不归家族）。
    expect(normalizeReadPath("/demo/manifest.json//")).toBe("demo/manifest.json//");

    expect(readEgressKeyForPath("/demo/manifest.json/")).toBe("demo/manifest.json");
    expect(readEgressKeyForPath("/index.json/")).toBe("index.json");
    expect(readEgressKeyForPath("/schemas/demo/1.0.0.json/")).toBe("schemas/demo/1.0.0.json");
    expect(readEgressKeyForPath("/demo/manifest.json//")).toBeNull();
  });

  it("`.json` 守卫：归一化后以 .json 结尾但不属家族（契约 §1.1 第 3 步）", () => {
    for (const path of [
      "/nope.json",
      "/nope.json/",
      "/a/b/c.json",
      "/styles.css.json",
      "/demo.json",
      "/index.json/extra.json",
    ]) {
      expect(isJsonGuardPath(path)).toBe(true);
    }
    for (const path of [
      "/",
      "/styles.css",
      "/app.js",
      "/docs/reader.html",
      "/api/health",
      "/sitemap.xml",
      "/index.json",
      "/demo/manifest.json",
      "/demo/manifest.json/",
    ]) {
      expect(isJsonGuardPath(path)).toBe(false);
    }
  });
});

describe("read egress · `.json` 守卫（R11 加强：404 恒 JSON，永不 HTML）", () => {
  it("未命中家族但以 .json 结尾 → JSON 404 + no-store", async () => {
    for (const path of [
      "/nope.json",
      // 追加项：先剥唯一尾斜杠再判守卫，否则这里会落到资产层回空体/HTML。
      "/nope.json/",
      "/assets/app.js.json",
      "/demo.json",
      // 家族形态但层级不对（assets 的 html_handling 不会有机会接管）。
      "/a/b/manifest.json",
      "/index.json/extra.json",
    ]) {
      const { res, text } = await read(path);
      expect(res.status, path).toBe(404);
      expect(text.startsWith("{"), path).toBe(true);
      expect(text.startsWith("<!doctype html"), path).toBe(false);
      expect(res.headers.get("cache-control"), path).toBe("no-store");
      expect(res.headers.get("cache-control") ?? "", path).not.toContain("immutable");
      expect(res.headers.get("content-type"), path).toContain("application/json");
      assertHeaderWhitelist(res);
      expect((JSON.parse(text) as { error?: { code?: string } }).error?.code, path).toBe(
        "not_found",
      );
    }
  });
});

describe("read egress · 方法语义（GET / HEAD，其余 405）", () => {
  it("HEAD 与 GET 同头无体；非 GET/HEAD → 405 method_not_allowed + allow", async () => {
    await registerAndFreeze("egress-method");

    const head = await callApp("/egress-method/manifest.json", { method: "HEAD" });
    expect(head.status).toBe(200);
    expect(head.headers.get("cache-control")).toBe(CACHE.index);
    expect(head.headers.get("content-type")).toContain("application/json");
    expect(await head.text()).toBe("");
    assertHeaderWhitelist(head);

    for (const path of ["/index.json", "/egress-method/manifest.json", "/nope-slug/latest.json"]) {
      for (const method of ["POST", "PUT", "DELETE", "PATCH"]) {
        const { res, body, text } = await read(path, { method });
        expect(res.status, `${method} ${path}`).toBe(405);
        expect(res.headers.get("cache-control")).toBe("no-store");
        expect(res.headers.get("allow")).toBe("GET, HEAD");
        expect(text.startsWith("{")).toBe(true);
        expect(body).toMatchObject({ error: { code: "method_not_allowed" } });
        assertHeaderWhitelist(res);
      }
    }
  });
});

describe("read egress · 500 错误码（契约 §1.3）", () => {
  it("R2 抛错：目录 / 搜索索引 / 其余路径各自用专属码，且一律 no-store", async () => {
    const broken = {
      get: async () => {
        throw new Error("r2 down");
      },
    } as unknown as R2Bucket;

    const cases: [string, string][] = [
      ["/index.json", "index_unavailable"],
      ["/search/index.json", "search_index_unavailable"],
      ["/some-slug/latest.json", "read_unavailable"],
      ["/some-slug/manifest.json", "read_unavailable"],
      ["/some-slug/versions/1.json", "read_unavailable"],
      ["/schemas/some-slug/1.0.0.json", "read_unavailable"],
    ];
    for (const [path, code] of cases) {
      const { res, body, text } = await read(path, undefined, { BUCKET: broken });
      expect(res.status, path).toBe(500);
      expect(body, path).toMatchObject({ error: { code } });
      expect(res.headers.get("cache-control"), path).toBe("no-store");
      expect(text.startsWith("{"), path).toBe(true);
      assertHeaderWhitelist(res);
    }
  });

  it("读取出口未捕获异常 → 500 internal_error + no-store（不冒到 HTML）", async () => {
    const hostile = {
      get: async () => ({
        httpMetadata: undefined,
        httpEtag: undefined,
        get body(): ReadableStream {
          throw new Error("body exploded");
        },
      }),
    } as unknown as R2Bucket;

    const { res, body, text } = await read("/index.json", undefined, { BUCKET: hostile });
    expect(res.status).toBe(500);
    expect(body).toMatchObject({ error: { code: "internal_error" } });
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(text.startsWith("{")).toBe(true);
  });
});

describe("read egress · 响应头纪律与兜底（R12/R15）", () => {
  it("content-type 恒为 application/json; charset=utf-8（不吃对象元数据里的其他值）", async () => {
    await env.BUCKET.put(manifestKey("egress-ctype"), JSON.stringify({ slug: "egress-ctype" }), {
      httpMetadata: { contentType: "text/html", cacheControl: CACHE.index },
    });
    const res = await callApp("/egress-ctype/manifest.json");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/json; charset=utf-8");
    // 对象元数据的 cache-control 仍然逐字节复制。
    expect(res.headers.get("cache-control")).toBe(CACHE.index);
    assertHeaderWhitelist(res);
    await res.text();
  });

  it("对象元数据缺 cache-control 时，按路径族兜底（index / pointer / immutable 三档）", async () => {
    await env.BUCKET.put("egress-fallback/versions/7.json", JSON.stringify({ a: 1 }));
    await env.BUCKET.put("egress-fallback/latest.json", JSON.stringify({ a: 1 }));
    await env.BUCKET.put("egress-fallback/search-index.json", JSON.stringify({ a: 1 }));

    const immutable = await callApp("/egress-fallback/versions/7.json");
    expect(immutable.headers.get("cache-control")).toBe(CACHE.immutable);
    await immutable.text();

    const pointer = await callApp("/egress-fallback/latest.json");
    expect(pointer.headers.get("cache-control")).toBe(CACHE.pointer);
    await pointer.text();

    const index = await callApp("/egress-fallback/search-index.json");
    expect(index.headers.get("cache-control")).toBe(CACHE.index);
    await index.text();
  });
});
