import { describe, expect, it } from "vitest";
import {
  buildNextManifest,
  isNoopReplay,
  nextDataVersion,
} from "../scripts/lib/append-version.mjs";
import {
  isMissingObjectError,
  upsertCatalog,
  upsertSearchIndex,
} from "../scripts/lib/index-merge.mjs";
import { indexDrift, isValidSlug, parseGitStatus } from "../scripts/lib/preflight.mjs";
import { readRedirectSlugs, registerRedirectSlug } from "../scripts/lib/wrangler-config.mjs";

/**
 * 只测纯函数（wrangler.jsonc 白名单读写、平台索引合并/错误分类、slug/脏树/漂移、追加版本）。主脚本 import 了 `node:child_process`，
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

describe("isValidSlug（P3-2：slug 前置校验）", () => {
  it("合法 slug 通过（与平台 SLUG_RE 一致：小写/数字开头，只含 a-z0-9-，总长 ≤63）", () => {
    for (const slug of ["channel-preset-pack", "a", "demo-population", "abc123", "a".repeat(63)]) {
      expect(isValidSlug(slug)).toBe(true);
    }
  });

  it("大写 / 点 / 下划线 / 引号 / 空格 / 前导横线 / 超长 一律拒绝", () => {
    for (const slug of [
      "Channel-Preset",
      "v1.2",
      "with_underscore",
      'x"y',
      "a b",
      "-lead",
      "",
      "a".repeat(64),
    ]) {
      expect(isValidSlug(slug)).toBe(false);
    }
  });
});

describe("parseGitStatus（P3-1：部署前脏树检查）", () => {
  it("干净工作树 → dirty=false", () => {
    expect(parseGitStatus("")).toEqual({ dirty: false, paths: [], blocking: [] });
  });

  it("只有 wrangler.jsonc 被改 → 不算阻塞（脚本自己写的白名单改动属预期）", () => {
    const out = " M wrangler.jsonc\n";
    const parsed = parseGitStatus(out);
    expect(parsed.dirty).toBe(true);
    expect(parsed.blocking).toEqual([]);
  });

  it("有别处的未提交改动 → 阻塞（避免把别人的 WIP 发到 test）", () => {
    const out = " M wrangler.jsonc\n M src/index.ts\n?? scripts/tmp.mjs\n";
    const parsed = parseGitStatus(out);
    expect(parsed.blocking).toEqual(["src/index.ts", "scripts/tmp.mjs"]);
  });

  it("重命名行取目标路径", () => {
    expect(parseGitStatus("R  old.mjs -> new.mjs\n").paths).toEqual(["new.mjs"]);
  });
});

describe("indexDrift（P3-3：目录两次读改写之间的并发保护）", () => {
  const version = (slugs: string[]) => ({
    generatedAt: "t",
    datasets: slugs.map((slug: string) => ({ slug })),
  });

  it("同一版本 → 不漂移", () => {
    const index = version(["a", "b"]);
    expect(indexDrift(index, version(["a", "b"])).drifted).toBe(false);
  });

  it("期间多了别人的条目 → 检出漂移并给出原因", () => {
    const result = indexDrift(version(["a", "b"]), version(["a", "b", "c"]));
    expect(result.drifted).toBe(true);
    expect(result.reason).toContain("a,b,c");
  });

  it("条目数相同但被替换 → 也算漂移", () => {
    expect(indexDrift(version(["a"]), version(["z"])).drifted).toBe(true);
  });
});

describe("nextDataVersion（append：版本号来源是 D1，不靠本地推断）", () => {
  it("空表 → 1", () => {
    expect(nextDataVersion([])).toBe("1");
    expect(nextDataVersion(null)).toBe("1");
  });

  it("首发后追加三次 → 2 / 3 / 4（不跳号、不重号）", () => {
    const rows: { version: string }[] = [{ version: "1" }];
    const seq: string[] = [];
    for (let i = 0; i < 3; i += 1) {
      const nextVersion = nextDataVersion(rows);
      seq.push(nextVersion);
      rows.push({ version: nextVersion });
    }
    expect(seq).toEqual(["2", "3", "4"]);
    expect(rows.map((r) => r.version)).toEqual(["1", "2", "3", "4"]);
  });

  it("非纯数字版本（preview-1）不参与编号", () => {
    expect(nextDataVersion([{ version: "1" }, { version: "preview-1" }])).toBe("2");
  });

  it("数字大小比较按数值而不是字符串（9 → 10）", () => {
    expect(nextDataVersion(["1", "9", "10"])).toBe("11");
  });
});

describe("isNoopReplay（append：重复跑同一版本必须幂等）", () => {
  const hash = "abc123";

  it("指针 contentHash 与本次相同 → 判定已发过", () => {
    expect(isNoopReplay({ contentHash: hash }, hash)).toBe(true);
  });

  it("内容不同 / 指针缺失 → 正常发布", () => {
    expect(isNoopReplay({ contentHash: "other" }, hash)).toBe(false);
    expect(isNoopReplay(null, hash)).toBe(false);
    expect(isNoopReplay({}, hash)).toBe(false);
  });
});

describe("buildNextManifest（append：manifest 前进一格，不重建）", () => {
  const base = {
    slug: "demo",
    title: "演示",
    schema: { version: "1.0.0", url: "/schemas/demo/1.0.0.json" },
    dataVersions: [
      { version: "1", publishedAt: "t1", isLatest: true, isPreview: false },
      { version: "2", publishedAt: "t2", isLatest: false, isPreview: false },
    ],
    latest: "2",
    preview: "2",
    updatedAt: "t2",
  };

  it("追加 3：历史版本保留、isLatest 只有一个、latest 前移、schema 与 preview 不动", () => {
    const next = buildNextManifest(base, {
      version: "3",
      schemaVersion: "1.0.0",
      publishedAt: "t3",
    });
    expect(next.dataVersions?.map((item) => item.version)).toEqual(["1", "2", "3"]);
    expect(next.dataVersions?.filter((item) => item.isLatest)).toHaveLength(1);
    expect(next.dataVersions?.find((item) => item.isLatest)?.version).toBe("3");
    expect(next.latest).toBe("3");
    expect(next.schema).toEqual(base.schema);
    expect(next.preview).toBe("2");
    expect(next.updatedAt).toBe("t3");
  });

  it("同一版本重复前进 → 不重复追加", () => {
    const once = buildNextManifest(base, {
      version: "3",
      schemaVersion: "1.0.0",
      publishedAt: "t3",
    });
    const twice = buildNextManifest(once, {
      version: "3",
      schemaVersion: "1.0.0",
      publishedAt: "t3b",
    });
    expect(twice.dataVersions?.map((item) => item.version)).toEqual(["1", "2", "3"]);
    expect(twice.dataVersions?.filter((item) => item.isLatest)).toHaveLength(1);
  });

  it("版本按数值排序（9 之后是 10）", () => {
    const nine = buildNextManifest(base, {
      version: "9",
      schemaVersion: "1.0.0",
      publishedAt: "t",
    });
    const ten = buildNextManifest(nine, {
      version: "10",
      schemaVersion: "1.0.0",
      publishedAt: "t",
    });
    expect(ten.dataVersions?.map((item) => item.version)).toEqual(["1", "2", "9", "10"]);
    expect(ten.latest).toBe("10");
  });
});
