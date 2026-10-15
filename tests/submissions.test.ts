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

describe("public submissions", () => {
  beforeEach(() => resetRateLimits());

  it("accepts an anonymous submission and returns a tracking token", async () => {
    await setupFrozen("sub-a");
    const res = await postJson("/api/submissions", { slug: "sub-a", payload: { name: "Alice" } });
    expect(res.status).toBe(201);
    const body = await json<{ submissionId: string; token: string; status: string }>(res);
    expect(body.status).toBe("pending");
    expect(body.token.length).toBeGreaterThanOrEqual(20);

    const statusRes = await callApp(`/api/submissions/${body.token}`);
    expect(statusRes.status).toBe(200);
    const status = await json<Record<string, unknown>>(statusRes);
    expect(status).toMatchObject({ slug: "sub-a", status: "pending" });
    expect("payload" in status).toBe(false);
  });

  it("rejects a payload violating the frozen schema with 400", async () => {
    await setupFrozen("sub-b");
    const res = await postJson("/api/submissions", { slug: "sub-b", payload: { name: 123 } });
    expect(res.status).toBe(400);
    expect(await json<{ error: { code: string } }>(res)).toMatchObject({
      error: { code: "schema_validation_failed" },
    });
  });

  it("rejects a submission for a dataset without a frozen schema with 409", async () => {
    await postJson("/api/admin/datasets", { slug: "sub-c", title: "sub-c", schema });
    const res = await postJson("/api/submissions", { slug: "sub-c", payload: { name: "x" } });
    expect(res.status).toBe(409);
  });

  it("returns 404 for an unknown token", async () => {
    const res = await callApp("/api/submissions/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
    expect(res.status).toBe(404);
  });

  it("returns 404 for a missing dataset", async () => {
    const res = await postJson("/api/submissions", { slug: "nope", payload: { name: "x" } });
    expect(res.status).toBe(404);
  });
});
