import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import type { Env } from "../src/env";
import WRANGLER_RAW from "../wrangler.jsonc?raw";
import { callApp, json, postJson } from "./helpers";

/**
 * `/{slug}/latest.json` → 302 跳包本体（PR #1，`maybeRedirectLatest`）。
 *
 * ## 为什么这组用例必须**显式注入**白名单
 * 白名单 `LATEST_REDIRECT_SLUGS` **只写在 `wrangler.jsonc` 的 `env.test.vars` 里**，
 * 而 vitest workers pool 用 `wrangler.configPath` 读的是**顶层配置**，看不到 `env.*` 块
 * → 测试进程里这个开关默认是**关的**。于是「只读 `env` 直接断言」的写法会恒真（永远走老行为，
 * 断言全绿但一行新逻辑都没跑到）。本文件的纪律：
 *   1. 先断言「默认 env 里没有白名单」（`switchOffInHarness`）——证明注入是**必要**的；
 *   2. 每条用例都通过 `callApp(..., { LATEST_REDIRECT_SLUGS })` **显式注入**；未注入的对照组断言 200。
 * 这样任何一条断言若写成恒真（例：注入被忽略），第一个用例就会红。
 *
 * 配置归属（白名单只在 test 打开、preprod/prod 保持老行为）由最后一条配置用例守着。
 */

const SLUG = "channel-preset-pack";
const OTHER = "latest-off-list";
const BASE = "https://lantai.test";

/** 显式打开白名单：等价于 test 环境的 `env.test.vars.LATEST_REDIRECT_SLUGS`。 */
const ON: Partial<Env> = { LATEST_REDIRECT_SLUGS: SLUG };

const POINTER_CACHE = "public, max-age=60, must-revalidate";

const schema = {
  type: "object",
  properties: { name: { type: "string" } },
  required: ["name"],
};

async function publish(slug: string): Promise<string> {
  const created = await postJson("/api/admin/datasets", { slug, title: slug, schema });
  expect(created.status, `register ${slug}`).toBe(201);
  const { dataset } = await json<{ dataset: { id: string } }>(created);
  const frozen = await postJson(`/api/admin/datasets/${dataset.id}/freeze`, { version: "1.0.0" });
  expect(frozen.status, `freeze ${slug}`).toBe(200);
  const published = await postJson(`/api/admin/datasets/${dataset.id}/publish`, {
    payload: { name: "v1" },
  });
  expect(published.status, `publish ${slug}`).toBe(201);
  return dataset.id;
}

/** 响应头白名单（含 302 的 `location`；只允许边缘 cf-* 追加）。 */
function assertNoDebugHeaders(res: Response): void {
  for (const name of res.headers.keys()) {
    const lower = name.toLowerCase();
    expect(lower.startsWith("x-lantai"), `不得出现自定义调试头 ${lower}`).toBe(false);
    expect(
      ["content-type", "cache-control", "etag", "allow", "location", "cf-cache-status", "cf-ray"],
      `未预期的响应头 ${lower}`,
    ).toContain(lower);
  }
}

/** 指针损坏时的 `location` 卫生：不得出现 undefined / null / 空段（Owl 必改项 ④）。 */
function assertCleanLocation(res: Response): void {
  const location = res.headers.get("location");
  if (location === null) return;
  expect(location.trim(), "location 不得为空串").not.toBe("");
  expect(location).not.toContain("undefined");
  expect(location).not.toContain("null");
  expect(location).not.toContain("/versions/.json");
}

describe("latest.json 302 跳转 · 白名单命中", () => {
  it("① 302 + location 精确值 + 指针缓存语义 + 无自定义调试头", async () => {
    await publish(SLUG);

    const res = await callApp(`/${SLUG}/latest.json`, undefined, ON);
    await res.text(); // 消费 body，避免 R2 流泄漏

    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe(`/${SLUG}/versions/1.json`);
    expect(res.headers.get("cache-control")).toBe(POINTER_CACHE);
    // §1.5：302 一律空体、不带 MIME（§1 头白名单只允许 application/json，故不给 content-type）。
    expect(res.headers.get("content-type")).toBeNull();
    expect(res.headers.get("content-length")).toBeNull();
    expect(await res.text()).toBe("");
    expect(res.headers.get("allow")).toBeNull();
    assertNoDebugHeaders(res);
    assertCleanLocation(res);
  });

  it("② HEAD：302 + 同一 location + 空 body（0 字节）", async () => {
    await publish(SLUG);

    const res = await callApp(`/${SLUG}/latest.json`, { method: "HEAD" }, ON);
    const body = await res.arrayBuffer();

    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe(`/${SLUG}/versions/1.json`);
    expect(res.headers.get("cache-control")).toBe(POINTER_CACHE);
    expect(body.byteLength, "HEAD 不得回 body").toBe(0);
    assertNoDebugHeaders(res);
  });
});

describe("latest.json 302 跳转 · 开关边界", () => {
  it("③ 未命中白名单的数据集仍是 200 指针（不跳转），且指针语义与跳转版一致", async () => {
    await publish(OTHER);

    // 白名单里只有 SLUG，OTHER 不在 → 老行为。
    const res = await callApp(`/${OTHER}/latest.json`, undefined, ON);
    const text = await res.text();

    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
    expect(res.headers.get("cache-control")).toBe(POINTER_CACHE);
    const body = JSON.parse(text) as { dataset: string; dataVersion: string };
    expect(body.dataset).toBe(OTHER);
    expect(body.dataVersion).toBe("1");
  });

  it("③′ 白名单变量缺失时（＝顶层配置/生产老行为）：命中 slug 也仍返回 200 指针", async () => {
    await publish(SLUG);

    const res = await callApp(`/${SLUG}/latest.json`, undefined, { LATEST_REDIRECT_SLUGS: "" });
    const text = await res.text();

    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
    expect((JSON.parse(text) as { dataVersion: string }).dataVersion).toBe("1");
  });
});

