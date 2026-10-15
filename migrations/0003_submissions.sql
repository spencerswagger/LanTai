-- P3 · 匿名贡献与通知 · 提交表
-- 事实源：submission（匿名提交与追踪令牌）
-- 约定：token 唯一，payload 以 JSON 文本存储，状态迁移由应用层保证

CREATE TABLE IF NOT EXISTS submission (
  id TEXT PRIMARY KEY,
  dataset_id TEXT NOT NULL,
  slug TEXT NOT NULL,
  schema_version TEXT NOT NULL,
  status TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  payload TEXT NOT NULL,
  contact_email TEXT,
  source_ip_hash TEXT,
  staged_version TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_submission_dataset ON submission (dataset_id);
CREATE INDEX IF NOT EXISTS idx_submission_status ON submission (status);
