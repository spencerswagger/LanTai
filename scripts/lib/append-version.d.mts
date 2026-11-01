/** `scripts/lib/append-version.mjs` 的类型声明。 */

export interface DataVersionLike {
  version: string | number;
}

export function nextDataVersion(versions: DataVersionLike[] | string[] | null): string;

export function isNoopReplay(
  latestPointer: { contentHash?: string } | null | undefined,
  contentHash: string,
): boolean;

export interface ManifestLike {
  slug?: string;
  title?: string;
  schema?: { version: string; url: string };
  dataVersions?: { version: string; publishedAt: string; isLatest: boolean; isPreview: boolean }[];
  latest?: string | null;
  preview?: string | null;
  updatedAt?: string;
  [key: string]: unknown;
}

export function buildNextManifest(
  existing: ManifestLike | null,
  input: { version: string; schemaVersion: string; publishedAt: string; title?: string },
): ManifestLike;
