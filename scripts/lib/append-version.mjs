/**
 * 「追加数据版本」的纯函数（`--mode append`）。
 *
 * 与首发（`--mode publish`）的区别：追加**不重注册数据集、不重冻 schema**，
 * 只多一个不可变快照 + 指针/manifest/catalog 前进一格。因此这里的三个函数只管
 * 「下一版是几号」「这次是不是重复跑」「manifest 怎么前进」——都不做 I/O。
 *
 * 纯函数（不跑 wrangler、不读 R2），便于单测：`tests/publish-preset-pack.test.ts`。
 */

/**
 * 下一个数据版本号 = 现有**纯数字**版本的最大值 + 1（非数字版本如 `preview-1` 不参与编号）。
 *
 * 来源必须是 D1 的 `data_version` 表（调用方传入），不靠本地推断——否则多机/并发会撞号。
 */
export function nextDataVersion(versions) {
  let max = 0;
  for (const item of versions ?? []) {
    const raw = typeof item === "string" ? item : String(item?.version ?? "");
    if (!/^\d+$/.test(raw)) continue;
    const value = Number(raw);
    if (value > max) max = value;
  }
  return String(max + 1);
}

/**
 * 幂等判定：如果当前 `latest.json` 指针的 contentHash 与本次 payload 完全一致，
 * 说明这一版已经发过了 —— 直接跳过写入（不重发、不跳号），只做 302 自检。
 */
export function isNoopReplay(latestPointer, contentHash) {
  if (!latestPointer || typeof latestPointer !== "object") return false;
  return latestPointer.contentHash === contentHash;
}

/**
 * manifest 前进一格：保留 schema 段与历史版本，追加新版本并重算 `isLatest`，
 * `latest` 指向新版本，`preview` 原样保留（预览指针的唯一权威是 preview.json，不在这里改）。
 */
export function buildNextManifest(existing, { version, schemaVersion, publishedAt, title }) {
  const base = existing && typeof existing === "object" ? existing : {};
  const versions = Array.isArray(base.dataVersions) ? base.dataVersions : [];
  const kept = versions
    .filter((item) => String(item?.version ?? "") !== String(version))
    .map((item) => ({ ...item, isLatest: false, isPreview: false }));
  const next = [
    ...kept,
    { version: String(version), publishedAt, isLatest: true, isPreview: false },
  ].sort((a, b) =>
    String(a.version).localeCompare(String(b.version), undefined, { numeric: true }),
  );
  return {
    ...base,
    ...(title ? { title } : {}),
    schema: base.schema ?? {
      version: schemaVersion,
      url: `/schemas/${base.slug ?? ""}/${schemaVersion}.json`,
    },
    dataVersions: next,
    latest: String(version),
    preview: base.preview ?? null,
    updatedAt: publishedAt,
  };
}
