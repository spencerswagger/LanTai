import { describe, expect, it } from "vitest";
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

describe("dataset rollback", () => {
  it("rolls latest back to a previous version and keeps every snapshot", async () => {
    const id = await setup("rb-a");
    await postJson(`/api/admin/datasets/${id}/publish`, { payload: { name: "one" } });
    await postJson(`/api/admin/datasets/${id}/publish`, { payload: { name: "two" } });

    const res = await postJson(`/api/admin/datasets/${id}/rollback`, { version: "1" });
    expect(res.status).toBe(200);
    const body = await json<{ rolledBackTo: string; previous: string | null }>(res);
    expect(body.rolledBackTo).toBe("1");
    expect(body.previous).toBe("2");

    const latest = await callApp("/rb-a/latest.json");
    expect(await latest.json()).toMatchObject({ dataVersion: "1" });

    const v1 = await callApp("/rb-a/versions/1.json");
    const v2 = await callApp("/rb-a/versions/2.json");
    expect(v1.status).toBe(200);
    expect(v2.status).toBe(200);
    expect(await v1.json()).toEqual({ name: "one" });
    expect(await v2.json()).toEqual({ name: "two" });

    const manifestRes = await callApp("/rb-a/manifest.json");
    const manifest = await manifestRes.json<{
      latest: string;
      dataVersions: { version: string; isLatest: boolean }[];
    }>();
    expect(manifest.latest).toBe("1");
    expect(manifest.dataVersions.find((v) => v.version === "1")?.isLatest).toBe(true);
    expect(manifest.dataVersions.find((v) => v.version === "2")?.isLatest).toBe(false);
  });

  it("returns 404 when rolling back to an unknown version", async () => {
    const id = await setup("rb-b");
    await postJson(`/api/admin/datasets/${id}/publish`, { payload: { name: "one" } });
    const res = await postJson(`/api/admin/datasets/${id}/rollback`, { version: "9" });
    expect(res.status).toBe(404);
    const body = await json<{ error: { code: string } }>(res);
    expect(body.error.code).toBe("data_version_not_found");
  });
});
