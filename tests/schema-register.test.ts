import { describe, expect, it } from "vitest";
import { json, postJson } from "./helpers";

const schema = {
  type: "object",
  properties: { name: { type: "string" } },
  required: ["name"],
};

describe("POST /api/admin/datasets", () => {
  it("registers a dataset with a first schema draft", async () => {
    const res = await postJson("/api/admin/datasets", {
      slug: "demo",
      title: "示例数据集",
      schema,
    });
    expect(res.status).toBe(201);
    const body = await json<{ dataset: { slug: string }; schemaVersion: string }>(res);
    expect(body.dataset.slug).toBe("demo");
    expect(body.schemaVersion).toBe("1.0.0");
  });

  it("rejects a duplicate slug with 409", async () => {
    await postJson("/api/admin/datasets", { slug: "dup", title: "A", schema });
    const res = await postJson("/api/admin/datasets", { slug: "dup", title: "B", schema });
    expect(res.status).toBe(409);
  });

  it("rejects an invalid slug with 400", async () => {
    const res = await postJson("/api/admin/datasets", { slug: "Bad Slug", title: "x", schema });
    expect(res.status).toBe(400);
  });

  it("rejects an invalid JSON Schema with 400", async () => {
    const res = await postJson("/api/admin/datasets", {
      slug: "bad-schema",
      title: "x",
      schema: { type: "not-a-type" },
    });
    expect(res.status).toBe(400);
  });
});
