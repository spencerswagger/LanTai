import { beforeEach, describe, expect, it } from "vitest";
import { resetRateLimits } from "../src/submissions/ratelimit";
import { callApp, json, postJson } from "./helpers";

const schema = {
  type: "object",
  properties: { name: { type: "string" } },
  required: ["name"],
};

async function setupFrozen(slug: string): Promise<void> {
  const res = await postJson("/api/admin/datasets", { slug, title: slug, schema });
  const { dataset } = await json<{ dataset: { id: string } }>(res);
  await postJson(`/api/admin/datasets/${dataset.id}/freeze`, { version: "1.0.0" });
}

function postFrom(slug: string, ip: string): Promise<Response> {
  return callApp("/api/submissions", {
    method: "POST",
    headers: { "content-type": "application/json", "CF-Connecting-IP": ip },
    body: JSON.stringify({ slug, payload: { name: "x" } }),
  });
}

describe("application rate limit", () => {
  beforeEach(() => resetRateLimits());

  it("rejects the 6th submission from the same IP with 429", async () => {
    await setupFrozen("rl-a");
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) {
      statuses.push((await postFrom("rl-a", "203.0.113.7")).status);
    }
    expect(statuses.slice(0, 5)).toEqual([201, 201, 201, 201, 201]);
    expect(statuses[5]).toBe(429);
  });

  it("returns rate_limited with a retryAfter hint", async () => {
    await setupFrozen("rl-b");
    let res = await postFrom("rl-b", "198.51.100.9");
    for (let i = 0; i < 5 && res.status === 201; i++) {
      res = await postFrom("rl-b", "198.51.100.9");
    }
    expect(res.status).toBe(429);
    const body = await json<{ error: { code: string; details: { retryAfter: number } } }>(res);
    expect(body.error.code).toBe("rate_limited");
    expect(body.error.details.retryAfter).toBeGreaterThan(0);
  });

  it("tracks different IPs independently", async () => {
    await setupFrozen("rl-c");
    for (let i = 0; i < 5; i++) {
      expect((await postFrom("rl-c", "192.0.2.1")).status).toBe(201);
    }
    expect((await postFrom("rl-c", "192.0.2.2")).status).toBe(201);
  });
});
