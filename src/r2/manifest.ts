import { manifestKey } from "./keys";
import { putReplaceable } from "./store";

export interface ManifestDataVersion {
  version: string;
  publishedAt: string;
  isLatest: boolean;
  isPreview: boolean;
}

export interface Manifest {
  slug: string;
  title: string;
  schema: {
    version: string;
    url: string;
  };
  dataVersions: ManifestDataVersion[];
  latest: string | null;
  preview: string | null;
  updatedAt: string;
}

export interface ManifestInput {
  slug: string;
  title: string;
  schemaVersion: string;
  dataVersions?: ManifestDataVersion[];
  latest?: string | null;
  preview?: string | null;
}

export function buildManifest(input: ManifestInput): Manifest {
  return {
    slug: input.slug,
    title: input.title,
    schema: {
      version: input.schemaVersion,
      url: `/schemas/${input.slug}/${input.schemaVersion}.json`,
    },
    dataVersions: (input.dataVersions ?? [])
      .slice()
      .sort((a, b) => a.version.localeCompare(b.version, undefined, { numeric: true })),
    latest: input.latest ?? null,
    preview: input.preview ?? null,
    updatedAt: new Date().toISOString(),
  };
}

export async function writeManifest(bucket: R2Bucket, manifest: Manifest): Promise<void> {
  await putReplaceable(bucket, manifestKey(manifest.slug), manifest);
}
