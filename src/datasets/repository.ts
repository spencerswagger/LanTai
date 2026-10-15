import type { Env } from "../env";
import { auditStatement } from "../lib/audit";
import { ConflictError, NotFoundError } from "../lib/errors";
import { newId, nowIso } from "../lib/ids";

export interface DatasetRow {
  id: string;
  slug: string;
  title: string;
  current_schema_version: string | null;
  current_data_version?: string | null;
  current_preview_version?: string | null;
  created_at: string;
}

export interface SchemaVersionRow {
  id: string;
  dataset_id: string;
  version: string;
  json_schema: string;
  status: string;
  created_at: string;
}

export const FIRST_VERSION = "1.0.0";

export async function getDatasetById(env: Env, id: string): Promise<DatasetRow> {
  const row = await env.DB.prepare("SELECT * FROM dataset WHERE id = ?")
    .bind(id)
    .first<DatasetRow>();
  if (!row) throw new NotFoundError("dataset_not_found", `数据集不存在：${id}`);
  return row;
}

export async function getDatasetBySlug(env: Env, slug: string): Promise<DatasetRow | null> {
  return env.DB.prepare("SELECT * FROM dataset WHERE slug = ?").bind(slug).first<DatasetRow>();
}

export async function listDatasets(env: Env): Promise<DatasetRow[]> {
  const result = await env.DB.prepare("SELECT * FROM dataset ORDER BY slug ASC").all<DatasetRow>();
  return result.results ?? [];
}

export async function getSchemaVersion(
  env: Env,
  datasetId: string,
  version: string,
): Promise<SchemaVersionRow> {
  const row = await env.DB.prepare(
    "SELECT * FROM schema_version WHERE dataset_id = ? AND version = ?",
  )
    .bind(datasetId, version)
    .first<SchemaVersionRow>();
  if (!row) {
    throw new NotFoundError("schema_version_not_found", `Schema 版本不存在：${version}`);
  }
  return row;
}

export async function listSchemaVersions(env: Env, datasetId: string): Promise<SchemaVersionRow[]> {
  const result = await env.DB.prepare(
    "SELECT * FROM schema_version WHERE dataset_id = ? ORDER BY created_at ASC",
  )
    .bind(datasetId)
    .all<SchemaVersionRow>();
  return result.results ?? [];
}

export interface CreateDatasetInput {
  slug: string;
  title: string;
  schema: unknown;
  actor: string | null;
}

export async function createDataset(env: Env, input: CreateDatasetInput): Promise<DatasetRow> {
  const existing = await getDatasetBySlug(env, input.slug);
  if (existing) {
    throw new ConflictError("slug_exists", `slug 已被占用：${input.slug}`, { slug: input.slug });
  }
  const datasetId = newId();
  const createdAt = nowIso();
  const dataset: DatasetRow = {
    id: datasetId,
    slug: input.slug,
    title: input.title,
    current_schema_version: null,
    current_data_version: null,
    current_preview_version: null,
    created_at: createdAt,
  };
  await env.DB.batch([
    env.DB.prepare(
      "INSERT INTO dataset (id, slug, title, current_schema_version, created_at) VALUES (?, ?, ?, NULL, ?)",
    ).bind(datasetId, input.slug, input.title, createdAt),
    env.DB.prepare(
      "INSERT INTO schema_version (id, dataset_id, version, json_schema, status, created_at) VALUES (?, ?, ?, ?, 'draft', ?)",
    ).bind(newId(), datasetId, FIRST_VERSION, JSON.stringify(input.schema), createdAt),
    auditStatement(env.DB, {
      actor: input.actor,
      action: "dataset.register",
      target: input.slug,
      detail: { version: FIRST_VERSION },
    }),
  ]);
  return dataset;
}

export interface AddSchemaVersionInput {
  datasetId: string;
  version: string;
  schema: unknown;
  actor: string | null;
}

export async function addSchemaVersion(
  env: Env,
  input: AddSchemaVersionInput,
): Promise<SchemaVersionRow> {
  const dataset = await getDatasetById(env, input.datasetId);
  const duplicate = await env.DB.prepare(
    "SELECT id FROM schema_version WHERE dataset_id = ? AND version = ?",
  )
    .bind(input.datasetId, input.version)
    .first<{ id: string }>();
  if (duplicate) {
    throw new ConflictError("schema_version_exists", `Schema 版本已存在：${input.version}`);
  }
  const row: SchemaVersionRow = {
    id: newId(),
    dataset_id: input.datasetId,
    version: input.version,
    json_schema: JSON.stringify(input.schema),
    status: "draft",
    created_at: nowIso(),
  };
  await env.DB.batch([
    env.DB.prepare(
      "INSERT INTO schema_version (id, dataset_id, version, json_schema, status, created_at) VALUES (?, ?, ?, ?, 'draft', ?)",
    ).bind(row.id, row.dataset_id, row.version, row.json_schema, row.created_at),
    auditStatement(env.DB, {
      actor: input.actor,
      action: "schema.version.add",
      target: `${dataset.slug}@${input.version}`,
    }),
  ]);
  return row;
}
