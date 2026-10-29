# HANDOFF · 收工落盘（Max / LTA-DEV）

> 本轮「全线停工」收尾。只落盘 + 交接，不再开工。**未 push，未动 `.git`/gitdir，未执行 `worktree prune`。**

## 0. 靶点

- 分支：`feat/read-egress`
- **本分支当前 HEAD（完整 SHA）：`ec5d402b120d04cc5db621515562dc4e5bcf8ccb`**
- 落盘时工作区状态：clean（无未提交、无未跟踪残留）。本次仅新增本文件并提交。
- 祖先关系：`git merge-base --is-ancestor 56f997f ec5d402` = 真 → **`56f997f` 是 `ec5d402` 的严格祖先**（无分叉、无回退）。

## 1. 做到哪（模块级）

本分支自 `4f63845` 起共 4 个提交，全部**已完成并自测过门禁**：

| 提交 | 内容 | 状态 |
|---|---|---|
| `4f63845` `18932a3` | M1–M4 读取出口：同源 Worker 从 R2 直出，落地 `ALLOW_DEV_STATIC=false` 语义 | 完成 |
| `56f997f` | 契约追加项对齐：E21(a) 尾斜杠不别名 / E26 message 不泄露 / E20 超长键 404 不 5xx / E23 受保护页 | 完成 |
| `05da6c3` | E31 第 5 项（未命中读取族的非 GET/HEAD → **404** 不再是 405）、T6 种子护栏、注释锚点 R→E | 完成 |
| `ec5d402` | **T12 / M5b：preview 唯一权威 = `preview.json` 指针，stage 回写 `manifest.preview`** | 完成 |

实现分布（模块级）：
- `src/r2/keys.ts` —— 归一（只剥前导 `/`）、家族匹配、`.json` 守卫、R2 键长预判。
- `src/index.ts` —— `app.all("*")` 消费顺序：读取族 → `.json` 守卫 → 非 GET/HEAD → 404；头白名单（content-type / cache-control / etag）；一切非 2xx 一律 `no-store`；错误 message 固定短文本。
- `src/publish/{publish,rollback}.ts`、`src/schema/freeze.ts` —— 4 个 manifest 写入点的 preview 取值统一。
- `scripts/seed-demo.mjs` —— T6 种子护栏。
- `public/{index.html,styles.css}` —— 读取出口页面对齐。

**明确未做（属既定范围外，不是欠账）**：契约 §2.1 十四条读者侧否定面与 §6 非目标表 —— 无分页 / query 参数 / 读者 API / 304 / CORS / 鉴权个人化 / 详情页 / 全文检索 / RSS-sitemap / i18n / 读取指标。3 份 JSON 契约未加字段。

## 2. 重点：`ec5d402` 相对 `56f997f` 的改动范围

`56f997f..ec5d402` = 2 个提交（`05da6c3` + `ec5d402`），10 文件 / +242 −52：

```
M public/index.html          M src/index.ts              M src/r2/keys.ts
M public/styles.css          M src/publish/publish.ts    M src/schema/freeze.ts
M scripts/seed-demo.mjs      M src/publish/rollback.ts   M tests/read-egress.test.ts
A tests/vite-env.d.ts
```

### 2.1 T12 preview 指针返工（`ec5d402`，涉及 4 文件）

裁定来源：Ada 契约 `docs/contracts/public-read-egress.md` @ `68df3c8`（§2.3 新增不变式、§3 矩阵 E11 收窄、§4 新增 M5b、§5.2 T12 条目）。

| 文件 | 行为改动 |
|---|---|
| `src/publish/publish.ts` | ① `stageDataset()` 末尾（指针与 DB 之后）**补写 manifest**：`preview` = 本次预览版本号、`latest = dataset.current_data_version ?? null`、preview **不进** `dataVersions[]`。固定顺序「不可变快照 → `preview.json` 指针 → DB → manifest」，保证「manifest 说 preview 非空 ⟹ 指针已存在」，不留悬空引用。② `publishDataset()` 的 preview 取值由「DB 列优先」改为**指针唯一权威**。③ `toManifestVersions()` 的 `latest` 放宽为 `string \| null`（stage 时可能尚无已发布版本）。 |
| `src/publish/rollback.ts` | rollback 写 manifest 时 preview 同样改取 `readPreviewPointer()`。 |
| `src/schema/freeze.ts` | 第 4 个 manifest 写入点（re-freeze）一并统一取指针，避免 re-freeze 倒退回 DB 列。 |
| `tests/read-egress.test.ts` | 新增 E11 收窄版 3 例（**Max 自查 smoke，不是 Hawk 的验收断言**）。 |

