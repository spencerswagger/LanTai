import { getDatasetById, getSchemaVersion, listDatasets } from "../datasets/repository";
import type { Env } from "../env";
import { nowIso } from "../lib/ids";
import { dataSnapshotKey, datasetSearchIndexKey, SEARCH_INDEX_KEY } from "../r2/keys";
import { putReplaceable, readJson } from "../r2/store";

export interface SearchField {
  name: string;
  title: string | null;
  type: string | null;
}

export interface SearchDoc {
  slug: string;
  title: string;
  schemaVersion: string | null;
  dataVersion: string | null;
  fields: SearchField[];
  /** 由最新已发布快照递归提取的文本值，用于「数据正文」检索。 */
  terms: string[];
}

export interface GlobalSearchIndex {
  generatedAt: string;
  datasets: SearchDoc[];
}

/** 单数据集索引的规模上限，避免极端数据量下索引失控。 */
const MAX_TERMS = 2000;
const MAX_TERM_LENGTH = 500;

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/**
 * 递归收集快照中的可检索文本：字符串原样收录，数字转字符串；
 * 去重并按总项数 / 单项长度设上限。null / boolean / 空串跳过。
 */
function collectTerms(value: unknown, out: Set<string>): void {
  if (out.size >= MAX_TERMS) return;
  if (typeof value === "string") {
    const text = value.trim();
    if (text !== "") {
      out.add(text.length > MAX_TERM_LENGTH ? text.slice(0, MAX_TERM_LENGTH) : text);
    }
    return;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    out.add(String(value));
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      collectTerms(item, out);
      if (out.size >= MAX_TERMS) return;
    }
    return;
  }
  const record = asRecord(value);
  if (record) {
    for (const key of Object.keys(record)) {
      collectTerms(record[key], out);
      if (out.size >= MAX_TERMS) return;
    }
  }
}

/**
 * 从冻结 Schema 提取字段元数据（仅字段名/标题/类型；数据值由 collectTerms 另行索引）。
 * 对象型数据集取根 `properties`；列表型数据集（根为 array）取 `items.properties`。
 */
function fieldsFromSchema(schemaJson: string): SearchField[] {
  const root = asRecord(JSON.parse(schemaJson));
  if (!root) return [];
  const container = root.type === "array" ? asRecord(root.items) : root;
  const properties = container ? asRecord(container.properties) : null;
  if (!properties) return [];
  return Object.keys(properties).map((name) => {
    const prop = asRecord(properties[name]);
    const title = prop && typeof prop.title === "string" ? prop.title : null;
    const type = prop && typeof prop.type === "string" ? prop.type : null;
    return { name, title, type };
  });
}

/**
 * 为单个数据集构建静态搜索文档：带当前 Schema / 数据版本、冻结字段元数据，
 * 以及由最新已发布快照提取的文本值（供「数据正文」检索）。
 */
export async function buildDatasetSearchDoc(env: Env, datasetId: string): Promise<SearchDoc> {
  const dataset = await getDatasetById(env, datasetId);
  let fields: SearchField[] = [];
  if (dataset.current_schema_version) {
    const schemaRow = await getSchemaVersion(env, datasetId, dataset.current_schema_version);
    fields = fieldsFromSchema(schemaRow.json_schema);
  }

  let terms: string[] = [];
  if (dataset.current_data_version) {
    const snapshot = await readJson<unknown>(
      env.BUCKET,
      dataSnapshotKey(dataset.slug, dataset.current_data_version),
    );
    if (snapshot !== null) {
      const collected = new Set<string>();
      collectTerms(snapshot, collected);
      terms = Array.from(collected);
    }
  }

  return {
    slug: dataset.slug,
    title: dataset.title,
    schemaVersion: dataset.current_schema_version ?? null,
    dataVersion: dataset.current_data_version ?? null,
    fields,
    terms,
  };
}

/**
 * 生成并写入单数据集搜索索引（`{slug}/search-index.json`）。
 */
export async function writeDatasetSearchIndex(env: Env, datasetId: string): Promise<SearchDoc> {
  const doc = await buildDatasetSearchDoc(env, datasetId);
  await putReplaceable(env.BUCKET, datasetSearchIndexKey(doc.slug), doc);
  return doc;
}

/**
 * 重建全局搜索索引：遍历全部数据集刷新各自索引，并写 `search/index.json`。
 */
export async function rebuildGlobalSearchIndex(env: Env): Promise<{ count: number }> {
  const datasets = await listDatasets(env);
  const docs: SearchDoc[] = [];
  for (const dataset of datasets) {
    docs.push(await writeDatasetSearchIndex(env, dataset.id));
  }
  const index: GlobalSearchIndex = { generatedAt: nowIso(), datasets: docs };
  await putReplaceable(env.BUCKET, SEARCH_INDEX_KEY, index);
  return { count: docs.length };
}
