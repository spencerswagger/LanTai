import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import SEED_SCRIPT_SRC from "../scripts/seed-demo.mjs?raw";
import type { Env } from "../src/env";
import { sha256Hex } from "../src/lib/hash";
import { PROTECTED_PAGES, PROTECTED_ROUTES } from "../src/protected-pages";
import {
  isJsonGuardPath,
  manifestKey,
  normalizeReadPath,
  readEgressKeyForPath,
  SEARCH_INDEX_KEY,
} from "../src/r2/keys";
import WRANGLER_RAW from "../wrangler.jsonc?raw";
import { callApp, json, postJson } from "./helpers";

/**
 * 公开读取出口（契约 docs/contracts/public-read-egress.md，E1–E31）。
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

describe("read egress · 空库（E1/E5）", () => {
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

describe("read egress · 仅冻结未发布（E3/E15/E8/E10）", () => {
  it("目录收录 hasData:false；搜索索引不含；latest 404；manifest 200", async () => {
    await registerAndFreeze("egress-frozen");

    const index = await read("/index.json");
    const entry = (index.body.datasets as Record<string, unknown>[]).find(
      (d) => d.slug === "egress-frozen",
    );
    expect(entry).toBeDefined();
    // 键集白名单（E3/E25）：不得出现任何 payload 值。
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

    // E6：从未发布过数据 → 不在全局搜索索引。
    const search = await read("/search/index.json");
    expect(
      (search.body.datasets as { slug: string }[]).some((d) => d.slug === "egress-frozen"),
    ).toBe(false);

    // E15：/{slug}/search-index.json 该情形 404 JSON（不是 200 空对象）。
    const perSlug = await read("/egress-frozen/search-index.json");
    expect(perSlug.res.status).toBe(404);
    expect(perSlug.body).toMatchObject({ error: { code: "not_found" } });
    expect(perSlug.res.headers.get("cache-control")).toBe("no-store");

    // E8：未发布也要有 manifest；dataVersions 空、latest null、preview null、schema.url 可 200。
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

    // E10：仅冻结未发布 → latest 404 JSON，绝不 200 空对象。
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

describe("read egress · 已发布（E25/E12/E10/E16）", () => {
  it("8 条路径的缓存头、404 语义与响应头白名单", async () => {
    const id = await registerAndFreeze("egress-pub");
    await postJson(`/api/admin/datasets/${id}/publish`, { payload: { name: "alice", age: 30 } });

    const manifest = await read("/egress-pub/manifest.json");
    expect(manifest.res.headers.get("cache-control")).toBe(CACHE.index);
    expect(manifest.body.latest).toBe("1");

    const latest = await read("/egress-pub/latest.json");
    expect(latest.res.status).toBe(200);
    expect(latest.res.headers.get("cache-control")).toBe(CACHE.pointer);
    // E10：latest 的 dataVersion 必须等于 manifest.latest。
    expect(latest.body.dataVersion).toBe(manifest.body.latest);

    const snapshot = await read("/egress-pub/versions/1.json");
    expect(snapshot.res.status).toBe(200);
    expect(snapshot.res.headers.get("cache-control")).toBe(CACHE.immutable);
    expect(snapshot.body).toEqual({ name: "alice", age: 30 });
    expect(snapshot.res.headers.get("etag")).toBeTruthy();

    // E12 / E18：同一 URL 两次读取字节一致；v1 不做 304（条件请求也只返回 200 全量）。
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

  it("E25：目录与搜索索引都不含 payload 值（哨兵串）", async () => {
    const id = await registerAndFreeze("egress-sentinel");
    await postJson(`/api/admin/datasets/${id}/publish`, {
      payload: { name: "SENTINEL-7f3a91", age: 7 },
    });

    const index = await read("/index.json");
    const search = await read("/search/index.json");
    expect(index.text).not.toContain("SENTINEL-7f3a91");
    expect(search.text).not.toContain("SENTINEL-7f3a91");

    // E6：搜索索引 doc 键集白名单（多键即失败）。
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

describe("read egress · 未登记 slug（E14）", () => {
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
      // 尾斜杠形态（E21(a)）：归 `.json` 守卫而非家族别名，仍 404 JSON。
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

describe("read egress · 500 语义（E19：R2 抛错不得降级成 404）", () => {
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

describe("read egress · 缓存头来自 R2 元数据（E16/E17）", () => {
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
describe("read egress · 发布后立即可见（E17）", () => {
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

describe("read egress · 路由匹配（E14 宽松匹配）", () => {
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

  it("尾斜杠**不当别名**：只剥前导 `/`，尾斜杠形态落 `.json` 守卫（E21(a)）", () => {
    expect(normalizeReadPath("/demo/manifest.json/")).toBe("demo/manifest.json/");
    expect(normalizeReadPath("//index.json")).toBe("index.json");
    expect(normalizeReadPath("/./index.json")).toBe("./index.json");
    expect(normalizeReadPath("/")).toBe("");

    // 尾斜杠形态**不**归家族 → 交给守卫（即使对象存在也不得 200）。
    expect(readEgressKeyForPath("/demo/manifest.json/")).toBeNull();
    expect(readEgressKeyForPath("/index.json/")).toBeNull();
    expect(readEgressKeyForPath("/schemas/demo/1.0.0.json/")).toBeNull();
    expect(readEgressKeyForPath("/demo/manifest.json")).toBe("demo/manifest.json");

    expect(isJsonGuardPath("/nope.json/")).toBe(true);
    expect(isJsonGuardPath("/demo/manifest.json/")).toBe(true);
    expect(isJsonGuardPath("/index.json/")).toBe(true);
    // 双重尾斜杠：末尾不是 `.json`，不判守卫（由资产层 404，非 200）。
    expect(isJsonGuardPath("/nope.json//")).toBe(false);
  });

  it("超长键（> 1024 字节）不查 R2，避免 5xx（E20）", () => {
    const longSlug = "a".repeat(1024);
    expect(readEgressKeyForPath(`/${longSlug}/manifest.json`)).toBeNull();
    // 仍是 `.json` 结尾形态 → 守卫接管 → 404 JSON，不是 5xx。
    expect(isJsonGuardPath(`/${longSlug}/manifest.json`)).toBe(true);
    expect(readEgressKeyForPath("/acc-b/manifest.json")).toBe("acc-b/manifest.json");
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
      "/demo/manifest.json//",
    ]) {
      expect(isJsonGuardPath(path)).toBe(false);
    }
  });
});

describe("read egress · `.json` 守卫（E14 加强 + E21(a)：404 恒 JSON，永不 HTML）", () => {
  it("未命中家族但以 .json 结尾（含尾斜杠形态）→ JSON 404 + no-store", async () => {
    for (const path of [
      "/nope.json",
      // 追加项：去掉唯一尾斜杠后以 .json 结尾也判守卫，否则会落到资产层回空体/HTML。
      "/nope.json/",
      "/index.json/",
      "/assets/app.js.json",
      "/demo.json",
      // 家族形态但层级不对。
      "/a/b/manifest.json",
      "/index.json/extra.json",
    ]) {
      const { res, text } = await read(path);
      expect(res.status, path).toBe(404);
      expect(text.startsWith("{"), path).toBe(true);
      expect(text.startsWith("<!doctype html"), path).toBe(false);
      expect(res.headers.get("cache-control"), path).toBe("no-store");
      expect(res.headers.get("cache-control") ?? "", path).not.toContain("immutable");
      expect(res.headers.get("content-type"), path).toBe("application/json; charset=utf-8");
      assertHeaderWhitelist(res);
      expect((JSON.parse(text) as { error?: { code?: string } }).error?.code, path).toBe(
        "not_found",
      );
    }
  });

  it("E21(a)：对象**存在**时，尾斜杠形态也不得被剥成 200 别名", async () => {
    const id = await registerAndFreeze("egress-tail");
    await postJson(`/api/admin/datasets/${id}/publish`, { payload: { name: "alice" } });

    // 无尾斜杠：正常 200。
    const canonical = await read("/egress-tail/manifest.json");
    expect(canonical.res.status).toBe(200);

    for (const path of [
      "/egress-tail/manifest.json/",
      "/egress-tail/latest.json/",
      "/egress-tail/versions/1.json/",
      "/schemas/egress-tail/1.0.0.json/",
    ]) {
      const { res, text } = await read(path);
      expect(res.status, `${path} 不得 200`).toBe(404);
      expect(res.headers.get("cache-control"), path).toBe("no-store");
      expect(text.startsWith("{"), path).toBe(true);
      expect((JSON.parse(text) as { error?: { code?: string } }).error?.code, path).toBe(
        "not_found",
      );
    }
  });

  it("E20：超长 slug（R2 键 > 1024 字节）→ 404 JSON，绝不 5xx", async () => {
    const longSlug = "a".repeat(1024);
    const { res, text, body } = await read(`/${longSlug}/manifest.json`);
    expect(res.status).toBe(404);
    expect(body).toMatchObject({ error: { code: "not_found" } });
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(text).not.toContain("Error:");
  });

  it("E26：404 body 的 message 不泄露 R2 键 / 请求路径 / 绑定名 / 堆栈 / 旧文案", async () => {
    const forbidden = /未找到静态对象|BUCKET|R2|worktrees|node_modules|at Object\.|manifest\.json/;
    for (const path of [
      "/no-such-ds/manifest.json",
      "/no-such-ds/latest.json",
      "/no-such-ds/versions/1.json",
      "/schemas/no-such-ds/1.0.0.json",
      "/no-such-ds/search-index.json",
      "/nope.json",
      "/nope.json/",
      "/package.json",
    ]) {
      const { res, text, body } = await read(path);
      expect(res.status, path).toBe(404);
      expect(text, `${path} 不得泄露`).not.toMatch(forbidden);
      const message = (body as { error?: { message?: string } }).error?.message ?? "";
      expect(message, path).toBeTruthy();
      expect(message, path).not.toContain(path.replace(/^\//, ""));
      expect(message.length, path).toBeLessThan(64);
    }
    // 比对：E14 判据里的 grep 六个 token，逐个不得出现。
    const sample = await read("/no-such-ds/manifest.json");
    for (const token of [
      "未找到静态对象",
      "BUCKET",
      "/worktrees",
      "node_modules",
      "at Object.",
      "manifest.json",
    ]) {
      expect(sample.text.includes(token), token).toBe(false);
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

describe("read egress · 受保护页的 .html 直连（E23 新口径：判据是「匿名拿不到内容」，不是「必须 302」）", () => {
  it("三个后台页的 .html 形态：状态非 200、body 0 字节、不含后台页标记，canonical 到受保护的无扩展名路由", async () => {
    const cases: [string, string, string][] = [
      ["/admin.html", "/admin", "数据集与 Schema"],
      ["/review.html", "/review", "审阅台"],
      ["/ops.html", "/ops", "运营"],
    ];
    for (const [from, target, marker] of cases) {
      const res = await callApp(from);
      expect(res.status, from).not.toBe(200);
      expect(res.status, from).toBe(307);
      expect(new URL(res.headers.get("location") ?? "", "https://lantai.test").pathname, from).toBe(
        target,
      );
      const text = await res.text();
      expect(text.length, from).toBe(0);
      expect(text, from).not.toContain(marker);
      expect(text.toLowerCase(), from).not.toContain("<!doctype html");
    }
  });
  /* 对照断言（非受保护页 `/submit.html`、`/docs/*.html` 的 canonical 307）属**资产层**行为，
     进程内直调 app 不经 ASSETS，故只能在 HTTP 层验证；两类不混用判据。 */
});