**未改**：DB 列 `current_preview_version` 保留（降级为非权威内部状态，迁移不动）；preview 仍不进 `dataVersions[]`；`isPreview` 仍恒 `false`。

### 2.2 `05da6c3` 带来的两处口径（对 Hawk 也有影响）

- **E31 第 5 项**：**未命中读取家族**的非 GET/HEAD 一律 **404** JSON + `no-store`（此前 Hono 对已注册页面路由如 `POST /admin` 回 405 且 body 非 JSON）。405 只留给「命中读取家族但方法不对」。`/api/*` 显式排除，写侧不动。
- **T6**：`scripts/seed-demo.mjs` 先判后连 —— 先读服务端自报 `GET /api/health`（← `vars.ENVIRONMENT`），白名单 `development|test|preprod`，production / 报不出环境 / 不可达一律 `exit 1`（fail closed）。
- 附：注释锚点 `R-号` → `E-号`（契约 §3.1：R1–R15 废止）。

## 3. 这条缺口对 Hawk 的验收意味着什么

- Hawk 现靶点 `56f997f`：**R1–R15 全绿结论依然成立，不必撤回**（Ada 契约 §5.2 明说 O1 不在 R1–R15 判据内 → 不判 Hawk 既有报告红）。
- 但 **E11 的 T12 收窄版断言在 `56f997f` 上必红**：`stage` 后 `manifest.preview === null` 而 `preview.json` 指针已存在 → 违反 §2.3「preview 唯一权威」与 §6「预览可达但不可枚举」（实际退化成**不可达**）。这就是派工里点名的缺口，已由 `ec5d402` 修掉。
- 因此 **Hawk 需要把验收靶点从 `56f997f` 重钉到 `ec5d402b120d04cc5db621515562dc4e5bcf8ccb`** 才能继续验收：① T12/E11 收窄版；② `05da6c3` 的 E31 第 5 项（404 而非 405）；③ T6 种子护栏。
- **提示一处 Hawk 套件内的旧口径断言（当前不红，建议收紧）**：`tests/read-egress/egress-data.test.ts`「stage 之后 preview 指针可达但不可枚举」仍写着
  `expect(afterStage.preview === null || afterStage.preview === previewVersion).toBe(true);`
  （宽松式，附注释「stage 只写 preview 指针，manifest 由 publish 写」）。在 `ec5d402` 上它**仍然通过**（接受两种取值），但按 T12 应收紧为 `expect(afterStage.preview).toBe(previewVersion)`，并以 `cache-control: no-cache` 读源站态。**该文件属 Hawk 分支，Max 未改，仅提示。**

## 4. `ec5d402` 是否可作验收靶点：建议**可以**

- 门禁自身全绿（本轮收工前实测）：`npm run typecheck` 0 错；`npm run lint` 退出码 **0**（7 warnings + 2 infos，按本项目口径不挡门禁）；`npm test` = **23 files / 89 passed / 0 fail**。
- `56f997f` 是 `ec5d402` 的严格祖先，无分叉。
- 我**没有更优替代靶点**；不建议回 `05da6c3`（那会留着 T12 缺口）。若 Hawk 复跑发现新红，再议。

## 5. 已知红项 / 未验证链路

