#!/usr/bin/env node
/**
 * 数据集 register → freeze → publish 一键脚本（dry-run 默认）。
 *
 * 背景：发布一个数据集要在 D1（dataset / schema_version / data_version / audit_log）与
 * R2（schema、快照、latest 指针、manifest、catalog、search-index）两侧同步写入，手敲
 * `wrangler d1 execute ... && wrangler r2 object put ...` 既慢又容易漏（漏 manifest 或 catalog
 * 会让读者侧拿到 404 或半截目录）。本脚本把这条路径固化成可复跑、可核对、失败即停的工具。
 *
 * 用法：
 *   node scripts/publish-preset-pack.mjs --pack <文件> --slug <slug> --base-url <https://…>
 *        [--title <标题>] [--schema-version 1.0.0] [--env test] [--execute]
 *
 *   --pack            数据集 payload（JSON）。结构由数据集自己的契约决定，本脚本不校验字段语义。
 *   --slug            数据集标识（同一 slug 已存在则拒绝执行，不覆盖）。
 *   --title           数据集标题，缺省用 slug。
 *   --schema-version  平台 schema 版本，缺省 1.0.0（**平台当前只接受首个冻结版本 1.0.0**）。
 *   --schema          要冻结的 JSON Schema 文件；缺省用最小兜底 {type:object, additionalProperties:true}。
 *   --base-url        目标站点（必填，不内置默认值，避免误打生产）。
 *   --env             部署环境，**只允许 test**。
 *   --execute         真正写入；缺省只打印计划（dry-run）。
 *   --no-register-redirect  不把 slug 写进 wrangler.jsonc 的 LATEST_REDIRECT_SLUGS（默认会写）。
 *   --no-deploy             登记白名单后不自动部署（默认会部署：vars 是部署期注入，不部署不生效）。
 *   --allow-non-302         302 自检未通过时只告警、不判失败（默认判失败）。
 *
 * 安全边界（fail closed，任一不满足立即退出非 0）：
 *   1. `--env` 只接受 `test`；`preprod` / `production` 显式拒绝。
 *   2. 执行前请求 `<base-url>/api/health`，服务端自报 `environment` 必须与 `--env` 一致。
 *   3. D1 / R2 资源名从 `wrangler.jsonc` 的对应 env 段读取，不在脚本里硬编码账号或资源 ID。
 *   4. 凭据只从环境变量读（如 `CLOUDFLARE_API_TOKEN`），脚本只判断是否存在，**从不打印**。
 *
 * 退出码：0 成功 / 1 执行失败（已停在上一步，输出里带步骤号）/ 2 参数或前置条件不合法。
 */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { readRedirectSlugs, registerRedirectSlug } from "./lib/wrangler-config.mjs";

const ALLOWED_ENVS = ["test"];
const RETRY_DELAYS_MS = [5000, 20000, 60000];
const MAX_ATTEMPTS = 3;
const RECOVERABLE = /(429|503|rate.?limit|timeout|timed out|ETIMEDOUT|fetch failed|network)/i;

const IMMUTABLE = "public, max-age=31536000, immutable";
const POINTER = "public, max-age=60, must-revalidate";
const INDEX = "public, max-age=300";
const CONTENT_TYPE = "application/json; charset=utf-8";

/* ------------------------------------------------------------------ args */