describe("read egress · /sitemap.xml 同源性（Vera 裁定：slug 集合与 /index.json 同源，且不收深链）", () => {
  it("收录每个数据集的入口与清单，且不含快照深链 / 受保护页 / 接口", async () => {
    await registerAndFreeze("sitemap-a");

    const res = await callApp("/sitemap.xml");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/xml");
    const xml = await res.text();
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

    // 同源：/index.json 里的 slug 必须逐一出现在 loc 集合中（详情页 + 清单各一条）。
    const index = await read("/index.json");
    const slugs = (index.body.datasets as { slug: string }[]).map((d) => d.slug);
    expect(slugs).toContain("sitemap-a");
    for (const slug of slugs) {
      expect(locs, slug).toContain(`https://lantai.test/dataset?slug=${slug}`);
      expect(locs, slug).toContain(`https://lantai.test/${slug}/manifest.json`);
    }

    // 禁止项：快照深链、受保护页、接口路径一律不得出现。
    for (const u of locs) {
      expect(u, u).not.toMatch(/\/versions\/[^/]+\.json$/);
      expect(u, u).not.toMatch(/^\S+\/(admin|review|ops)(\.html)?$/);
      expect(u, u).not.toContain("/api/");
    }
  });
});

describe("read egress · 受保护页集合三处同源（契约 §1.2 不变式，防搬家式修复）", () => {
  it("canonical 目标必须落在受保护集合内，且 Worker 永不直出 `.html` 本体", async () => {
    for (const route of PROTECTED_ROUTES) {
      expect(PROTECTED_ROUTES).toContain(route);
      const file = PROTECTED_PAGES[route];
      const res = await callApp(`/${file}`);
      expect(res.status, `/${file}`).not.toBe(200);
      const target = new URL(res.headers.get("location") ?? "", "https://lantai.test").pathname;
      expect(target, `/${file} 的 canonical 目标必须还在受保护集合内`).toBe(`/${route}`);
      expect(PROTECTED_ROUTES.map((r) => `/${r}`)).toContain(target);
      expect((await res.text()).toLowerCase()).not.toContain("<!doctype html");
    }
  });

  it("部署白名单与代码同源：三个受保护页的两种形态都在 `run_worker_first` 里，非受保护页不在", () => {
    const block = WRANGLER_RAW.match(/"run_worker_first"\s*:\s*\[([^\]]*)\]/s)?.[1] ?? "";
    const entries = [...block.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
    expect(entries.length).toBeGreaterThan(0);
    for (const route of PROTECTED_ROUTES) {
      expect(entries, `/${route}`).toContain(`/${route}`);
      expect(entries, `/${PROTECTED_PAGES[route]}`).toContain(`/${PROTECTED_PAGES[route]}`);
    }
    // 非受保护页不得进白名单：它们必须继续由资产层做 canonical 307（对照断言，两类不混用判据）。
    for (const file of ["/submit.html", "/index.html", "/dataset.html", "/status.html"]) {
      expect(entries, file).not.toContain(file);
    }
  });
});

