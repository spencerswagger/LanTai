import { beforeEach, describe, expect, it } from "vitest";
import { resetRateLimits } from "../src/submissions/ratelimit";
import { json, postJson } from "./helpers";

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

describe("turnstile verification", () => {
  beforeEach(() => resetRateLimits());

  it("rejects with 400 when a secret is set but the token is missing", async () => {
    await setupFrozen("ts-a");
    const res = await postJson(
      "/api/submissions",
      { slug: "ts-a", payload: { name: "x" } },
      { TURNSTILE_SECRET: "s" },
    );
    expect(res.status).toBe(400);
    expect(await json<{ error: { code: string } }>(res)).toMatchObject({
      error: { code: "turnstile_failed" },
    });
  });

  it("bypasses turnstile when no secret is configured", async () => {
    await setupFrozen("ts-b");
    const res = await postJson(
      "/api/submissions",
      { slug: "ts-b", payload: { name: "x" } },
      { TURNSTILE_SECRET: undefined },
    );
    expect(res.status).toBe(201);
  });
});
