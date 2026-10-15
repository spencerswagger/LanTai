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

export function docKey(path: string): string {
  return `docs/${path.replace(/^\/+/, "")}`;
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
  /^docs\/[A-Za-z0-9._/-]+$/,
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
