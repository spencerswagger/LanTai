/**
 * 平台索引（`index.json` 目录 / `search/index.json` 全局搜索）的合并与错误分类。
 *
 * 为什么单独抽一层：
 * 1. 索引是**共享资源**——直接整份覆盖会把其他数据集的条目抹掉（Owl P1-1）；
 * 2. 「对象不存在」与「读取失败」必须分开：前者可以当空索引继续，后者必须中止，
 *    否则一次网络抖动就会把平台目录写成只剩本数据集。
 *
 * 纯函数（无 I/O、无 wrangler 调用），便于单测：`tests/publish-preset-pack.test.ts`。
 */

/** R2 对象不存在时 wrangler 的典型文案（只认这些，其余一律当错误）。 */
const MISSING_PATTERNS = [
  /the specified key does not exist/i,
  /nosuchkey/i,
  /key not found/i,
  /object not found/i,
];

/**
 * 判断一段 wrangler 错误文本是不是「对象不存在」。
 * 只有明确的不存在才返回 true；鉴权失败、网络错误、5xx、解析失败一律 false（调用方必须抛出）。
 */
export function isMissingObjectError(text) {
  const value = String(text ?? "");
  return MISSING_PATTERNS.some((pattern) => pattern.test(value));
}

/** 固定 slug 码位升序（与 `src/r2/catalog.ts` 的 `datasets.sort()` 保持一致）。 */
export function sortBySlug(list) {
  return list.slice().sort((a, b) => (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));
}

/**
 * 目录索引的 upsert：保留其他数据集条目，只替换同 slug 的那一条，再按 slug 排序。
 * `existing` 允许为 null（首次创建）。结构不合法时抛错——**绝不**在结构不合法时重建。
 */
export function upsertCatalog(existing, entry, generatedAt) {
  const datasets = normalizeDatasets(existing, "index.json");
  const next = datasets.filter((item) => item.slug !== entry.slug);
  next.push(entry);
  return { generatedAt, datasets: sortBySlug(next) };
}

/**
 * 全局搜索索引的 upsert：同样的合并语义（保留其他数据集文档，替换同 slug）。
 */
export function upsertSearchIndex(existing, doc, generatedAt) {
  const datasets = normalizeDatasets(existing, "search/index.json");
  const next = datasets.filter((item) => item.slug !== doc.slug);
  next.push(doc);
  return { generatedAt, datasets: sortBySlug(next) };
}

function normalizeDatasets(existing, label) {
  if (existing === null || existing === undefined) return [];
  if (typeof existing !== "object" || Array.isArray(existing)) {
    throw new Error(`${label} 结构不合法（不是对象），已中止：不允许覆盖平台索引`);
  }
  const datasets = existing.datasets;
  if (datasets === undefined) return [];
  if (!Array.isArray(datasets)) {
    throw new Error(`${label} 的 datasets 不是数组，已中止：不允许覆盖平台索引`);
  }
  return datasets;
}
