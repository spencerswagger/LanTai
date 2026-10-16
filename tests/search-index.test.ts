import { describe, expect, it } from "vitest";
import { callApp, json, postJson } from "./helpers";

const schema = {
  type: "object",
  properties: { name: { type: "string", title: "名称" }, age: { type: "number" } },
  required: ["name"],
};

interface SearchDoc {
  slug: string;
  title: string;
  schemaVersion: string | null;
  dataVersion: string | null;
  fields: { name: string; title: string | null; type: string | null }[];
  terms: string[];
}

async function setup(slug: string): Promise<string> {
  const res = await postJson("/api/admin/datasets", { slug, title: slug, schema });
  const { dataset } = await json<{ dataset: { id: string } }>(res);
  await postJson(`/api/admin/datasets/${dataset.id}/freeze`, { version: "1.0.0" });
  return dataset.id;
}

describe("search index", () => {
  it("rebuilds the global and per-dataset search docs after publish", async () => {
    const id = await setup("search-a");
    await postJson(`/api/admin/datasets/${id}/publish`, { payload: { name: "alice" } });

    const globalRes = await callApp("/search/index.json");
    expect(globalRes.status).toBe(200);
    const global = await json<{ generatedAt: string; datasets: SearchDoc[] }>(globalRes);
    const doc = global.datasets.find((d) => d.slug === "search-a");
    expect(doc).toBeDefined();
    expect(doc?.schemaVersion).toBe("1.0.0");
    expect(doc?.dataVersion).toBe("1");
    expect(doc?.fields.map((f) => f.name)).toEqual(["name", "age"]);
    expect(doc?.fields[0]).toEqual({ name: "name", title: "名称", type: "string" });
    expect(doc?.terms).toContain("alice");

    const perRes = await callApp("/search-a/search-index.json");
    expect(perRes.status).toBe(200);
    const perDoc = await json<SearchDoc>(perRes);
    expect(perDoc.slug).toBe("search-a");
    expect(perDoc.fields.length).toBe(2);
  });

  it("indexes published data values (strings and numbers) for full-text search", async () => {
    const id = await setup("search-b");
    await postJson(`/api/admin/datasets/${id}/publish`, {
      payload: {
        name: "bob",
        age: 42,
        note: null,
        verified: true,
        tags: ["北京", "上海"],
        nested: { city: "广州" },
      },
    });

    const res = await callApp("/search-b/search-index.json");
    const doc = await json<SearchDoc>(res);
    expect(doc.terms).toEqual(expect.arrayContaining(["bob", "42", "北京", "上海", "广州"]));
    expect(doc.terms.every((t) => typeof t === "string")).toBe(true);
  });
});
