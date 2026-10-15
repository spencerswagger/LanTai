-- P2 · 数据发布 · D1 数据版本与指针字段
-- 事实源：dataset 指针字段 + data_version（数据集级不可变快照编目）

ALTER TABLE dataset ADD COLUMN current_data_version TEXT;
ALTER TABLE dataset ADD COLUMN current_preview_version TEXT;
ALTER TABLE dataset ADD COLUMN updated_at TEXT;

CREATE TABLE IF NOT EXISTS data_version (
  id TEXT PRIMARY KEY,
  dataset_id TEXT NOT NULL,
  version TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  source_submission_id TEXT,
  status TEXT NOT NULL DEFAULT 'published',
  published_at TEXT NOT NULL,
  UNIQUE (dataset_id, version)
);

CREATE INDEX IF NOT EXISTS idx_data_version_dataset ON data_version (dataset_id);
CREATE INDEX IF NOT EXISTS idx_data_version_status ON data_version (status);
