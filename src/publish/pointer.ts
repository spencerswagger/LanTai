import { latestPointerKey, previewPointerKey } from "../r2/keys";
import { putReplaceable, readJson } from "../r2/store";

export interface LatestPointer {
  dataset: string;
  dataVersion: string;
  schemaVersion: string;
  publishedAt: string;
  contentHash: string;
}

export interface PreviewPointer {
  dataset: string;
  dataVersion: string;
  schemaVersion: string;
  stagedAt: string;
  nonProduction: true;
}

export async function writeLatestPointer(
  bucket: R2Bucket,
  slug: string,
  pointer: LatestPointer,
): Promise<void> {
  await putReplaceable(bucket, latestPointerKey(slug), pointer);
}

export async function writePreviewPointer(
  bucket: R2Bucket,
  slug: string,
  pointer: PreviewPointer,
): Promise<void> {
  await putReplaceable(bucket, previewPointerKey(slug), pointer);
}

export function readLatestPointer(bucket: R2Bucket, slug: string): Promise<LatestPointer | null> {
  return readJson<LatestPointer>(bucket, latestPointerKey(slug));
}

export function readPreviewPointer(bucket: R2Bucket, slug: string): Promise<PreviewPointer | null> {
  return readJson<PreviewPointer>(bucket, previewPointerKey(slug));
}
