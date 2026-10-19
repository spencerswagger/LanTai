export const PLATFORM_INDEX_KEY = "index.json";
export const SEARCH_INDEX_KEY = "search/index.json";

export function schemaKey(slug: string, schemaVersion: string): string {
  return `schemas/${slug}/${schemaVersion}.json`;
}

export function manifestKey(slug: string): string {
  return `${slug}/manifest.json`;
}

export function latestPointerKey(slug: string): string {
  return `${slug}/latest.json`;
}

export function previewPointerKey(slug: string): string {
  return `${slug}/preview.json`;
}

export function dataSnapshotKey(slug: string, dataVersion: string): string {
  return `${slug}/versions/${dataVersion}.json`;
}

export function datasetSearchIndexKey(slug: string): string {
  return `${slug}/search-index.json`;
}

export type CacheClass = "immutable" | "pointer" | "index";

const IMMUTABLE_PATTERNS: RegExp[] = [
  /^schemas\/[a-z0-9-]+\/[0-9A-Za-z.-]+\.json$/,
  /^[a-z0-9-]+\/versions\/[0-9A-Za-z.-]+\.json$/,
];

const POINTER_PATTERNS: RegExp[] = [/^[a-z0-9-]+\/latest\.json$/, /^[a-z0-9-]+\/preview\.json$/];

export function cacheClassForKey(key: string): CacheClass {
  if (IMMUTABLE_PATTERNS.some((re) => re.test(key))) return "immutable";
  if (POINTER_PATTERNS.some((re) => re.test(key))) return "pointer";
  return "index";
}

const CACHE_CONTROL: Record<CacheClass, string> = {
  immutable: "public, max-age=31536000, immutable",
  pointer: "public, max-age=60, must-revalidate",
  index: "public, max-age=300",
};

export function cacheControlForKey(key: string): string {
  return CACHE_CONTROL[cacheClassForKey(key)];
}

const PUBLIC_PATTERNS: RegExp[] = [
  /^index\.json$/,
  /^schemas\/[a-z0-9-]+\/[0-9A-Za-z.-]+\.json$/,
  /^search\/index\.json$/,
  /^[a-z0-9-]+\/manifest\.json$/,
  /^[a-z0-9-]+\/latest\.json$/,
  /^[a-z0-9-]+\/preview\.json$/,
  /^[a-z0-9-]+\/versions\/[0-9A-Za-z.-]+\.json$/,
  /^[a-z0-9-]+\/search-index\.json$/,
];

/**
 * 把公开读取路径映射到 R2 键。仅匹配平台约定的静态发布物布局；
 * 不匹配时返回 null（交给资产层 / 404）。
 */
export function r2KeyForPublicPath(pathname: string): string | null {
  const normalized = pathname.replace(/^\/+/, "");
  if (normalized === "") return null;
  return PUBLIC_PATTERNS.some((re) => re.test(normalized)) ? normalized : null;
}

/**
 * 读取出口的路由族（宽松匹配）。与 `r2KeyForPublicPath` 的区别：
 * slug / 版本段只是「非空单段」，不校验字符集，也不做 D1 反查——
 * 未登记或形态奇怪的 slug 也必须落读取出口并得到 404 JSON，
 * 而不是回退成资产层的 200 HTML（E14 / E21）。
 */
const READ_EGRESS_PATTERNS: RegExp[] = [
  /^index\.json$/,
  /^search\/index\.json$/,
  /^[^/]+\/(?:manifest|latest|preview|search-index)\.json$/,
  /^[^/]+\/versions\/[^/]+\.json$/,
  /^schemas\/[^/]+\/[^/]+\.json$/,
];

/**
 * 匹配前的归一化（契约 §1.1 定稿口径 + 验收 E21）：**只剥前导 `/`**。
 * 尾斜杠**不剥**——`/acc-b/manifest.json/` 不得被别名成 200（E21(a) 明确判 404 JSON）；
 * 同样不 percent-decode、不折叠 `.` / `..`、不做大小写归一。
 * （`//index.json`、`/./index.json` 在到达 Worker 之前已被平台归一，E22 只在 HTTP 层判。）
 */
export function normalizeReadPath(pathname: string): string {
  return pathname.replace(/^\/+/, "");
}

/**
 * 归一化后剥掉**唯一**一个尾斜杠（仅供 `.json` 守卫用，不参与家族匹配）。
 * `/nope.json/` → `nope.json`（判守卫）；`/nope.json//` → `nope.json/`（末尾不是 `.json`，不判守卫）。
 */
function stripOneTrailingSlash(pathname: string): string {
  return pathname.endsWith("/") && !pathname.endsWith("//") ? pathname.slice(0, -1) : pathname;
}

/** R2 键上限（1024 字节）。超限的 `bucket.get` 会抛错，绝不能让读者看到 5xx（E20）。 */
const R2_KEY_MAX_BYTES = 1024;

function keyByteLength(key: string): number {
  return new TextEncoder().encode(key).length;
}

/**
 * 把公开读取路径映射到 R2 键（宽松版，供 Worker 读取出口使用）。
 * 命中即由读取出口接管；不命中返回 null，交给 `.json` 守卫 / 后续路由 / 资产层。
 */
export function readEgressKeyForPath(pathname: string): string | null {
  const normalized = normalizeReadPath(pathname);
  if (normalized === "") return null;
  if (
    normalized.split("/").some((segment) => segment === "" || segment === "." || segment === "..")
  ) {
    return null;
  }
  /* 超长键不查 R2：R2 上限 1024 字节，超限 get 会抛错 → 会变成 5xx（E20 判「绝不 5xx」）。 */
  if (keyByteLength(normalized) > R2_KEY_MAX_BYTES) return null;
  return READ_EGRESS_PATTERNS.some((re) => re.test(normalized)) ? normalized : null;
}

/**
 * `.json` 守卫（契约 §1.1 定稿 + 验收 E21/E26）：未命中读取家族、但
 * **以 `.json` 结尾**，**或**「去掉唯一尾斜杠后以 `.json` 结尾」的路径，
 * 一律由读取出口回 JSON 404 + `no-store`，**绝不**落到资产层回 200 HTML / 空 body。
 *
 * 守卫覆盖两类形态：`/nope.json`（直接以 .json 结尾）、`/acc-b/manifest.json/`（尾斜杠形态，
 * 即 E21(a)：**不**把尾斜杠剥成别名，因此即使对象存在也必须 404）。
 *
 * 维护约束（运维级遗留）：`public/` 一旦新增 `.json` 资产，必须**先**给这里加白名单例外，
 * 否则守卫会吞掉真实文件、E21/E27 判定失效。当前前提可复跑：`find public -name '*.json' | wc -l` = 0。
 */
export function isJsonGuardPath(pathname: string): boolean {
  const normalized = normalizeReadPath(pathname);
  if (normalized === "") return false;
  if (readEgressKeyForPath(normalized) !== null) return false;
  return normalized.endsWith(".json") || stripOneTrailingSlash(normalized).endsWith(".json");
}
