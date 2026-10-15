import { getDatasetById, getSchemaVersion, listDatasets } from "../datasets/repository";
import type { Env } from "../env";
import { nowIso } from "../lib/ids";
import { datasetSearchIndexKey, SEARCH_INDEX_KEY } from "../r2/keys";
import { putReplaceable } from "../r2/store";

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
}

export interface GlobalSearchIndex {
  generatedAt: string;
  datasets: SearchDoc[];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/**
 * 从冻结 Schema 的 properties 提取字段元数据（仅字段名/标题/类型，不索引 payload 值）。
 */
function fieldsFromSchema(schemaJson: string): SearchField[] {
  const root = asRecord(JSON.parse(schemaJson));
  const properties = root ? asRecord(root.properties) : null;
  if (!properties) return [];
  return Object.keys(properties).map((name) => {
    const prop = asRecord(properties[name]);
    const title = prop && typeof prop.title === "string" ? prop.title : null;
    const type = prop && typeof prop.type === "string" ? prop.type : null;
    return { name, title, type };
  });
}

/**
 * 为单个数据集构建静态搜索文档：带当前 Schema / 数据版本与冻结字段元数据。
 */
export async function buildDatasetSearchDoc(env: Env, datasetId: string): Promise<SearchDoc> {
  const dataset = await getDatasetById(env, datasetId);
  let fields: SearchField[] = [];
  if (dataset.current_schema_version) {
    const schemaRow = await getSchemaVersion(env, datasetId, dataset.current_schema_version);
    fields = fieldsFromSchema(schemaRow.json_schema);
  }
  return {
    slug: dataset.slug,
    title: dataset.title,
    schemaVersion: dataset.current_schema_version ?? null,
    dataVersion: dataset.current_data_version ?? null,
    fields,
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
