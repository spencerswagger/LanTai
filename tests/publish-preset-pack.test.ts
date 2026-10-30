import { describe, expect, it } from "vitest";
import {
  isMissingObjectError,
  upsertCatalog,
  upsertSearchIndex,
} from "../scripts/lib/index-merge.mjs";
import { readRedirectSlugs, registerRedirectSlug } from "../scripts/lib/wrangler-config.mjs";

/**
 * 只测纯函数（wrangler.jsonc 白名单读写 + 平台索引合并/错误分类）。主脚本 import 了 `node:child_process`，
 * 在 workerd 测试环境里无法加载，因此参数解析不在这里测（由 dry-run 手工验证覆盖）。
 * 本文件不触发任何 wrangler / 网络调用。
 */

const CONFIG = `{
  "name": "lantai",
  "vars": {
    "ENVIRONMENT": "development"
  },
  "env": {
    "test": {
      "name": "lantai-test",
      "vars": {
        // 注释必须被保留（脚本只改白名单那一行，不重新序列化）
        "ENVIRONMENT": "test",
        "SKIP_ACCESS_DEV": "false"
      },
      "d1_databases": []
    }
  }
}
`;

describe("readRedirectSlugs", () => {
  it("键不存在时返回空数组", () => {
    expect(readRedirectSlugs(CONFIG, "test")).toEqual([]);
  });

  it("解析逗号分隔值并去空白", () => {
    const withKey = CONFIG.replace(
      '"SKIP_ACCESS_DEV": "false"',
      '"SKIP_ACCESS_DEV": "false",\n        "LATEST_REDIRECT_SLUGS": "a, b ,c"',
    );
    expect(readRedirectSlugs(withKey, "test")).toEqual(["a", "b", "c"]);
  });
});

describe("registerRedirectSlug", () => {
  it("键不存在时插入一行，且不压坏原有排版与注释", () => {
    const result = registerRedirectSlug(CONFIG, "test", "channel-preset-pack");
    expect(result.changed).toBe(true);
    expect(result.after).toEqual(["channel-preset-pack"]);
    expect(result.text).toContain('"LATEST_REDIRECT_SLUGS": "channel-preset-pack",');
    expect(result.text).toContain("// 注释必须被保留");
    // 除新增那一行外，其余行逐字不变
    const before = CONFIG.split("\n").filter(
      (line: string) => !line.includes("LATEST_REDIRECT_SLUGS"),
    );
    const after = result.text
      .split("\n")
      .filter((line: string) => !line.includes("LATEST_REDIRECT_SLUGS"));
    expect(after).toEqual(before);
    // 新增行必须独占一行（不能跟 `"vars": {` 挤在一起）
    expect(result.text).toContain('"vars": {\n        "LATEST_REDIRECT_SLUGS"');
  });

  it("幂等：已存在时不改动文本", () => {
    const once = registerRedirectSlug(CONFIG, "test", "alpha");
    const twice = registerRedirectSlug(once.text, "test", "alpha");
    expect(twice.changed).toBe(false);
    expect(twice.text).toBe(once.text);
    expect(twice.after).toEqual(["alpha"]);
  });

  it("追加时保序、不删既有项", () => {
    const first = registerRedirectSlug(CONFIG, "test", "alpha");
    const second = registerRedirectSlug(first.text, "test", "beta");
    expect(second.after).toEqual(["alpha", "beta"]);
    expect(second.text).toContain('"LATEST_REDIRECT_SLUGS": "alpha,beta"');
  });

  it("改的是指定 env 段，不影响其他 env 的配置", () => {
    const result = registerRedirectSlug(CONFIG, "test", "alpha");
    expect(result.text.match(/"ENVIRONMENT": "development"/g)).toHaveLength(1);
    expect(result.text).toContain('"ENVIRONMENT": "test"');
  });
});

describe("isMissingObjectError（P1-1：区分「不存在」与「读失败」）", () => {
  it("wrangler 的「对象不存在」文案判为 missing", () => {
    expect(isMissingObjectError("✘ The specified key does not exist.")).toBe(true);
    expect(isMissingObjectError("NoSuchKey")).toBe(true);
    expect(isMissingObjectError("key not found")).toBe(true);
  });

  it("鉴权 / 网络 / 5xx / 解析失败一律不判 missing（调用方必须抛出）", () => {
    expect(isMissingObjectError("Authentication error [code: 10000]")).toBe(false);
    expect(isMissingObjectError("fetch failed")).toBe(false);
    expect(isMissingObjectError("HTTP 503 Service Unavailable")).toBe(false);
    expect(isMissingObjectError("Unexpected token < in JSON")).toBe(false);
    expect(isMissingObjectError("")).toBe(false);
  });
});

describe("upsertCatalog（P1-1：合并语义，绝不整份覆盖）", () => {
  const existingIndex = {
    generatedAt: "2026-01-01T00:00:00.000Z",
    datasets: [
      { slug: "demo-population", title: "示例：人口统计", hasData: true },
      { slug: "district-tree", title: "行政区划树", hasData: true },
    ],
  };

  it("新增条目后其他数据集条目仍在", () => {
    const next = upsertCatalog(existingIndex, { slug: "channel-preset-pack", hasData: false }, "T");
    expect(next.datasets.map((item) => item.slug)).toEqual([
      "channel-preset-pack",
      "demo-population",
      "district-tree",
    ]);
    expect(next.generatedAt).toBe("T");
  });

  it("同 slug 再写是替换而不是追加", () => {
    const once = upsertCatalog(existingIndex, { slug: "demo-population", hasData: false }, "T1");
    const twice = upsertCatalog(once, { slug: "demo-population", hasData: true }, "T2");
    const hits = twice.datasets.filter((item) => item.slug === "demo-population");
    expect(hits).toHaveLength(1);
    expect(hits[0].hasData).toBe(true);
    expect(twice.datasets).toHaveLength(2); // 原 2 条，同 slug 是替换不是追加
  });

  it("索引不存在时按空索引创建", () => {
    const next = upsertCatalog(null, { slug: "only-one" }, "T");
    expect(next.datasets).toEqual([{ slug: "only-one" }]);
  });

  it("结构不合法时抛错，不重建索引", () => {
    const badDatasets = { datasets: "oops" } as unknown as Parameters<typeof upsertCatalog>[0];
    const badRoot = [1, 2] as unknown as Parameters<typeof upsertCatalog>[0];
    expect(() => upsertCatalog(badDatasets, { slug: "x" }, "T")).toThrow(/不是数组/);
    expect(() => upsertCatalog(badRoot, { slug: "x" }, "T")).toThrow(/不是对象/);
  });
});

describe("upsertSearchIndex（P1-1：同样的合并语义）", () => {
  it("保留其他数据集文档并替换同 slug", () => {
    const existing = {
      generatedAt: "g",
      datasets: [
        { slug: "demo-population", dataVersion: "6" },
        { slug: "channel-preset-pack", dataVersion: null },
      ],
    };
    const next = upsertSearchIndex(
      existing,
      { slug: "channel-preset-pack", dataVersion: "1" },
      "T",
    );
    expect(next.datasets.map((item) => [item.slug, item.dataVersion])).toEqual([
      ["channel-preset-pack", "1"],
      ["demo-population", "6"],
    ]);
  });
});
