function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value !== null && typeof value === "object") {
    const source = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(source).sort()) {
      sorted[key] = sortValue(source[key]);
    }
    return sorted;
  }
  return value;
}

/**
 * 稳定序列化：对对象键递归排序后 JSON.stringify（数组保持顺序）。
 * 用于对语义相同的 payload 计算一致的内容哈希，实现去重。
 */
export function stableStringify(value: unknown): string {
  return JSON.stringify(sortValue(value));
}
