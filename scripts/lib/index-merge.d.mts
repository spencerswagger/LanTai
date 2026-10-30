/** `scripts/lib/index-merge.mjs` 的类型声明。 */

export interface IndexEntry {
  slug: string;
  [key: string]: unknown;
}

export interface PlatformIndex {
  generatedAt: string;
  datasets: IndexEntry[];
}

export function isMissingObjectError(text: unknown): boolean;

export function sortBySlug<T extends { slug: string }>(list: T[]): T[];

export function upsertCatalog(
  existing: PlatformIndex | null,
  entry: IndexEntry,
  generatedAt: string,
): PlatformIndex;

export function upsertSearchIndex(
  existing: PlatformIndex | null,
  doc: IndexEntry,
  generatedAt: string,
): PlatformIndex;