export function parseArgs(argv) {
  const known = new Set([
    "--pack",
    "--slug",
    "--title",
    "--schema-version",
    "--schema",
    "--base-url",
    "--env",
    "--execute",
    "--no-register-redirect",
    "--no-deploy",
    "--allow-non-302",
    "--help",
  ]);
  const args = {
    execute: false,
    env: "test",
    schemaVersion: "1.0.0",
    registerRedirect: true,
    deploy: true,
    allowNon302: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!known.has(token)) fail(`未知参数：${token}`);
    if (token === "--execute") {
      args.execute = true;
      continue;
    }
    if (token === "--no-register-redirect") {
      args.registerRedirect = false;
      continue;
    }
    if (token === "--no-deploy") {
      args.deploy = false;
      continue;
    }
    if (token === "--allow-non-302") {
      args.allowNon302 = true;
      continue;
    }
    if (token === "--help") {
      printHelp();
      process.exit(0);
    }
    const value = argv[i + 1];
    if (value === undefined || value.startsWith("--")) fail(`参数 ${token} 缺少取值`);
    i += 1;
    if (token === "--pack") args.pack = value;
    if (token === "--slug") args.slug = value;
    if (token === "--title") args.title = value;
    if (token === "--schema-version") args.schemaVersion = value;
    if (token === "--schema") args.schema = value;
    if (token === "--base-url") args.baseUrl = value.replace(/\/+$/, "");
    if (token === "--env") args.env = value;
  }
  return args;
}

function printHelp() {
  console.log(
    [
      "用法: node scripts/publish-preset-pack.mjs --pack <文件> --slug <slug> --base-url <https://…> [选项]",
      "",
      "  --pack            数据集 payload（JSON）",
      "  --slug            数据集标识（已存在则拒绝）",
      "  --title           数据集标题（缺省=slug）",
      "  --schema-version  平台 schema 版本（缺省 1.0.0）",
      "  --schema          要冻结的 JSON Schema 文件（缺省用最小兜底）",
      "  --base-url        目标站点，必填（不内置默认值）",
      "  --env             部署环境，只允许 test",
      "  --execute         真正写入（缺省 dry-run）",
      "  --no-register-redirect  不把 slug 写进 wrangler.jsonc 的 LATEST_REDIRECT_SLUGS",
      "  --no-deploy             登记后不自动部署（vars 是部署期注入，不部署不生效）",
      "  --allow-non-302         302 自检未通过时只告警不判失败",
    ].join("\n"),
  );
}

function fail(message, code = 2) {
  console.error(`✖ ${message}`);
  process.exit(code);
}

/* ------------------------------------------------------- stable hashing */

/** 与 src/lib/stable-json.ts 一致：递归键排序后 JSON.stringify。 */
function sortValue(value) {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value !== null && typeof value === "object") {
    const out = {};
    for (const key of Object.keys(value).sort()) out[key] = sortValue(value[key]);
    return out;
  }
  return value;
}

function stableStringify(value) {
  return JSON.stringify(sortValue(value));
}

function sha256Hex(text) {
  return createHash("sha256").update(Buffer.from(text, "utf8")).digest("hex");
}

/* ------------------------------------------------- wrangler / retry core */

function wranglerTargets(envName) {
  const configPath = resolve(process.cwd(), "wrangler.jsonc");
  if (!existsSync(configPath)) fail(`找不到 wrangler.jsonc（${configPath}），请在仓库根目录执行`);
  const config = JSON.parse(stripJsonComments(readFileSync(configPath, "utf8")));
  const section = config.env?.[envName];
  if (!section) fail(`wrangler.jsonc 里没有 env.${envName} 段，拒绝执行`);
  const database = section.d1_databases?.[0];
  const bucket = section.r2_buckets?.[0];
  if (!database?.database_name) fail(`env.${envName} 缺 d1_databases[0].database_name`);
  if (!bucket?.bucket_name) fail(`env.${envName} 缺 r2_buckets[0].bucket_name`);
  return {
    worker: section.name,
    database: database.database_name,
    bucket: bucket.bucket_name,
    /* 未显式关掉 workers.dev 时，每次 deploy 都会把裸域重新打开（wrangler 默认行为）。 */
    workersDevDisabled: section.workers_dev === false,
  };
}

