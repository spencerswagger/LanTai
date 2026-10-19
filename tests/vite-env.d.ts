/// <reference types="vite/client" />

// 测试侧依赖 Vite 的 `?raw` 后缀导入（读取 scripts/seed-demo.mjs 正文做种子护栏断言）。
// 引入 vite/client 类型的范围仅限 tests/ 目录，不影响 Worker 源码。
