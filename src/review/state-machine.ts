import { ConflictError } from "../lib/errors";

export type SubmissionStatus = "pending" | "staged" | "published" | "rejected";

/**
 * 终态集合：进入后不可再迁移。published / rejected 均为终态。
 */
export const TERMINAL: Set<SubmissionStatus> = new Set<SubmissionStatus>(["published", "rejected"]);

/**
 * 合法迁移表。pending 可预发布或驳回；staged 可正式发布或驳回；
 * 终态无出边。
 */
const ALLOWED: Record<SubmissionStatus, SubmissionStatus[]> = {
  pending: ["staged", "rejected"],
  staged: ["published", "rejected"],
  published: [],
  rejected: [],
};

export function canTransition(from: SubmissionStatus, to: SubmissionStatus): boolean {
  if (TERMINAL.has(from)) return false;
  return (ALLOWED[from] ?? []).includes(to);
}

export function assertTransition(from: SubmissionStatus, to: SubmissionStatus): void {
  if (!canTransition(from, to)) {
    throw new ConflictError("illegal_transition", `非法状态迁移：${from} → ${to}`, { from, to });
  }
}
