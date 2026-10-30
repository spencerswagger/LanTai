import { describe, expect, it } from "vitest";
import { readRedirectSlugs, registerRedirectSlug } from "../scripts/lib/wrangler-config.mjs";

/**
 * 只测纯函数（wrangler.jsonc 白名单读写）。主脚本 import 了 `node:child_process`，
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
