/** `scripts/lib/preflight.mjs` 的类型声明。 */

export const SLUG_PATTERN: string;

export function isValidSlug(slug: unknown): boolean;

export interface GitStatusSummary {
  dirty: boolean;
  paths: string[];
  blocking: string[];
}

export function parseGitStatus(text: string, ignored?: string[]): GitStatusSummary;

export interface DriftResult {
  drifted: boolean;
  reason: string | null;
}

export function indexDrift(expected: unknown, actual: unknown): DriftResult;
