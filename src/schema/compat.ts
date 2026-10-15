import { BadRequestError } from "../lib/errors";

export type ChangeKind = "initial" | "compatible" | "breaking";

export interface Semver {
  major: number;
  minor: number;
  patch: number;
}

export function parseVersion(version: string): Semver | null {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) return null;
  return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]) };
}

export function formatVersion(v: Semver): string {
  return `${v.major}.${v.minor}.${v.patch}`;
}

export function compareVersions(a: string, b: string): number {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  if (!pa || !pb) return a.localeCompare(b);
  return pa.major - pb.major || pa.minor - pb.minor || pa.patch - pb.patch;
}

export function bumpVersion(current: string | null, kind: ChangeKind): string {
  if (current === null || kind === "initial") return "1.0.0";
  const parsed = parseVersion(current);
  if (!parsed) throw new BadRequestError("invalid_version", `当前版本号非法：${current}`);
  if (kind === "compatible") {
    return formatVersion({ major: parsed.major, minor: parsed.minor + 1, patch: 0 });
  }
  return formatVersion({ major: parsed.major + 1, minor: 0, patch: 0 });
}

interface ObjectSchema {
  type?: string;
  properties?: Record<string, unknown>;
  required?: string[];
  enum?: unknown[];
}

function asObjectSchema(schema: unknown): ObjectSchema {
  return (schema ?? {}) as ObjectSchema;
}

/**
 * 判定两个 JSON Schema 之间的变更是"兼容"还是"破坏性"。
 * 规则（对应父设计"Schema 演进三条规则"）：
 *  - 删除字段、改类型、新增必填字段、收窄 enum → 破坏性
 *  - 新增可选字段、放宽 enum → 兼容
 */
export function classifyChange(prev: unknown, next: unknown): Exclude<ChangeKind, "initial"> {
  const p = asObjectSchema(prev);
  const n = asObjectSchema(next);

  if (p.type !== n.type) return "breaking";

  if (p.enum !== undefined || n.enum !== undefined) {
    const prevEnum = new Set((p.enum ?? []).map((v) => JSON.stringify(v)));
    const nextEnum = new Set((n.enum ?? []).map((v) => JSON.stringify(v)));
    if (n.enum !== undefined && p.enum === undefined) return "breaking";
    for (const value of prevEnum) {
      if (!nextEnum.has(value)) return "breaking";
    }
  }

  const prevRequired = new Set(p.required ?? []);
  const nextRequired = new Set(n.required ?? []);
  const prevProps = p.properties ?? {};
  const nextProps = n.properties ?? {};

  for (const key of Object.keys(prevProps)) {
    if (!(key in nextProps)) return "breaking";
    if (classifyChange(prevProps[key], nextProps[key]) === "breaking") return "breaking";
  }

  for (const key of Object.keys(nextProps)) {
    if (key in prevProps) continue;
    if (nextRequired.has(key) && !prevRequired.has(key)) return "breaking";
  }

  for (const key of nextRequired) {
    if (!prevRequired.has(key) && key in prevProps) return "breaking";
  }

  return "compatible";
}
