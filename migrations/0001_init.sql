-- P1 · 基础与编目 · D1 初始表结构
-- 事实源：dataset / schema_version / audit_log
-- 约定：schema_version 发布即冻结（只 INSERT 不 UPDATE 语义由应用层保证）

CREATE TABLE IF NOT EXISTS dataset (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  current_schema_version TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS schema_version (
  id TEXT PRIMARY KEY,
  dataset_id TEXT NOT NULL,
  version TEXT NOT NULL,
  json_schema TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (dataset_id, version)
);

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  actor TEXT,
  action TEXT NOT NULL,
  target TEXT,
  detail TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_schema_version_dataset ON schema_version (dataset_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log (created_at);
