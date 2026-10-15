import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { dataSnapshotKey } from "../src/r2/keys";
import { putImmutable } from "../src/r2/store";
import { callApp, json, postJson } from "./helpers";

const schema = {
  type: "object",
  properties: { name: { type: "string" } },
  required: ["name"],
};

async function setup(slug: string): Promise<string> {
  const res = await postJson("/api/admin/datasets", { slug, title: slug, schema });
  const { dataset } = await json<{ dataset: { id: string } }>(res);
  await postJson(`/api/admin/datasets/${dataset.id}/freeze`, { version: "1.0.0" });
  return dataset.id;
}

describe("dataset publishing", () => {
  it("publishes a snapshot and serves latest/version endpoints", async () => {
    const id = await setup("pub-a");
    const res = await postJson(`/api/admin/datasets/${id}/publish`, { payload: { name: "alice" } });
    expect(res.status).toBe(201);
    const body = await json<{ dataVersion: string; r2Key: string; contentHash: string }>(res);
    expect(body.dataVersion).toBe("1");
    expect(body.r2Key).toBe("pub-a/versions/1.json");
    expect(body.contentHash).toMatch(/^[0-9a-f]{64}$/);

    const latest = await callApp("/pub-a/latest.json");
    expect(latest.status).toBe(200);
    expect(await latest.json()).toMatchObject({ dataset: "pub-a", dataVersion: "1" });

    const snapshot = await callApp("/pub-a/versions/1.json");
    expect(snapshot.status).toBe(200);
    expect(await snapshot.json()).toEqual({ name: "alice" });
  });

  it("rejects a payload that violates the frozen schema with 400", async () => {
    const id = await setup("pub-b");
    const res = await postJson(`/api/admin/datasets/${id}/publish`, { payload: { name: 123 } });
    expect(res.status).toBe(400);
    const body = await json<{ error: { code: string; details: { errors: string[] } } }>(res);
    expect(body.error.code).toBe("schema_validation_failed");
    expect(body.error.details.errors.length).toBeGreaterThan(0);
  });

  it("refuses to overwrite an already published snapshot", async () => {
    const id = await setup("pub-c");
    await postJson(`/api/admin/datasets/${id}/publish`, { payload: { name: "first" } });
    await expect(
      putImmutable(env.BUCKET, dataSnapshotKey("pub-c", "1"), { name: "second" }),
    ).rejects.toThrow();
  });
});
