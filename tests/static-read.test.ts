import { describe, expect, it } from "vitest";
import { callApp, json, postJson } from "./helpers";

const schema = {
  type: "object",
  properties: { name: { type: "string" } },
  required: ["name"],
};

async function setup(slug: string): Promise<void> {
  const res = await postJson("/api/admin/datasets", { slug, title: slug, schema });
  const { dataset } = await json<{ dataset: { id: string } }>(res);
  await postJson(`/api/admin/datasets/${dataset.id}/freeze`, { version: "1.0.0" });
}

/**
 * 读取出口的常态语义（ALLOW_DEV_STATIC 已退役，dev / preprod / prod 同一套读取出口）。
 * 更细的缓存头 / 404 / 响应头白名单断言见 tests/read-egress.test.ts。
 */
describe("static read endpoints (public read egress)", () => {
  it("serves the frozen schema, catalog index and manifest", async () => {
    await setup("read-a");

    const schemaRes = await callApp("/schemas/read-a/1.0.0.json");
    expect(schemaRes.status).toBe(200);
    expect(await schemaRes.json()).toMatchObject({ type: "object" });

    const indexRes = await callApp("/index.json");
    expect(indexRes.status).toBe(200);
    const catalog = await indexRes.json<{ datasets: { slug: string }[] }>();
    expect(catalog.datasets.some((d) => d.slug === "read-a")).toBe(true);

    const manifestRes = await callApp("/read-a/manifest.json");
    expect(manifestRes.status).toBe(200);
    const manifest = await manifestRes.json<{ schema: { version: string } }>();
    expect(manifest.schema.version).toBe("1.0.0");
  });

  it("returns 404 for a non-existent static object", async () => {
    const res = await callApp("/schemas/nope/9.9.9.json");
    expect(res.status).toBe(404);
  });
});
