import { Hono } from "hono";
import type { AppEnv } from "../env";

export const healthApi = new Hono<AppEnv>();

healthApi.get("/health", (c) =>
  c.json({
    ok: true,
    service: "lantai",
    environment: c.env.ENVIRONMENT ?? "development",
  }),
);
