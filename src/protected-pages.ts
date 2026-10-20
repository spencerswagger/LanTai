/**
 * 受保护页集合：**唯一声明点**（契约 §1.2 不变式，防「搬家式修复」）。
 *
 * 下面的三处派生必须同源，任何一处单独漂移都会把修复退化成
 * 「把页面从一条无守卫路径搬到另一条」：
 *
 *  1. **守卫挂载** —— `src/index.ts` 在 `/<route>` 上挂 `accessGuard`；
 *  2. **canonical 目标** —— `/<file>` 只 `307` 到 `/<route>`，Worker **永不**直出后台页 HTML；
 *     因此 canonical 目标必须落在 `PROTECTED_ROUTES` 内（由测试断言）。
 *  3. **部署白名单** —— `wrangler.jsonc` 的 `run_worker_first` 必须同时列 `/<route>` 与 `/<file>`；
 *     只列 `.html` 会绕开守卫，只列无扩展名则资产层 canonical 仍会兜住、但白名单与代码就不再同源。
 *
 * 该同源性由 `tests/read-egress.test.ts` 的「受保护页三处同源」用例解析配置文件后断言。
 */
export const PROTECTED_PAGES = {
  admin: "admin.html",
  review: "review.html",
  ops: "ops.html",
} as const;

export type ProtectedRoute = keyof typeof PROTECTED_PAGES;

/** 受保护页的无扩展名路由：canonical 目标 = 守卫挂载点。 */
export const PROTECTED_ROUTES = Object.keys(PROTECTED_PAGES) as ProtectedRoute[];

/** 受保护页的 `.html` 资产文件名：只作 canonical 起点，绝不 servePage。 */
export const PROTECTED_ASSET_FILES = Object.values(PROTECTED_PAGES);
