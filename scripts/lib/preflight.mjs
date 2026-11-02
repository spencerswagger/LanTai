/**
 * 发布前置校验与最小并发保护的纯函数（Owl P3）。
 *
 * 三件事：
 * 1. `--slug` 格式校验（会进 R2 key，也会被写进 wrangler.jsonc 的字符串值）；
 * 2. `git status --porcelain` 解析：部署前判断工作树是否脏（`wrangler.jsonc` 的白名单改动是预期内的，不算）；
 * 3. 目录索引两次 read-modify-write 之间的漂移检测：发现别人并发改过就中止，而不是覆盖。
 *
 * 纯函数（不跑 git、不跑 wrangler），便于单测：`tests/publish-preset-pack.test.ts`。
 */

/**
 * slug 正则：**与平台建数据集 API 一致**（`src/routes/admin-datasets.ts:18` 的 `SLUG_RE`），
 * 而不是灵枢 F4 的 providerId 宽版（那个允许 `.`/`_`，管的是包内 providerId）。
 *
 * 取严的原因（两条硬约束，都会静默出事）：
 * 1. 平台自己的 API 只认这个正则——脚本放宽就能造出「平台会拒绝」的 slug；
 * 2. R2 缓存分类只认 `[a-z0-9-]+`（`src/r2/keys.ts:30-35` 的 IMMUTABLE_PATTERNS / POINTER_PATTERNS）：
 *    slug 带 `.`/`_` 时快照缓存从 31536000s 掉到 300s、指针从 60s 变 300s，读得出来但缓存语义全错且不报错。
 */
export const SLUG_PATTERN = "^[a-z0-9][a-z0-9-]{0,62}$";
const SLUG_RE = new RegExp(SLUG_PATTERN);

export function isValidSlug(slug) {
  return typeof slug === "string" && SLUG_RE.test(slug);
}

/**
 * 解析 `git status --porcelain` 输出。
 * `ignored` 里的路径不算「脏」——脚本自己刚写过的 `wrangler.jsonc` 就属于这种（Owl P2：它必须被提交，
 * 但不应该拦住本次部署）。
 */
export function parseGitStatus(text, ignored = ["wrangler.jsonc"]) {
  const paths = String(text ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "")
    /* porcelain 格式：状态码 + 空格 + 路径（重命名是 "R  old -> new"）。 */
    .map((line) =>
      line
        .replace(/^[A-Z?!]{1,2}\s+/, "")
        .split(" -> ")
        .pop()
        .trim(),
    )
    .filter((path) => path !== "");
  const blocking = paths.filter((path) => !ignored.includes(path));
  return { dirty: paths.length > 0, paths, blocking };
}

/**
 * 目录索引漂移检测：比较「我写下去的那一版」和「发布前再读到的那一版」。
 * 不一致 = 期间有人并发改过 index.json，继续写会丢掉别人的条目（Owl P3-3）。
 */
export function indexDrift(expected, actual) {
  const left = JSON.stringify(expected ?? null);
  const right = JSON.stringify(actual ?? null);
  if (left === right) return { drifted: false, reason: null };
  const expectedSlugs = (expected?.datasets ?? []).map((item) => item.slug);
  const actualSlugs = (actual?.datasets ?? []).map((item) => item.slug);
  return {
    drifted: true,
    reason: `索引在两次读改写之间被改动：写入版本 ${expectedSlugs.length} 条 [${expectedSlugs.join(",")}]，当前 ${actualSlugs.length} 条 [${actualSlugs.join(",")}]`,
  };
}