1. **Hawk 的三层验收未在 `ec5d402` 上复跑**：本轮只跑了仓库自带 `npm test`（= Max 侧单层 smoke）。② HTTP 层 `verify-http.mjs`、③ 页面层 `page-probe.mjs`、第 4 环独立探针在 `ec5d402` 上**均未执行** → 未验证链路，Hawk 重钉靶点后需整轮复跑。
2. **`tests/read-egress/` 不在本分支** → Hawk 断言 × Max 实现的交叉验证无法在 Max 侧闭环，只能在 Hawk 重钉靶点后完成。
3. `internal_error` 注入缝仍只存在于 vitest（`BUCKET` 桩的 `body` getter 抛错）；纯 HTTP / `wrangler dev` 下**不可注入** —— 按 `05da6c3` 说明，Hawk 不据此判红。
4. **Hawk 侧未跟踪目录** `tests/acceptance/`（`env.ts` / `framework.ts`）位于 `LTA-QA`（`test/read-egress-acceptance` @ `3d434b0`），**不在我的 worktree 范围，需 Hawk 自己落盘**。
5. 挂点漂移（已知，非本轮引入）：目录渲染挂点是 `#results` 卡片组，非 Vera 清单写死的 `#rows`/`<tr>`；按**行为**判，旧挂点不再成立。
6. 无失败用例：`ec5d402` 上 `npm test` 0 fail。

## 6. 下一步（接手人先干什么）

1. **Hawk**：把验收靶点从 `56f997f` 重钉到 `ec5d402`，整轮复跑三层（vitest 套件 / HTTP 探针 / 页面探针），并补 E11 的 T12 收窄版断言 —— 「stage 后以 `no-cache` 读 `manifest.json` 与 `preview.json`，二者 `preview` / `dataVersion` 相等；无预览 → 404 + `no-store` 且 `manifest.preview === null`；快照经 `manifest.preview` 拼路径 200 + `immutable` 且两次 sha256 相同」。
2. 顺手收紧 §3 提示的那条宽松断言。
3. 复跑结果：红项属实现侧 → 回 Max；属旧口径断言 → 改 Hawk 分支。
4. 本分支**等待合并评审**。按收工口径停在此处：**不 push**。
---

## 7. 契约追加项 **E32**（跳转响应的缓存语义）— PR #1 / Owl 必改项 2

> 编号接 Ada 契约 `docs/contracts/public-read-egress.md` 现有序列（E1–E31 → **E32**）。
> 注意：Ada 契约 §0 写「本文不新造 AC 号」，故 **E32 是「实现层追加约定」，不是 Vera 的 AC 号**；
> Ada 若要并回 AC 清单，按她的编号规则重编即可，语义以本节为准。
> 该正本在当前仓库里是 **gitignore 的 `/docs/`**（属 Ada 的树，本分支不可写），
> 故本节先落地在 PR 可评审的位置；**待 Ada 收编进正本**，文字以本节为准。

**E32**　`/{slug}/latest.json` 命中 `LATEST_REDIRECT_SLUGS` 白名单时回 **302**，该响应
**按「指针类」缓存**：`cache-control: public, max-age=60, must-revalidate`。

1. 302 **不是错误响应**，因此**不得**套用「错误面一律 `no-store`」；也**不得**给 `immutable`
   （否则「最新」会滞后一个版本周期）。
2. 错误面（4xx / 5xx，含 `read_unavailable` / `internal_error`）**仍一律 `no-store`**，
   与 302 的缓存语义互不覆盖。
3. 302 的响应头白名单 = `location` / `cache-control` / `content-type`，不得出现任何 `x-lantai-*`；
   `HEAD` 同 302 但**空体**。
4. 读指针失败一律**不跳转**，按情形分开（细分见下，测试锚点 `latest-json-redirect.test.ts` ④/④′）：
   - **存储不可用**（`bucket.get` 抛错）→ 退回 `serveR2Read`，给既有语义的 `read_unavailable` 500 + `no-store`；
   - **指针不存在** → 退回 `serveR2Read` → 404 JSON + `no-store`；
   - **指针存在但损坏**（非 JSON / 缺 `dataVersion` / `dataVersion` 不是**非空纯数字**串）→
     **404 JSON + `no-store`**，绝不 302 到 `versions/undefined.json` / `null.json` / `.json`，
     也不把损坏内容当 200 直出。判定正则 `^\d+$`（平台 `dataVersion` 恒为十进制整数串）。
   失败路径必须留 `console.error`（`latest_redirect_pointer_unreadable` / `latest_redirect_pointer_malformed`）。
