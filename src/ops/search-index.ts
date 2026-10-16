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

/**
 * 全局索引中的数据集条目：不再内联完整 terms（体积过大），仅保留元数据与 termCount。
 * termCount 为该数据集 per-dataset 索引中 terms 的总数，供前端展示规模。
 */
export type GlobalSearchDoc = Omit<SearchDoc, "terms"> & { termCount: number };

export interface GlobalSearchIndex {
  generatedAt: string;
  datasets: GlobalSearchDoc[];
}

/**
 * 单数据集索引的规模上限，避免极端数据量下索引失控。
 * 取值 60000 以支撑约 10x 目标数据量（如 district_tree≈4.6 万个 name 仍可全量入索引）。
 */
const MAX_TERMS = 60000;
const MAX_TERM_LENGTH = 500;

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/**
 * 递归收集快照中的可检索文本，分两阶段以优先保障名称类字符串：
 *  - 阶段一：收集全部字符串 term（trim、去重、单条≤MAX_TERM_LENGTH），保证深层 name 不被挤掉；
 *  - 阶段二：预算（MAX_TERMS）尚有余额时再收数字，避免 id / level 等数字占满条目。
 * null / boolean / 空串跳过。
 */
export function collectTerms(value: unknown, out: Set<string>): void {
  const numbers = new Set<string>();
  collectStringTerms(value, out, numbers);
  for (const number of numbers) {
    if (out.size >= MAX_TERMS) break;
    out.add(number);
  }
}

/** 阶段一：收集字符串；同时把数字暂存到 numbers，留待阶段二按剩余预算补录。 */
function collectStringTerms(value: unknown, out: Set<string>, numbers: Set<string>): void {
  if (typeof value === "string") {
    const text = value.trim();
    if (text !== "" && out.size < MAX_TERMS) {
      out.add(text.length > MAX_TERM_LENGTH ? text.slice(0, MAX_TERM_LENGTH) : text);
    }
    return;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    numbers.add(String(value));
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      collectStringTerms(item, out, numbers);
    }
    return;
  }
  const record = asRecord(value);
  if (record) {
    for (const key of Object.keys(record)) {
      collectStringTerms(record[key], out, numbers);
    }
  }
}

/**
 * 从冻结 Schema 提取字段元数据（仅字段名/标题/类型；数据值由 collectTerms 另行索引）。
 * 对象型数据集取根 `properties`；列表型数据集（根为 array）取 `items.properties`。
 * 支持本地 `$ref`（形如 `#/$defs/node`、`#/definitions/node`）：根为 array 时解析 `items.$ref`，
 * 否则解析根 `$ref`，仅解析一跳后取其 `properties`；解析不到返回空数组。
 */
export function fieldsFromSchema(schemaJson: string): SearchField[] {
  const root = asRecord(JSON.parse(schemaJson));
  if (!root) return [];
  const container = resolveSchemaContainer(root);
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
 * 定位承载 `properties` 的 Schema 节点：根为 array 时取 `items`（`items.$ref` 则解析）；
 * 否则根若为 `$ref` 亦解析。仅解析一跳，避免节点内 `children` 等自引用造成循环。
 */
function resolveSchemaContainer(root: Record<string, unknown>): Record<string, unknown> | null {
  if (root.type === "array") {
    const items = asRecord(root.items);
    if (!items) return null;
    return typeof items.$ref === "string" ? resolveLocalRef(root, items.$ref) : items;
  }
  if (typeof root.$ref === "string") {
    return resolveLocalRef(root, root.$ref);
  }
  return root;
}

/**
 * 解析文档内的本地 JSON Pointer 引用（`#/$defs/node`、`#/definitions/node`）。
 * 非本地引用或路径不存在时返回 null。
 */
function resolveLocalRef(
  root: Record<string, unknown>,
  ref: string,
): Record<string, unknown> | null {
  if (!ref.startsWith("#/")) return null;
  let current: unknown = root;
  for (const segment of ref.slice(2).split("/")) {
    const node = asRecord(current);
    if (!node) return null;
    const key = segment.replace(/~1/g, "/").replace(/~0/g, "~");
    current = node[key];
  }
  return asRecord(current);
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
 * 重建全局搜索索引：遍历全部数据集刷新各自完整 per-dataset 索引，
 * 再把全局索引 `search/index.json` 写为精简形状（每个条目仅含元数据 + termCount，不内联 terms）。
 */
export async function rebuildGlobalSearchIndex(env: Env): Promise<{ count: number }> {
  const datasets = await listDatasets(env);
  const docs: GlobalSearchDoc[] = [];
  for (const dataset of datasets) {
    const { terms, ...meta } = await writeDatasetSearchIndex(env, dataset.id);
    docs.push({ ...meta, termCount: terms.length });
  }
  const index: GlobalSearchIndex = { generatedAt: nowIso(), datasets: docs };
  await putReplaceable(env.BUCKET, SEARCH_INDEX_KEY, index);
  return { count: docs.length };
}
