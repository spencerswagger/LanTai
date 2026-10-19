#!/usr/bin/env node
/**
 * dev / preprod 环境种子：造 `demo` 数据集（冻结 1.0.0 + 连发 3 个版本，latest=3）。
 *
 * 用途（E28：改种子、不改文档）：让 `public/docs/reader.html` 等文档里的示例地址
 * 在「空库 + 部署种子」的全新环境上全部可 200，而不是让读者撞到 404。
 * 该种子**只用于 dev / preprod**，不推 prod（prod 的数据由管理员真实发布）。
 *
 * **T6 机制级护栏（不接受只靠人工纪律）**：脚本在发起任何管理 API 请求之前，先读取目标环境
 * **服务端自报**的 `environment`（`GET /api/health` ← `vars.ENVIRONMENT`），只在
 * development / test / preprod 放行；命中 production（或环境报不出、目标不可达）一律硬退出（非 0）。
 * 这样「prod 公开目录不得出现人造数据集」由机制保证，而不是靠文档里写一句「别在 prod 跑」。
 *
 * 用法：
 *   npm run seed:demo                 # 默认 http://127.0.0.1:8787（wrangler dev）
 *   SEED_BASE_URL=https://lantai-preprod.<域> \
 *   SEED_ACCESS_EMAIL=ops@example.com npm run seed:demo   # preprod（走 CF Access 身份头）
 *
 * 幂等：数据集已存在则复用（按已有版本数补齐到 3 版），不重复建集、不重复冻结。
 */

const BASE = (process.env.SEED_BASE_URL || "http://127.0.0.1:8787").replace(/\/+$/, "");
const EMAIL = process.env.SEED_ACCESS_EMAIL || "";
/** 文档示例里出现的 slug 都种上，避免「改文档」这类漂移。 */
const SLUGS = (process.env.SEED_SLUGS || "demo,demo-population").split(",").map((s) => s.trim());
const VERSIONS = 3;
/** T6：种子只允许落在这些环境（取服务端 `vars.ENVIRONMENT` 的值）。 */
const ALLOWED_ENVIRONMENTS = ["development", "test", "preprod"];

function headers(extra = {}) {
  const h = { accept: "application/json", ...extra };
  if (EMAIL) h["cf-access-authenticated-user-email"] = EMAIL;
  return h;
}

async function api(path, init = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: headers(init.headers),
  });
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) {
    const code = body && body.error ? body.error.code : res.status;
    throw new Error(`${init.method || "GET"} ${path} → ${res.status} ${code}`);
  }
  return body;
}

/**
 * T6 守卫：**先判后连** —— 未过守卫不发任何管理 API 请求。
 * 判据取服务端自报的 `environment`（`GET /api/health`，公开可读、不受后台鉴权影响），
 * 而不是客户端变量或 `NODE_ENV`：目标不可达 / 报不出环境 / 环境不在白名单 → 一律硬退出。
 * 失败是**关闭**的（fail closed）：拿不到环境就不敢种，避免把 prod 当成 dev 误种。
 */
async function assertSeedableTarget() {
  let environment;
  try {
    const res = await fetch(`${BASE}/api/health`, { headers: { accept: "application/json" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    environment = (await res.json())?.environment;
  } catch (error) {
    throw new Error(
      `无法确认目标环境（${BASE}/api/health → ${error.message}）；已中止，以免把 prod 当 dev 误种`,
    );
  }
  if (typeof environment !== "string" || !ALLOWED_ENVIRONMENTS.includes(environment)) {
    throw new Error(
      `目标环境 environment=${JSON.stringify(environment)}：种子只允许在 ${ALLOWED_ENVIRONMENTS.join(" / ")} 运行`,
    );
  }
  return environment;
}

function demoPayload(version) {
  // 版本间故意换值，便于读者一眼看出 latest 指向哪一版。
  const growth = version - 1;
  return {
    name: version === 1 ? "示例数据" : `示例数据（第 ${version} 版）`,
    region: "示例地区",
    population: 1200000 + growth * 15000,
  };
}

function demoPopulationPayload(version) {
  const rows = [
    { name: "甲区", population: 940000 + (version - 1) * 9000 },
    { name: "乙区", population: 660000 + (version - 1) * 4000 },
    { name: "丙区", population: 310000 + (version - 1) * 2000 },
  ];
  return { generatedAt: `2026-01-0${version}T00:00:00.000Z`, version: String(version), rows };
}

const SCHEMAS = {
  demo: {
    type: "object",
    properties: {
      name: { type: "string", title: "名称" },
      region: { type: "string", title: "地区" },
      population: { type: "integer", title: "人口" },
    },
    required: ["name", "region", "population"],
  },
  "demo-population": {
    type: "object",
    properties: {
      generatedAt: { type: "string", title: "生成时间" },
      version: { type: "string", title: "数据版本" },
      rows: {
        type: "array",
        title: "分区人口",
        items: {
          type: "object",
          properties: {
            name: { type: "string", title: "名称" },
            population: { type: "integer", title: "人口" },
          },
          required: ["name", "population"],
        },
      },
    },
    required: ["rows"],
  },
};

function payloadFor(slug, version) {
  return slug === "demo" ? demoPayload(version) : demoPopulationPayload(version);
}

async function ensureDataset(slug) {
  const list = await api("/api/admin/datasets");
  const existing = (list?.datasets || []).find((d) => d.slug === slug);
  if (existing) {
    const frozen = (existing.schemaVersions || []).some((v) => v.status === "frozen");
    return {
      id: existing.id,
      slug,
      created: false,
      frozen,
      dataVersion: existing.currentDataVersion,
    };
  }
  const created = await api("/api/admin/datasets", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      slug,
      title: slug === "demo" ? "示例数据集" : "示例地区人口",
      schema: SCHEMAS[slug],
    }),
  });
  return { id: created.dataset.id, slug, created: true, frozen: false, dataVersion: null };
}

