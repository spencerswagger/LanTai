import { stableStringify } from "../lib/stable-json";

export interface DiffEntry {
  path: string;
  kind: "added" | "removed" | "changed";
  before?: unknown;
  after?: unknown;
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function escapePointerSegment(segment: string): string {
  return segment.replace(/~/g, "~0").replace(/\//g, "~1");
}

function joinPointer(basePath: string, segment: string): string {
  return `${basePath}/${escapePointerSegment(segment)}`;
}

function equal(before: unknown, after: unknown): boolean {
  return stableStringify(before) === stableStringify(after);
}

function diffValue(before: unknown, after: unknown, path: string): DiffEntry[] {
  if (isPlainObject(before) && isPlainObject(after)) {
    const entries: DiffEntry[] = [];
    const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
    for (const key of keys) {
      const childPath = joinPointer(path, key);
      const inBefore = Object.hasOwn(before, key);
      const inAfter = Object.hasOwn(after, key);
      if (inBefore && !inAfter) {
        entries.push({ path: childPath, kind: "removed", before: before[key] });
      } else if (!inBefore && inAfter) {
        entries.push({ path: childPath, kind: "added", after: after[key] });
      } else {
        entries.push(...diffValue(before[key], after[key], childPath));
      }
    }
    return entries;
  }

  if (Array.isArray(before) && Array.isArray(after)) {
    const entries: DiffEntry[] = [];
    const length = Math.max(before.length, after.length);
    for (let index = 0; index < length; index += 1) {
      const childPath = joinPointer(path, String(index));
      if (index >= after.length) {
        entries.push({ path: childPath, kind: "removed", before: before[index] });
      } else if (index >= before.length) {
        entries.push({ path: childPath, kind: "added", after: after[index] });
      } else {
        entries.push(...diffValue(before[index], after[index], childPath));
      }
    }
    return entries;
  }

  if (!equal(before, after)) {
    return [{ path, kind: "changed", before, after }];
  }
  return [];
}

/**
 * 递归比较两份 JSON，产出叶子级差异。路径使用 JSON Pointer（`/a/b`），
 * 基准显式为单位置 `""`。对象按键并集、数组按索引比较，原始值不等记为 changed。
 */
export function diffJson(before: unknown, after: unknown, basePath = ""): DiffEntry[] {
  return diffValue(before, after, basePath);
}
