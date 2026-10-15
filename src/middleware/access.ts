import { createMiddleware } from "hono/factory";
import type { AppEnv } from "../env";
import { errorBody } from "../lib/response";

interface AccessRuntime {
  access?: {
    getIdentity(): Promise<{ email?: string } | undefined>;
  };
}

/**
 * 后台鉴权：Cloudflare Access 已在边缘完成校验，Worker 内直接读取身份。
 * 支持三种来源：Cloudflare Access 运行时身份（ctx.access）、Access 注入请求头、
 * 以及本地开发开关（SKIP_ACCESS_DEV）。未认证时：/api/* 返回 401 JSON，
 * 页面路径 302 跳转 Access 登录。
 */
export const accessGuard = createMiddleware<AppEnv>(async (c, next) => {
  if (c.env.SKIP_ACCESS_DEV === "true") {
    c.set("accessIdentity", { email: "dev@localhost" });
    return next();
  }

  let email = c.req.header("Cf-Access-Authenticated-User-Email") ?? null;
  const ctx = c.executionCtx as unknown as AccessRuntime;
  if (!email && ctx.access) {
    try {
      const identity = await ctx.access.getIdentity();
      email = identity?.email ?? null;
    } catch {
      email = null;
    }
  }

  if (!email) {
    const url = new URL(c.req.url);
    if (url.pathname.startsWith("/api/")) {
      return c.json(errorBody("unauthorized", "需要 Cloudflare Access 鉴权"), 401);
    }
    const login = new URL("/cdn-cgi/access/login", url.origin);
    login.searchParams.set("redirect_url", url.pathname + url.search);
    return c.redirect(login.toString(), 302);
  }

  c.set("accessIdentity", { email });
  return next();
});

export function currentActor(c: {
  get(key: "accessIdentity"): { email: string } | null;
}): string | null {
  const identity = c.get("accessIdentity");
  return identity?.email ?? null;
}