async function seedOne(slug) {
  const dataset = await ensureDataset(slug);
  if (!dataset.frozen) {
    await api(`/api/admin/datasets/${dataset.id}/freeze`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ version: "1.0.0" }),
    });
  }

  const published = await api(`/api/admin/datasets/${dataset.id}/versions`);
  const have = (published?.versions || []).filter((v) => v.status === "published").length;
  let version = have;
  for (let next = have + 1; next <= VERSIONS; next++) {
    const res = await api(`/api/admin/datasets/${dataset.id}/publish`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ payload: payloadFor(slug, next) }),
    });
    version = res.dataVersion;
    console.log(`  · ${slug} 发布 v${version}`);
  }
  if (version === 0) version = dataset.dataVersion || have;
  console.log(`  ✓ ${slug}：${dataset.created ? "新建" : "复用"}，latest=${version}`);
  return { slug, latest: version };
}

/** E28 自查：种完后立刻按文档示例地址逐个验证 200。 */
async function verify(seeded) {
  const catalog = await api("/index.json");
  const slugs = (catalog?.datasets || []).map((d) => d.slug);
  const checks = [];
  for (const { slug, latest } of seeded) {
    checks.push([`/index.json 含 ${slug}`, slugs.includes(slug)]);
    for (const path of [
      `/${slug}/manifest.json`,
      `/${slug}/latest.json`,
      `/${slug}/versions/${latest}.json`,
    ]) {
      const res = await fetch(`${BASE}${path}`, { method: "GET", headers: headers() });
      checks.push([`${path} → 200`, res.status === 200]);
    }
  }
  // 文档里写死的示例版本号（E28：改种子不改文档）。
  for (const path of [
    "/demo/manifest.json",
    "/demo/versions/3.json",
    "/demo-population/manifest.json",
  ]) {
    const res = await fetch(`${BASE}${path}`, { method: "GET", headers: headers() });
    checks.push([`文档示例 ${path} → 200`, res.status === 200]);
  }
  let failed = 0;
  for (const [label, ok] of checks) {
    if (!ok) failed++;
    console.log(`  ${ok ? "✓" : "✗"} ${label}`);
  }
  return failed;
}

async function main() {
  /* T6：机制级 prod 拒绝。放在最前面 —— 未过守卫不发起任何管理 API 请求（不会留下半成品数据）。 */
  const environment = await assertSeedableTarget();
  console.log(
    `种子环境：${BASE}（服务端自报 environment=${environment}）${EMAIL ? `（身份头 ${EMAIL}）` : ""}`,
  );
  const seeded = [];
  for (const slug of SLUGS) {
    seeded.push(await seedOne(slug));
  }
  console.log("自查：");
  const failed = await verify(seeded);
  if (failed) {
    console.error(
      `\n种子自查失败 ${failed} 项：请确认读取出口已部署（读取路径由 Worker 从 R2 直出）。`,
    );
    process.exit(1);
  }
  console.log("\n完成：文档示例地址在种子环境下全部 200。");
}

main().catch((error) => {
  console.error(`种子失败：${error.message}`);
  console.error("提示：本地请先 `npm run dev`；preprod 请带 SEED_ACCESS_EMAIL。");
  process.exit(1);
});