describe("read egress · M5b/E11 + E10 对称 + E25 哨兵串判据", () => {
  it("stage 后 manifest.preview === previewVersion、preview.json 可达、latest 不变且不在 dataVersions[]", async () => {
    const datasetId = await registerAndFreeze("egress-preview");
    await postJson(`/api/admin/datasets/${datasetId}/publish`, { payload: { name: "base" } });
    const sub = await postJson("/api/submissions", {
      slug: "egress-preview",
      payload: { name: "candidate" },
    });
    const { submissionId } = await json<{ submissionId: string }>(sub);
    const stage = await postJson(`/api/admin/submissions/${submissionId}/stage`, {});
    expect(stage.status).toBe(200);
    const { previewVersion } = await json<{ previewVersion: string }>(stage);

    /* E11：manifest 是指针的发现入口，stage 之后必须回写 preview（不留悬空/滞后引用）。 */
    const manifest = await read("/egress-preview/manifest.json");
    const body = manifest.body as {
      latest: string | null;
      preview: string | null;
      dataVersions: { version: string }[];
    };
    expect(body.preview).toBe(previewVersion);
    expect(body.latest).toBe("1");
    /* preview 只作指针字段：不进 dataVersions[]（预览可达但不可枚举，契约 §6）。 */
    expect(body.dataVersions.map((v) => v.version)).not.toContain(previewVersion);

    /* preview.json 可达，且与 manifest.preview 同源。 */
    const preview = await read("/egress-preview/preview.json");
    expect(preview.res.status).toBe(200);
    expect((preview.body as { dataVersion: string }).dataVersion).toBe(previewVersion);

    /* E10 对称不变式：latest.json ⇔ manifest.latest。 */
    const latest = await read("/egress-preview/latest.json");
    expect((latest.body as { dataVersion: string }).dataVersion).toBe(body.latest);
  });

  it("E25 哨兵串：指针/索引类文档一律 0，只有 `versions/*.json`（putImmutable 数据快照）允许非 0", async () => {
    const datasetId = await registerAndFreeze("egress-sentinel");
    await postJson(`/api/admin/datasets/${datasetId}/publish`, {
      payload: { name: "SENTINEL-7f3a91", age: 7 },
    });

    // 允许：数据快照本体（不可变产物）当然可以含哨兵串。
    const snapshot = await read("/egress-sentinel/versions/1.json");
    expect(snapshot.text).toContain("SENTINEL-7f3a91");

    // 必须为 0：指针 / 索引 / 清单类文档不得把 payload 值漏出去。
    for (const path of [
      "/index.json",
      "/search/index.json",
      "/egress-sentinel/manifest.json",
      "/egress-sentinel/latest.json",
    ]) {
      const doc = await read(path);
      expect(doc.text, path).not.toContain("SENTINEL-7f3a91");
    }
  });
});