/** 去掉 jsonc 的注释与尾逗号（wrangler.jsonc 允许注释，JSON.parse 不允许）。 */
function stripJsonComments(text) {
  let out = "";
  let inString = false;
  let inLineComment = false;
  let inBlockComment = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];
    if (inLineComment) {
      if (ch === "\n") {
        inLineComment = false;
        out += ch;
      }
      continue;
    }
    if (inBlockComment) {
      if (ch === "*" && next === "/") {
        inBlockComment = false;
        i += 1;
      }
      continue;
    }
    if (inString) {
      out += ch;
      if (ch === "\\") {
        out += text[i + 1] ?? "";
        i += 1;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
      out += ch;
      continue;
    }
    if (ch === "/" && next === "/") {
      inLineComment = true;
      i += 1;
      continue;
    }
    if (ch === "/" && next === "*") {
      inBlockComment = true;
      i += 1;
      continue;
    }
    out += ch;
  }
  return out.replace(/,\s*([}\]])/g, "$1");
}

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

/** 串行执行 wrangler；429/503/超时按 5s→20s→60s 退避，最多 3 次。 */
async function runWrangler(argv, label) {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      return execFileSync("wrangler", argv, {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      });
    } catch (error) {
      const detail = String(error.stderr || error.message || error);
      if (attempt < MAX_ATTEMPTS && RECOVERABLE.test(detail)) {
        const wait = RETRY_DELAYS_MS[attempt - 1];
        console.error(`  … ${label} 第 ${attempt} 次失败（可重试），${wait / 1000}s 后重试`);
        await sleep(wait);
        continue;
      }
      throw new Error(`${label} 失败：${detail.slice(0, 600)}`);
    }
  }
  throw new Error(`${label} 失败：重试次数用尽`);
}

async function fetchJson(url, label) {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const res = await fetch(url, { headers: { accept: "application/json" } });
      const text = await res.text();
      let body = null;
      try {
        body = text ? JSON.parse(text) : null;
      } catch {
        body = text;
      }
      if (!res.ok) throw new Error(`${label} → HTTP ${res.status}`);
      return body;
    } catch (error) {
      const detail = String(error.message || error);
      if (attempt < MAX_ATTEMPTS && RECOVERABLE.test(detail)) {
        const wait = RETRY_DELAYS_MS[attempt - 1];
        console.error(`  … ${label} 第 ${attempt} 次失败（可重试），${wait / 1000}s 后重试`);
        await sleep(wait);
        continue;
      }
      throw new Error(`${label} 失败：${detail}`);
    }
  }
  throw new Error(`${label} 失败：重试次数用尽`);
}

/* ------------------------------------------------------------- R2 / D1 */

