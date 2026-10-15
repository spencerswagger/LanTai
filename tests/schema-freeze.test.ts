import { describe, expect, it } from "vitest";
import { json, postJson } from "./helpers";

const v1 = {
  type: "object",
  properties: { name: { type: "string" } },
  required: ["name"],
};
const v1Compatible = {
  type: "object",
  properties: { name: { type: "string" }, note: { type: "string" } },
  required: ["name"],
};
const v2Breaking = {
  type: "object",
  properties: { name: { type: "number" } },
  required: ["name"],
};

async function register(slug: string, schema: unknown): Promise<string> {
  const res = await postJson("/api/admin/datasets", { slug, title: slug, schema });
  const body = await json<{ dataset: { id: string } }>(res);
  return body.dataset.id;
}

describe("schema freeze", () => {
  it("freezes the first version as 1.0.0 with changeKind initial", async () => {
    const id = await register("freeze-a", v1);
    const res = await postJson(`/api/admin/datasets/${id}/freeze`, { version: "1.0.0" });
    expect(res.status).toBe(200);
    expect(await json(res)).toMatchObject({ frozenVersion: "1.0.0", changeKind: "initial" });
  });

  it("rejects a duplicate freeze with 409", async () => {
    const id = await register("freeze-b", v1);
    await postJson(`/api/admin/datasets/${id}/freeze`, { version: "1.0.0" });
    const res = await postJson(`/api/admin/datasets/${id}/freeze`, { version: "1.0.0" });
    expect(res.status).toBe(409);
  });

  it("accepts a compatible change as a minor bump", async () => {
    const id = await register("freeze-c", v1);
    await postJson(`/api/admin/datasets/${id}/freeze`, { version: "1.0.0" });
    await postJson(`/api/admin/datasets/${id}/schema-versions`, {
      version: "1.1.0",
      schema: v1Compatible,
    });
    const res = await postJson(`/api/admin/datasets/${id}/freeze`, { version: "1.1.0" });
    expect(res.status).toBe(200);
    expect(await json(res)).toMatchObject({ changeKind: "compatible" });
  });

  it("rejects a version mismatch on a breaking change and reports the expected major", async () => {
    const id = await register("freeze-d", v1);
    await postJson(`/api/admin/datasets/${id}/freeze`, { version: "1.0.0" });
    await postJson(`/api/admin/datasets/${id}/schema-versions`, {
      version: "1.1.0",
      schema: v2Breaking,
    });
    const res = await postJson(`/api/admin/datasets/${id}/freeze`, { version: "1.1.0" });
    expect(res.status).toBe(409);
    const body = await json<{ error: { details: { expectedVersion: string } } }>(res);
    expect(body.error.details.expectedVersion).toBe("2.0.0");
  });
});
