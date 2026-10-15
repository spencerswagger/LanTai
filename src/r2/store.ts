import { ConflictError } from "../lib/errors";
import { cacheControlForKey } from "./keys";

export interface StoredObject {
  key: string;
  cacheControl: string;
  contentType: string;
}

const JSON_CONTENT_TYPE = "application/json; charset=utf-8";

export async function readJson<T>(bucket: R2Bucket, key: string): Promise<T | null> {
  const object = await bucket.get(key);
  if (!object) return null;
  return JSON.parse(await object.text()) as T;
}

/**
 * 写入不可变发布物：同路径已存在时拒绝覆盖（发布即不可变的底层保障）。
 */
export async function putImmutable(
  bucket: R2Bucket,
  key: string,
  value: unknown,
): Promise<StoredObject> {
  const existing = await bucket.head(key);
  if (existing) {
    throw new ConflictError("immutable_key_exists", `R2 中已存在不可变对象，拒绝覆盖：${key}`, {
      key,
    });
  }
  return putReplaceable(bucket, key, value);
}

/**
 * 写入可替换对象（指针 / 目录索引 / manifest）：允许覆盖，带路径族缓存头。
 */
export async function putReplaceable(
  bucket: R2Bucket,
  key: string,
  value: unknown,
): Promise<StoredObject> {
  const cacheControl = cacheControlForKey(key);
  await bucket.put(key, JSON.stringify(value), {
    httpMetadata: { contentType: JSON_CONTENT_TYPE, cacheControl },
  });
  return { key, cacheControl, contentType: JSON_CONTENT_TYPE };
}