async function r2Get(bucket, key) {
  const file = join(mkdtempSync(join(tmpdir(), "publish-")), "obj.json");
  try {
    await runWrangler(
      ["r2", "object", "get", `${bucket}/${key}`, "--remote", "--file", file],
      `r2 get ${key}`,
    );
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

async function r2Put(bucket, key, body, cacheControl, envFlag) {
  const file = join(mkdtempSync(join(tmpdir(), "publish-")), "obj.json");
  writeFileSync(file, body, "utf8");
  await runWrangler(
    [
      "r2",
      "object",
      "put",
      `${bucket}/${key}`,
      "--remote",
      ...envFlag,
      "--file",
      file,
      "--content-type",
      CONTENT_TYPE,
      "--cache-control",
      cacheControl,
    ],
    `r2 put ${key}`,
  );
}

async function d1Query(database, sql, envFlag) {
  const raw = await runWrangler(
    ["d1", "execute", database, "--remote", ...envFlag, "--json", "--command", sql],
    "d1 query",
  );
  const start = raw.indexOf("[");
  if (start < 0) return [];
  try {
    return JSON.parse(raw.slice(start))[0]?.results ?? [];
  } catch {
    return [];
  }
}

async function d1Exec(database, statements, envFlag, label) {
  const file = join(mkdtempSync(join(tmpdir(), "publish-")), "batch.sql");
  writeFileSync(file, `${statements.join("\n")}\n`, "utf8");
  await runWrangler(
    ["d1", "execute", database, "--remote", ...envFlag, "--file", file, "--yes"],
    label,
  );
}

const sqlText = (value) =>
  value === null || value === undefined ? "NULL" : `'${String(value).replace(/'/g, "''")}'`;

/* ----------------------------------------------------------------- main */

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!ALLOWED_ENVS.includes(args.env)) {
    fail(
      `--env ${args.env} 不被允许：本脚本只允许 ${ALLOWED_ENVS.join(" / ")}（preprod、production 一律拒绝）`,
    );
  }
  if (!args.pack || !args.slug) fail("必须给出 --pack 与 --slug");
  if (!args.baseUrl) fail("必须给出 --base-url（脚本不内置站点地址，避免误打其他环境）");
  if (!/^https?:\/\//.test(args.baseUrl))
    fail(`--base-url 必须以 http(s):// 开头：${args.baseUrl}`);
  if (!/^\d+\.\d+\.\d+$/.test(args.schemaVersion)) fail(`--schema-version 必须形如 x.y.z`);
  if (!existsSync(args.pack)) fail(`找不到 payload 文件：${args.pack}`);

  const envFlag = ["--env", args.env];
  const targets = wranglerTargets(args.env);
  const title = args.title || args.slug;
  const payloadText = readFileSync(args.pack, "utf8");
  const payload = JSON.parse(payloadText);

  const snapshotBody = JSON.stringify(payload);
  const contentHash = sha256Hex(stableStringify(payload));
  const now = new Date().toISOString();
  const schemaKey = `schemas/${args.slug}/${args.schemaVersion}.json`;
  const snapshotKey = `${args.slug}/versions/1.json`;
  const latestKey = `${args.slug}/latest.json`;
  const manifestKey = `${args.slug}/manifest.json`;
  const searchIndexKey = `${args.slug}/search-index.json`;

  console.log(`目标环境   : ${args.env}（只允许 ${ALLOWED_ENVS.join(" / ")}）`);
  console.log(`worker     : ${targets.worker}`);
  console.log(`D1 / R2    : ${targets.database} / ${targets.bucket}`);
  console.log(`站点       : ${args.baseUrl}`);
  console.log(`数据集     : ${args.slug}（${title}）`);
  console.log(`schema 版本: ${args.schemaVersion}　数据版本: 1`);
  const schemaDoc = args.schema
    ? JSON.parse(readFileSync(args.schema, "utf8"))
    : { type: "object", additionalProperties: true };
  if (args.schema && !existsSync(args.schema)) fail(`找不到 schema 文件：${args.schema}`);
  console.log(`payload    : ${snapshotBody.length} B　contentHash: ${contentHash}`);
  console.log(`schema 来源: ${args.schema || "内置兜底 {type:object, additionalProperties:true}"}`);
  console.log(
    `凭据       : CLOUDFLARE_API_TOKEN ${process.env.CLOUDFLARE_API_TOKEN ? "已设置" : "未设置（wrangler 会回退到本地登录态）"}`,
  );

  const configPath = resolve(process.cwd(), "wrangler.jsonc");
  const configText = readFileSync(configPath, "utf8");
  const currentSlugs = readRedirectSlugs(configText, args.env);
  const redirectPlan = args.registerRedirect
    ? currentSlugs.includes(args.slug)
      ? `已登记（无变化）：[${currentSlugs.join(", ")}]`
      : `would register: [${args.slug}]（登记后：${[...currentSlugs, args.slug].join(",")}）`
    : "跳过（--no-register-redirect）";

  if (!args.execute) {
    console.log(`latest 302 白名单: ${redirectPlan}`);
    console.log("\n[dry-run] 计划如下（不打任何写入请求）：");
    for (const line of [
      `1  health     GET ${args.baseUrl}/api/health → 必须自报 environment=${args.env}`,
      `2  register   d1: dataset + schema_version(${args.schemaVersion}, draft) + audit_log`,
      `3  freeze     d1: schema_version.status=frozen、dataset.current_schema_version；r2: ${schemaKey}`,
      `4  freeze     r2: ${manifestKey}、index.json（catalog upsert）`,
      `5  publish    r2: ${snapshotKey}（JSON.stringify(payload)）`,
      `6  publish    r2: ${latestKey}（含 schemaVersion=${args.schemaVersion}）`,
      `7  publish    r2: ${searchIndexKey}、search/index.json`,
      `8  publish    d1: data_version + dataset.current_data_version + audit_log`,
      `9  redirect   写 wrangler.jsonc 的 ${args.env}.vars.LATEST_REDIRECT_SLUGS ← ${args.slug}（幂等）`,
      args.deploy
        ? `10 deploy     wrangler deploy ${envFlag.join(" ")}（vars 是部署期注入，必须部署才生效）`
        : "10 deploy     跳过（--no-deploy）",
      `11 verify     /api/health 复核 environment=${args.env}；HEAD /${args.slug}/latest.json 期望 302 → versions/1.json`,
    ]) {
      console.log(`  ${line}`);
    }
    console.log(
      `\n[dry-run] 未写入任何东西，**也不会部署**（部署只在 --execute 时发生）；加 --execute 才执行。${args.deploy ? "" : "（--no-deploy：执行时也不会部署）"}`,
    );
    return 0;
  }

  // 1) fail-closed：目标必须是声明的环境
  const health = await fetchJson(`${args.baseUrl}/api/health`, "health");
  const reported = health?.environment;
  if (reported !== args.env) {
    fail(
      `目标环境自报 environment=${JSON.stringify(reported)}，与 --env ${args.env} 不一致；已中止`,
      1,
    );
  }
  console.log(`[1/9] health ok（environment=${reported}）`);

  // 2) 已存在则拒绝，绝不覆盖
  const existing = await d1Query(
    targets.database,
    `select id, slug from dataset where slug=${sqlText(args.slug)}`,
    envFlag,
  );
  if (existing.length > 0) {
    fail(
      `数据集 ${args.slug} 已存在（id=${existing[0].id}）；本脚本不覆盖，请另起 slug 或人工处理`,
      1,
    );
  }

  const datasetId = crypto.randomUUID();
  const schemaVersionId = crypto.randomUUID();

  await d1Exec(
    targets.database,
    [
      `INSERT INTO dataset (id, slug, title, current_schema_version, created_at) VALUES (${sqlText(datasetId)}, ${sqlText(args.slug)}, ${sqlText(title)}, NULL, ${sqlText(now)});`,
      `INSERT INTO schema_version (id, dataset_id, version, json_schema, status, created_at) VALUES (${sqlText(schemaVersionId)}, ${sqlText(datasetId)}, ${sqlText(args.schemaVersion)}, ${sqlText(JSON.stringify(schemaDoc))}, 'draft', ${sqlText(now)});`,
      `INSERT INTO audit_log (id, actor, action, target, detail, created_at) VALUES (${sqlText(crypto.randomUUID())}, 'script:publish-preset-pack', 'dataset.register', ${sqlText(args.slug)}, ${sqlText(JSON.stringify({ version: args.schemaVersion }))}, ${sqlText(now)});`,
    ],
    envFlag,
    "register",
  );
  console.log("[2/9] register ok（dataset + schema_version draft + audit_log）");

  // 3) freeze
  await d1Exec(
    targets.database,
    [
      `UPDATE schema_version SET status='frozen' WHERE id=${sqlText(schemaVersionId)};`,
      `UPDATE dataset SET current_schema_version=${sqlText(args.schemaVersion)} WHERE id=${sqlText(datasetId)};`,
      `INSERT INTO audit_log (id, actor, action, target, detail, created_at) VALUES (${sqlText(crypto.randomUUID())}, 'script:publish-preset-pack', 'schema.freeze', ${sqlText(`${args.slug}@${args.schemaVersion}`)}, ${sqlText(JSON.stringify({ changeKind: "initial" }))}, ${sqlText(now)});`,
    ],
    envFlag,
    "freeze(d1)",
  );
  await r2Put(targets.bucket, schemaKey, JSON.stringify(schemaDoc), IMMUTABLE, envFlag);
  console.log(`[3/9] freeze ok（schema_version=frozen，r2 ${schemaKey}）`);

  // 4) manifest + catalog（freeze 即入目录，hasData=false）
  const catalog = (await r2Get(targets.bucket, "index.json")) || { generatedAt: "", datasets: [] };
  const entries = (catalog.datasets || []).filter((item) => item.slug !== args.slug);
  entries.push({
    slug: args.slug,
    title,
    currentSchemaVersion: args.schemaVersion,
    currentDataVersion: null,
    hasData: false,
    updatedAt: now,
  });
  entries.sort((a, b) => (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));
  await r2Put(
    targets.bucket,
    "index.json",
    JSON.stringify({ generatedAt: now, datasets: entries }),
    INDEX,
    envFlag,
  );
  const manifest = {
    slug: args.slug,
    title,
    schema: { version: args.schemaVersion, url: `/${schemaKey}` },
    dataVersions: [],
    latest: null,
    preview: null,
    updatedAt: now,
  };
  await r2Put(targets.bucket, manifestKey, JSON.stringify(manifest), POINTER, envFlag);
  console.log("[4/9] catalog + manifest ok（hasData=false）");

  // 5) 快照（不可变）
  await r2Put(targets.bucket, snapshotKey, snapshotBody, IMMUTABLE, envFlag);
  console.log(`[5/9] snapshot ok（${snapshotKey}，${snapshotBody.length} B）`);

  // 6) latest 指针（内含 schemaVersion）
  await r2Put(
    targets.bucket,
    latestKey,
    JSON.stringify({
      dataset: args.slug,
      dataVersion: "1",
      schemaVersion: args.schemaVersion,
      publishedAt: now,
      contentHash,
    }),
    POINTER,
    envFlag,
  );
  console.log(`[6/9] latest 指针 ok（schemaVersion=${args.schemaVersion}）`);

  // 7) 搜索索引 + manifest 复写（latest 已就绪）
  const published = {
    ...manifest,
    dataVersions: [{ version: "1", publishedAt: now, isLatest: true, isPreview: false }],
    latest: "1",
    updatedAt: now,
  };
  await r2Put(targets.bucket, manifestKey, JSON.stringify(published), POINTER, envFlag);
  await r2Put(
    targets.bucket,
    searchIndexKey,
    JSON.stringify({
      slug: args.slug,
      title,
      schemaVersion: args.schemaVersion,
      dataVersion: "1",
      fields: [],
      terms: [],
    }),
    INDEX,
    envFlag,
  );
  const global = (await r2Get(targets.bucket, "search/index.json")) || {
    generatedAt: "",
    datasets: [],
  };
  const docs = (global.datasets || []).filter((doc) => doc.slug !== args.slug);
  docs.push({
    slug: args.slug,
    title,
    schemaVersion: args.schemaVersion,
    dataVersion: "1",
    fields: [],
  });
  await r2Put(
    targets.bucket,
    "search/index.json",
    JSON.stringify({ generatedAt: now, datasets: docs }),
    INDEX,
    envFlag,
  );
  console.log("[7/9] search-index + manifest 复写 ok");

  // 8) publish 落库
  await d1Exec(
    targets.database,
    [
      `INSERT INTO data_version (id, dataset_id, version, r2_key, content_hash, source_submission_id, status, published_at) VALUES (${sqlText(crypto.randomUUID())}, ${sqlText(datasetId)}, '1', ${sqlText(snapshotKey)}, ${sqlText(contentHash)}, NULL, 'published', ${sqlText(now)});`,
      `UPDATE dataset SET current_data_version='1', updated_at=${sqlText(now)} WHERE id=${sqlText(datasetId)};`,
      `INSERT INTO audit_log (id, actor, action, target, detail, created_at) VALUES (${sqlText(crypto.randomUUID())}, 'script:publish-preset-pack', 'data.publish', ${sqlText(`${args.slug}@1`)}, ${sqlText(JSON.stringify({ contentHash }))}, ${sqlText(now)});`,
    ],
    envFlag,
    "publish(d1)",
  );
  console.log("[8/9] publish ok（data_version=1）");

  // 9) 登记 latest.json 302 白名单（幂等；只改这一行，不重排整个文件）
  if (args.registerRedirect) {
    const registered = registerRedirectSlug(configText, args.env, args.slug);
    if (!registered.changed) {
      console.log(
        `[9/9] redirect 白名单已含 ${args.slug}（无变化）：[${registered.after.join(", ")}]`,
      );
    } else {
      writeFileSync(configPath, registered.text, "utf8");
      console.log(
        `[9/9] redirect 白名单已写入 wrangler.jsonc：${args.env}.vars.LATEST_REDIRECT_SLUGS = "${registered.after.join(",")}"`,
      );
      console.log(
        "      注意：vars 是部署期注入，**需要重新部署 `--env " +
          args.env +
          "` 才会生效**（路线 A）；若采用运行时存储（路线 B）则无需重部署。",
      );
    }
  } else {
    console.log("[9/11] redirect 白名单按 --no-register-redirect 跳过");
  }

  // 10) 部署（路线 A：vars 是部署期注入，改了配置不部署 = 线上读不到）
  if (args.deploy) {
    if (!targets.workersDevDisabled) {
      console.error(
        `  ⚠ env.${args.env} 未设置 workers_dev: false：本次 deploy 会把该环境的 workers.dev 裸域重新打开（wrangler 默认行为）`,
      );
    }
    const deployOut = await runWrangler(["deploy", ...envFlag], "deploy");
    const version = /Current Version ID:\s*([0-9a-f-]+)/i.exec(deployOut)?.[1] ?? "unknown";
    console.log(`[10/11] deploy ok（version ${version}）`);
  } else {
    console.log("[10/11] deploy 按 --no-deploy 跳过（白名单改动**尚未生效**）");
  }

  // 11) 复核环境 + 302 生效自检
  const healthAfter = await fetchJson(`${args.baseUrl}/api/health`, "health(after)");
  if (healthAfter?.environment !== args.env) {
    fail(
      `部署后 /api/health 自报 environment=${JSON.stringify(healthAfter?.environment)}，与 --env ${args.env} 不一致；请人工核对`,
      1,
    );
  }
  const redirectProbe = await fetch(`${args.baseUrl}/${args.slug}/latest.json`, {
    method: "HEAD",
    redirect: "manual",
  });
  const location = redirectProbe.headers.get("location") ?? "";
  const expectedLocation = `/${args.slug}/versions/1.json`;
  const ok302 = redirectProbe.status === 302 && location.endsWith(expectedLocation);
  console.log(
    `[11/11] 302 自检：HEAD /${args.slug}/latest.json → ${redirectProbe.status} location=${location || "(空)"}`,
  );
  if (!ok302) {
    const message = `302 未生效：期望 302 + Location ${expectedLocation}，实际 ${redirectProbe.status} + ${location || "(空)"}。常见原因：读出口的 302 逻辑未合入/未部署（PR #1），或该 slug 未进白名单`;
    if (args.allowNon302) console.error(`  ⚠ ${message}`);
    else fail(message, 1);
  }

  // 收尾：公开读出口自检（不带凭据）
  console.log("\n公开读出口自检：");
  for (const path of [
    `/${args.slug}/latest.json`,
    `/${args.slug}/versions/1.json`,
    `/${manifestKey}`,
  ]) {
    const res = await fetch(`${args.baseUrl}${path}`, { redirect: "follow" });
    const body = await res.text();
    console.log(
      `  ${res.status} ${path} bytes=${body.length} cache=${res.headers.get("cache-control")}`,
    );
  }
  return 0;
}

/* 只在「直接执行」时跑主流程：被 import（单测）时不产生任何 side effect。 */
const invokedDirectly =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  main()
    .then((code) => process.exit(code))
    .catch((error) => {
      console.error(`✖ ${String(error.message || error)}`);
      process.exit(1);
    });
}
