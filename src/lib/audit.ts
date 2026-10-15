import { newId, nowIso } from "./ids";

export interface AuditEvent {
  actor?: string | null;
  action: string;
  target?: string | null;
  detail?: unknown;
}

/**
 * 构造一条审计写入语句。返回 PreparedStatement，便于与其它写入合并进同一批事务，
 * 满足"每次状态迁移与审阅动作均落审计"的约束。
 */
export function auditStatement(db: D1Database, event: AuditEvent): D1PreparedStatement {
  return db
    .prepare(
      "INSERT INTO audit_log (id, actor, action, target, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .bind(
      newId(),
      event.actor ?? null,
      event.action,
      event.target ?? null,
      event.detail === undefined ? null : JSON.stringify(event.detail),
      nowIso(),
    );
}

export async function recordAudit(db: D1Database, event: AuditEvent): Promise<void> {
  await auditStatement(db, event).run();
}
