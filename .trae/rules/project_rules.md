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