describe("read egress · 非读取族的非 GET/HEAD（契约 §1.3 405 行注 / E31 第 5 项）", () => {
  /* 405 只留给「命中读取家族但方法不对」；未进家族的非 GET/HEAD 必须 404 且恒 JSON + no-store。
     不显式兜住时，Hono 会对已注册的页面路由（/admin 等）按方法不匹配回 405（且 body 非 JSON）。 */
  it("未命中家族的非 GET/HEAD → 404 not_found + no-store（不是 405，无 allow 头）", async () => {
    for (const path of ["/admin", "/admin.html", "/styles.css", "/submit", "/nope"]) {
      for (const method of ["POST", "PUT", "DELETE", "PATCH"]) {
        const { res, body, text } = await read(path, { method });
        expect(res.status, `${method} ${path}`).toBe(404);
        expect(res.headers.get("cache-control")).toBe("no-store");
        expect(res.headers.get("allow")).toBeNull();
        expect(text.startsWith("{")).toBe(true);
        expect(body).toMatchObject({ error: { code: "not_found" } });
        assertHeaderWhitelist(res);
      }
    }
  });

  it("未命中的 /api/* 不受影响：仍由接口层回 404「接口不存在」", async () => {
    const { res, body } = await read("/api/no-such-endpoint", { method: "POST" });
    expect(res.status).toBe(404);
    expect(body).toMatchObject({ error: { code: "not_found" } });
  });
});

