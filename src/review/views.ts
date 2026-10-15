import { getSchemaVersion } from "../datasets/repository";
import type { Env } from "../env";
import { readLatestPointer } from "../publish/pointer";
import { dataSnapshotKey } from "../r2/keys";
import { readJson } from "../r2/store";
import { getSubmissionById } from "../submissions/repository";
import { type DiffEntry, diffJson, isPlainObject } from "./diff";

export interface ReviewSubmissionSummary {
  id: string;
  slug: string;
  datasetId: string;
  status: string;
  schemaVersion: string;
  createdAt: string;
  hasEmail: boolean;
}

export interface RenderField {
  key: string;
  title: string;
  type: string;
  value: unknown;
  children?: RenderField[];
}

export interface ReviewViews {
  submission: ReviewSubmissionSummary;
  schema: unknown;
  render: RenderField[];
  jsonTree: unknown;
  diff: DiffEntry[];
  diffBase: "latest-published";
  current: unknown;
}

function schemaTypeOf(schema: unknown, fallback: unknown): string {
  if (isPlainObject(schema) && typeof schema.type === "string") return schema.type;
  if (Array.isArray(fallback)) return "array";
  return typeof fallback;
}

function titleOf(schema: unknown, fallback: string): string {
  if (isPlainObject(schema) && typeof schema.title === "string" && schema.title.trim() !== "") {
    return schema.title;
  }
  return fallback;
}

function renderField(key: string, schema: unknown, value: unknown): RenderField {
  const type = schemaTypeOf(schema, value);
  const field: RenderField = { key, title: titleOf(schema, key), type, value: null };

  if (type === "object" && isPlainObject(value)) {
    const props =
      isPlainObject(schema) && isPlainObject(schema.properties) ? schema.properties : {};
    field.children = Object.keys(value).map((childKey) =>
      renderField(childKey, props[childKey], value[childKey]),
    );
    return field;
  }

  if (type === "array" && Array.isArray(value)) {
    const items = isPlainObject(schema) && isPlainObject(schema.items) ? schema.items : undefined;
    field.children = value.map((item, index) => renderField(`[${index}]`, items, item));
    return field;
  }

  field.value = value;
  return field;
}

/**
 * 依据冻结 Schema 的 property title/type 生成结构化只读渲染描述。
 * 对象/数组递归降为字段列表；叶子保留原始值。
 */
export function buildRender(schema: unknown, payload: unknown): RenderField[] {
  const root = isPlainObject(schema) ? schema : {};
  const type = typeof root.type === "string" ? root.type : undefined;

  if (type === "array" && Array.isArray(payload)) {
    const items = isPlainObject(root.items) ? root.items : undefined;
    return payload.map((item, index) => renderField(`[${index}]`, items, item));
  }

  if (isPlainObject(payload)) {
    const props = isPlainObject(root.properties) ? root.properties : {};
    return Object.keys(payload).map((key) => renderField(key, props[key], payload[key]));
  }

  return [renderField("", root, payload)];
}

/**
 * 装配审阅三视图：提交元数据、候选 payload（JSON 树）、冻结 Schema、
 * 当前已发布快照与二者 diff，以及结构化只读渲染描述。
 */
export async function buildReviewViews(env: Env, submissionId: string): Promise<ReviewViews> {
  const submission = await getSubmissionById(env, submissionId);
  const schemaRow = await getSchemaVersion(env, submission.dataset_id, submission.schema_version);
  const schema = JSON.parse(schemaRow.json_schema) as unknown;
  const candidate = JSON.parse(submission.payload) as unknown;

  const pointer = await readLatestPointer(env.BUCKET, submission.slug);
  const current = pointer
    ? await readJson<unknown>(env.BUCKET, dataSnapshotKey(submission.slug, pointer.dataVersion))
    : null;

  return {
    submission: {
      id: submission.id,
      slug: submission.slug,
      datasetId: submission.dataset_id,
      status: submission.status,
      schemaVersion: submission.schema_version,
      createdAt: submission.created_at,
      hasEmail: submission.contact_email !== null && submission.contact_email.trim() !== "",
    },
    schema,
    render: buildRender(schema, candidate),
    jsonTree: candidate,
    diff: diffJson(current, candidate),
    diffBase: "latest-published",
    current,
  };
}
