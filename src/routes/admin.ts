import { Hono } from "hono";
import type { AppEnv } from "../env";
import { accessGuard } from "../middleware/access";
import { datasetsAdminRoutes } from "./admin-datasets";

/**
 * 后台路由聚合（Access 保护）。各阶段以子路由模块挂载到此处，
 * 使并行的阶段分支只需新增各自的子路由文件，避免互相冲突。
 */
export const adminApi = new Hono<AppEnv>();

adminApi.use("*", accessGuard);

adminApi.route("/", datasetsAdminRoutes);
