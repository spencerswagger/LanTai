import type { Context } from "hono";
import { BadRequestError } from "./errors";

export async function readJsonBody(c: Context): Promise<Record<string, unknown>> {
  let parsed: unknown;
  try {
    parsed = await c.req.json();
  } catch {
    throw new BadRequestError("invalid_body", "请求体必须是合法 JSON");
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new BadRequestError("invalid_body", "请求体必须是 JSON 对象");
  }
  return parsed as Record<string, unknown>;
}

export function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
}