describe("read egress · 种子护栏（T6 / E28：机制级拒绝 prod）", () => {
  it("seed-demo.mjs 先问服务端 environment，不在白名单即硬退出（先判后连）", () => {
    expect(SEED_SCRIPT_SRC).toContain("/api/health");
    expect(SEED_SCRIPT_SRC).toMatch(/ALLOWED_ENVIRONMENTS/);
    expect(SEED_SCRIPT_SRC).toMatch(/"development", "test", "preprod"/);
    const mainIdx = SEED_SCRIPT_SRC.indexOf("async function main()");
    const guardIdx = SEED_SCRIPT_SRC.indexOf("assertSeedableTarget()", mainIdx);
    const adminIdx = SEED_SCRIPT_SRC.indexOf("seedOne(", mainIdx);
    expect(mainIdx).toBeGreaterThan(-1);
    expect(guardIdx).toBeGreaterThan(mainIdx);
    /* 守卫必须在任何管理 API 调用之前：跑到一半才被拒会留下半成品数据。 */
    expect(guardIdx).toBeLessThan(adminIdx);
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

describe("read egress · 响应头纪律与兜底（E16/E29）", () => {
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

describe("read egress · E11 预览可达（T12 收窄版：preview 唯一权威 = preview.json 指针）", () => {
  it("stage 后：preview.json 200(60+must-revalidate) 且 manifest.preview === preview.dataVersion；快照 immutable 且字节稳定", async () => {
    const id = await registerAndFreeze("egress-preview");
    await postJson(`/api/admin/datasets/${id}/publish`, { payload: { name: "v1", age: 1 } });

    const staged = await postJson(`/api/admin/datasets/${id}/stage`, {
      payload: { name: "preview-only", age: 9 },
    });
    const { previewVersion } = await json<{ previewVersion: string }>(staged);
    expect(previewVersion.startsWith("preview-")).toBe(true);

    /* 源站态读取（no-cache），不承诺缓存客户端同时刻一致。 */
    const pointer = await read("/egress-preview/preview.json", {
      headers: { "cache-control": "no-cache" },
    });
    expect(pointer.res.status).toBe(200);
    expect(pointer.res.headers.get("cache-control")).toBe(CACHE.pointer);
    expect(pointer.body.dataVersion).toBe(previewVersion);

    const manifest = await read("/egress-preview/manifest.json", {
      headers: { "cache-control": "no-cache" },
    });
    // T12：两处必须相等，不允许「良性滞后」。
    expect(manifest.body.preview).toBe(pointer.body.dataVersion);
    // E9：preview 快照不进 dataVersions[]，也不冒充 latest。
    expect(manifest.body.latest).toBe("1");
    expect((manifest.body.dataVersions as { version: string }[]).map((v) => v.version)).toEqual([
      "1",
    ]);

    // 经 manifest.preview 拼路径可达：200 + immutable，同 URL 两次 sha256 相同。
    const snapUrl = `/egress-preview/versions/${String(manifest.body.preview)}.json`;
    const snap = await read(snapUrl);
    expect(snap.res.status).toBe(200);
    expect(snap.res.headers.get("cache-control")).toBe(CACHE.immutable);
    expect(JSON.parse(snap.text)).toEqual({ name: "preview-only", age: 9 });
    const again = await read(snapUrl);
    expect(await sha256Hex(again.text)).toBe(await sha256Hex(snap.text));
  });

  it("stage 一次都没发生时：preview.json 404 + no-store 且 manifest.preview === null", async () => {
    await registerAndFreeze("egress-nopreview");

    const manifest = await read("/egress-nopreview/manifest.json", {
      headers: { "cache-control": "no-cache" },
    });
    expect(manifest.res.status).toBe(200);
    expect(manifest.body.preview).toBeNull();

    const pointer = await read("/egress-nopreview/preview.json", {
      headers: { "cache-control": "no-cache" },
    });
    expect(pointer.res.status).toBe(404);
    expect(pointer.res.headers.get("cache-control")).toBe("no-store");
  });

  it("再发布一版后 manifest.preview 仍等于指针（不被 publish 抹掉）", async () => {
    const id = await registerAndFreeze("egress-preview-keep");
    const staged = await postJson(`/api/admin/datasets/${id}/stage`, {
      payload: { name: "keep-me", age: 2 },
    });
    const { previewVersion } = await json<{ previewVersion: string }>(staged);
    await postJson(`/api/admin/datasets/${id}/publish`, { payload: { name: "v1", age: 1 } });

    const manifest = await read("/egress-preview-keep/manifest.json");
    const pointer = await read("/egress-preview-keep/preview.json");
    expect(manifest.body.preview).toBe(previewVersion);
    expect(manifest.body.preview).toBe(pointer.body.dataVersion);
    expect((manifest.body.dataVersions as { version: string }[]).map((v) => v.version)).toEqual([
      "1",
    ]);
  });
});