describe("latest.json 302 跳转 · 指针缺失 / 损坏（不得跳 undefined.json）", () => {
  it("④ 指针对象不存在（仅冻结未发布）→ 404 + no-store，不产生 location", async () => {
    const created = await postJson("/api/admin/datasets", {
      slug: SLUG,
      title: SLUG,
      schema,
    });
    const { dataset } = await json<{ dataset: { id: string } }>(created);
    await postJson(`/api/admin/datasets/${dataset.id}/freeze`, { version: "1.0.0" });

    const res = await callApp(`/${SLUG}/latest.json`, undefined, ON);
    const text = await res.text();

    expect(res.status).toBe(404);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("location")).toBeNull();
    assertCleanLocation(res);
    expect((JSON.parse(text) as { error: { code: string } }).error.code).toBe("not_found");
  });

  it("④′ 指针对象损坏（非 JSON / 缺 dataVersion）→ 404，绝不 302 到 undefined.json", async () => {
    await publish(SLUG);

    for (const corrupt of [
      '{"dataset":"chan',
      '{"dataset":"channel-preset-pack"}',
      '{"dataVersion":null}',
    ]) {
      await env.BUCKET.put(`${SLUG}/latest.json`, corrupt);

      const res = await callApp(`/${SLUG}/latest.json`, undefined, ON);
      await res.text();

      expect(res.status, `损坏指针 ${corrupt} 必须 404（不是 302/500）`).toBe(404);
      expect(res.headers.get("cache-control")).toBe("no-store");
      assertCleanLocation(res);
    }
  });
});

describe("latest.json 302 跳转 · 非读取族方法不被吞", () => {
  it("⑤ POST 到该路径仍是 405 method_not_allowed + allow: GET, HEAD（不进跳转分支）", async () => {
    await publish(SLUG);

    const res = await callApp(
      `/${SLUG}/latest.json`,
      { method: "POST", headers: { "content-type": "application/json" }, body: "{}" },
      ON,
    );
    const text = await res.text();

    expect(res.status).toBe(405);
    expect(res.headers.get("allow")).toBe("GET, HEAD");
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("location")).toBeNull();
    expect((JSON.parse(text) as { error: { code: string } }).error.code).toBe("method_not_allowed");
  });
});

describe("latest.json 302 跳转 · 配置归属（只在 test 打开）", () => {
  it("测试 harness 默认 env 里没有白名单（注入不是可选项，而是前提）", () => {
    const harnessEnv = env as unknown as Env;
    expect(harnessEnv.LATEST_REDIRECT_SLUGS ?? "").toBe("");
  });

  it("`LATEST_REDIRECT_SLUGS` 只出现一次，且落在 env.test 块内、值为 channel-preset-pack", () => {
    const occurrences = [...WRANGLER_RAW.matchAll(/"LATEST_REDIRECT_SLUGS"/g)].map((m) => m.index);
    expect(occurrences.length, "白名单只允许配一次（preprod/prod 不得打开）").toBe(1);

    const testBlockStart = WRANGLER_RAW.indexOf('"test": {');
    const preprodBlockStart = WRANGLER_RAW.indexOf('"preprod": {');
    expect(testBlockStart).toBeGreaterThan(-1);
    expect(preprodBlockStart).toBeGreaterThan(testBlockStart);

    const at = occurrences[0] as number;
    expect(at).toBeGreaterThan(testBlockStart);
    expect(at, "白名单必须落在 env.test 块内，不许外溢到 preprod").toBeLessThan(preprodBlockStart);

    const value = WRANGLER_RAW.slice(at).match(/"LATEST_REDIRECT_SLUGS"\s*:\s*"([^"]*)"/)?.[1];
    expect(value).toBe(SLUG);

    // 顶层与 preprod/prod 都不许有该键（顶层命中会让「默认关」失守，生产命中会改生产行为）。
    const topLevel = WRANGLER_RAW.slice(0, testBlockStart);
    expect(topLevel).not.toContain("LATEST_REDIRECT_SLUGS");
    const preprod = WRANGLER_RAW.slice(preprodBlockStart);
    expect(preprod).not.toContain("LATEST_REDIRECT_SLUGS");
  });

  it("白名单语义：逗号分隔、空白容忍、空项忽略、不做前缀/子串匹配", async () => {
    await publish(SLUG);

    // 空白 + 空项不影响命中（运维常写 "a, b"）。
    const spaced = await callApp(`/${SLUG}/latest.json`, undefined, {
      LATEST_REDIRECT_SLUGS: " , other ,  channel-preset-pack ",
    });
    await spaced.text();
    expect(spaced.status).toBe(302);

    // 不做前缀/子串匹配：`channel-preset` 不得命中 `channel-preset-pack`。
    const prefix = await callApp(`/${SLUG}/latest.json`, undefined, {
      LATEST_REDIRECT_SLUGS: "channel-preset",
    });
    await prefix.text();
    expect(prefix.status).toBe(200);

    // 绝对 URL 形态的 location 会掉进 Access / 跨域，必须是同源相对路径。
    expect(spaced.headers.get("location")).toBe(`/${SLUG}/versions/1.json`);
    expect(new URL(String(spaced.headers.get("location")), BASE).origin).toBe(BASE);
  });
});
