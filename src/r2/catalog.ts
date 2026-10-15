import { PLATFORM_INDEX_KEY } from "./keys";
import { putReplaceable, readJson } from "./store";

export interface CatalogEntry {
  slug: string;
  title: string;
  currentSchemaVersion: string | null;
  currentDataVersion?: string | null;
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
