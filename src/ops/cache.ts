import { type CacheClass, cacheClassForKey, r2KeyForPublicPath } from "../r2/keys";

/**
 * 各缓存层的 max-age 纪律说明，供测试与运营文档引用。
 */
export const CACHE_POLICY: Record<
  CacheClass,
  { maxAge: number; cacheControl: string; note: string }
> = {
  immutable: {
    maxAge: 31536000,
    cacheControl: "public, max-age=31536000, immutable",
    note: "不可变发布物（版本快照 / 冻结 Schema），内容寻址，可长缓存。",
  },
  pointer: {
    maxAge: 60,
    cacheControl: "public, max-age=60, must-revalidate",
    note: "指针文件（latest / preview），短缓存并强制回源校验。",
  },
  index: {
    maxAge: 300,
    cacheControl: "public, max-age=300",
    note: "目录与搜索索引，中等缓存。",
  },
};

/**
 * 依据公开读取路径判定缓存分层；映射不到 R2 键时返回 null（由资产层处理）。
 */
export function cacheClassForPath(pathname: string): CacheClass | null {
  const key = r2KeyForPublicPath(pathname);
  if (!key) return null;
  return cacheClassForKey(key);
}
