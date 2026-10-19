import { PLATFORM_INDEX_KEY } from "./keys";
import { putReplaceable, readJson } from "./store";

/**
 * 目录索引条目（R3/R7）：键集白名单 —— 不得出现任何 payload 值（R6）。
 * `hasData` 表示该数据集是否已发布过数据；为 false 时 `currentDataVersion` 必为 null，
 * 首页据此显式渲染「尚无数据」（注册 ≠ 数据）。
 */
export interface CatalogEntry {
  slug: string;
  title: string;
  currentSchemaVersion: string | null;
  currentDataVersion: string | null;
  hasData: boolean;
  updatedAt: string;
}

export interface CatalogIndex {
  generatedAt: string;
  datasets: CatalogEntry[];
}

export const EMPTY_CATALOG: CatalogIndex = { generatedAt: "", datasets: [] };

export async function readCatalog(bucket: R2Bucket): Promise<CatalogIndex> {
  return (await readJson<CatalogIndex>(bucket, PLATFORM_INDEX_KEY)) ?? EMPTY_CATALOG;
}

export async function upsertCatalogEntry(
  bucket: R2Bucket,
  entry: CatalogEntry,
): Promise<CatalogIndex> {
  const existing = await readCatalog(bucket);
  const datasets = existing.datasets.filter((d) => d.slug !== entry.slug);
  datasets.push(entry);
  datasets.sort((a, b) => a.slug.localeCompare(b.slug));
  const next: CatalogIndex = { generatedAt: new Date().toISOString(), datasets };
  await putReplaceable(bucket, PLATFORM_INDEX_KEY, next);
  return next;
}
