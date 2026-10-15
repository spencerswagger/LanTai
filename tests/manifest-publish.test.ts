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

interface ManifestBody {
  latest: string | null;
  preview: string | null;
  dataVersions: { version: string; publishedAt: string; isLatest: boolean; isPreview: boolean }[];
}

describe("manifest after publishing", () => {
  it("rebuilds the manifest with all published versions and marks the latest", async () => {
    const id = await setup("mp-a");
    await postJson(`/api/admin/datasets/${id}/publish`, { payload: { name: "one" } });
    await postJson(`/api/admin/datasets/${id}/publish`, { payload: { name: "two" } });

    const manifestRes = await callApp("/mp-a/manifest.json");
    expect(manifestRes.status).toBe(200);
    const manifest = await manifestRes.json<ManifestBody>();

    expect(manifest.latest).toBe("2");
    expect(manifest.dataVersions.map((v) => v.version)).toEqual(["1", "2"]);
    expect(manifest.dataVersions.find((v) => v.version === "2")?.isLatest).toBe(true);
    expect(manifest.dataVersions.find((v) => v.version === "1")?.isLatest).toBe(false);
  });

  it("stages a preview snapshot without touching latest", async () => {
    const id = await setup("mp-b");
    const res = await postJson(`/api/admin/datasets/${id}/stage`, { payload: { name: "staged" } });
    expect(res.status).toBe(201);
    const body = await json<{ previewVersion: string; pointer: { nonProduction: boolean } }>(res);
    expect(body.previewVersion.startsWith("preview-")).toBe(true);
    expect(body.pointer.nonProduction).toBe(true);

    const preview = await callApp("/mp-b/preview.json");
    expect(preview.status).toBe(200);
    expect(await preview.json()).toMatchObject({ dataVersion: body.previewVersion });

    const snapshot = await callApp(`/mp-b/versions/${body.previewVersion}.json`);
    expect(snapshot.status).toBe(200);
    expect(await snapshot.json()).toEqual({ name: "staged" });

    const latest = await callApp("/mp-b/latest.json");
    expect(latest.status).toBe(404);

    const versions = await callApp(`/api/admin/datasets/${id}/versions`);
    const listed = await json<{ versions: unknown[] }>(versions);
    expect(listed.versions.length).toBe(0);
  });

  it("keeps the preview pointer when publishing afterwards", async () => {
    const id = await setup("mp-c");
    const staged = await postJson(`/api/admin/datasets/${id}/stage`, { payload: { name: "pre" } });
    const { previewVersion } = await json<{ previewVersion: string }>(staged);

    await postJson(`/api/admin/datasets/${id}/publish`, { payload: { name: "live" } });

    const manifestRes = await callApp("/mp-c/manifest.json");
    const manifest = await manifestRes.json<ManifestBody>();
    expect(manifest.latest).toBe("1");
    expect(manifest.preview).toBe(previewVersion);
  });
});
