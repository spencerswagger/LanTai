-- P4 · 审阅预览与合并 · 审阅字段
-- 在 submission 上补充审阅生命周期字段：驳回原因、审阅人、预发布时间、正式发布时间。
-- 约定：payload 仍为唯一内容载体；此处仅记录状态迁移的元数据。

ALTER TABLE submission ADD COLUMN reject_reason TEXT;
ALTER TABLE submission ADD COLUMN reviewed_by TEXT;
ALTER TABLE submission ADD COLUMN staged_at TEXT;
ALTER TABLE submission ADD COLUMN published_at TEXT;
