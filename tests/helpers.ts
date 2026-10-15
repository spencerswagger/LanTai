import { createExecutionContext, env, waitOnExecutionContext } from "cloudflare:test";
import type { Env } from "../src/env";
import { app } from "../src/index";

const BASE = "https://lantai.test";

export function testEnv(overrides: Partial<Env> = {}): Env {
  return { ...(env as unknown as Env), ...overrides };
}

export async function callApp(
  path: string,
  init?: RequestInit,
  overrides: Partial<Env> = {},
): Promise<Response> {
  const request = new Request(new URL(path, BASE).toString(), init);
  const ctx = createExecutionContext();
  const response = await app.fetch(request, testEnv(overrides), ctx);
  await waitOnExecutionContext(ctx);
  return response;
}

export async function postJson(
  path: string,
  body: unknown,
  overrides: Partial<Env> = {},
): Promise<Response> {
  return callApp(
    path,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    },
    overrides,
  );
}

export async function json<T>(res: Response): Promise<T> {
  return (await res.json()) as T;
}
