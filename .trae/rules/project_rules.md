# 项目规则（全局记忆）

## Cloudflare 账号

- Account（账号）：Devcloud@fcy.zj.cn's Account
- Account ID：`f711ab4bb8cb4d1215797beba35d3ddb`
- 可用 Zone：
  - `fengcy.cloud`（zone_id `78bafae4c45364c1e4d2591f924c938b`）
  - `usewheel.online`（zone_id `db2af5e970a4d985c220552796202ac6`）

## 域名与环境约定

- CF 主域名：`fengcy.cloud`
- 预发 / 测试环境子域：`*.test.fengcy.cloud`（测试）、`*.pre.fengcy.cloud`（预发）
- 本项目（lantai）：
  - 测试环境入口：`lantai.test.fengcy.cloud`
  - 预发环境入口：`lantai.pre.fengcy.cloud`
- 部署顺序：先部署 test，再 pre，最后生产。

## 证书策略

- 不开通 ACM，不使用通配符证书 `*.test.fengcy.cloud` / `*.pre.fengcy.cloud`。
  - 原因：通配符需 Advanced Certificate Manager，本 zone 未开通，下单返回 `1450 ... available with the Advanced Certificate Manager`。
- 采用 **Workers 自定义域名自动证书**：把 `*.test.fengcy.cloud` / `*.pre.fengcy.cloud` 主机挂成 Workers Custom Domain 时，Cloudflare 自动签发 advanced 证书，覆盖该主机及其子域通配符（例：`lantai.test.fengcy.cloud` + `*.lantai.test.fengcy.cloud`）。
- 现状：测试 Worker `lantai-test` 已挂载 `lantai.test.fengcy.cloud`，HTTPS 访问正常（200）。

## test 环境资源（已创建）

- Worker：`lantai-test`（已部署为真实项目，非占位）
- D1：`lantai-test`，database_id `6c013211-e179-4644-8527-08a5d190f470`（迁移 0001–0004 已应用）
- R2：`lantai-test`
- 入口：`https://lantai.test.fengcy.cloud`
- `wrangler.jsonc` 已新增 `env.test`（name=lantai-test，绑定上述 D1/R2）
- test 变量：`ENVIRONMENT=test`、`ALLOW_DEV_STATIC=true`、`SKIP_ACCESS_DEV=true`
  - ⚠️ 安全提示：`SKIP_ACCESS_DEV=true` 使 admin/review/ops 在 test 下无需 Cloudflare Access 即可访问，仅供测试。

## 部署方式（本沙箱环境）

- 沙箱内 wrangler CLI 无法登录（无交互、无 `CLOUDFLARE_API_TOKEN`）。完整部署走 Cloudflare API（插件 MCP + curl）：
  1. `wrangler deploy --dry-run --env test --outdir=dist-test` 本地打包（无需鉴权）
  2. 静态资源清单哈希 = `blake3(base64(文件内容)+扩展名).hex.slice(0,32)`（与 wrangler `src/pages/hash.ts` 一致）
  3. `POST /accounts/{id}/workers/scripts/lantai-test/assets-upload-session` 建会话 → 用返回的会话 JWT `POST /accounts/{id}/workers/assets/upload?base64=true` 上传资源（需带 `Authorization: Bearer <jwt>`，用 curl）
  4. `PUT /accounts/{id}/workers/scripts/lantai-test` multipart 上传脚本：metadata = `main_module` + `bindings`（d1 / r2_bucket / assets / plain_text）+ `assets{jwt,config:{run_worker_first}}` + `compatibility_flags:["nodejs_compat"]`
  - 静态资源哈希算法（务必与 wrangler 一致）：`blake3(base64(文件内容) + 扩展名).hex.slice(0,32)`（`blake3-wasm`）。
  - 本地打包输出到 `/tmp/dist-test`（勿留在仓库；`dist/`、`dist-test/` 已在 .gitignore）。

## 前端架构（UI/UX 重构后）

- 纯静态、无构建、无框架：`public/styles.css`（设计系统）+ `public/app.js`（`window.LT` 运行时）+ 各页手写 HTML。
- 页面外壳统一：`skip-link` → `header.topbar[data-lt-topbar]` → `main#main[tabindex=-1]` → `footer.sitefoot[data-lt-footer]`，先 `LT.mountShell({active})` 再渲染内容；控制台页在 `<main>` 内用 `.console` + `nav.sidenav[data-lt-sidenav]`。
- 页面：`index.html`(数据目录) / `dataset.html`(?slug=) / `search.html` / `submit.html` / `status.html` / `admin.html`(编目) / `review.html` / `ops.html` / `docs/*.html`。
- 关键约定写在全量契约 `.uicraft.md`（设计方向、token/类名、`LT.*` API、接口形状、逐页规格、无障碍要求）。**改动前端必须遵守它**。
- 设计方向：档案/典籍馆式编辑型界面；主色靛青、点缀朱砂、成功松绿；支持亮/暗色与 `prefers-reduced-motion`。
- 新增后端接口：`GET /api/admin/session` → `{ actor }`（前端登录态）；`GET /api/submissions/:token` 增加 `schemaVersion` 与 `rejectReason`。
- 质量门禁：`npm run lint`（biome，0 error）、`npm run typecheck`、`npm test` 全绿。`public/docs` 不参与 biome。
- 浏览器验证：Playwright（headless chromium，`--no-sandbox`，经代理）逐页检查外壳/单 h1/控制台无报错/JSON 编辑器对齐。
