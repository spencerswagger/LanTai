import { describe, expect, it } from "vitest";
import { collectTerms, fieldsFromSchema } from "../src/ops/search-index";
import { callApp, json, postJson } from "./helpers";

const schema = {
  type: "object",
  properties: { name: { type: "string", title: "名称" }, age: { type: "number" } },
  required: ["name"],
};

interface SearchField {
  name: string;
  title: string | null;
  type: string | null;
}

interface SearchDoc {
  slug: string;
  title: string;
  schemaVersion: string | null;
  dataVersion: string | null;
  fields: SearchField[];
  terms: string[];
}

interface GlobalSearchDoc {
  slug: string;
  title: string;
  schemaVersion: string | null;
  dataVersion: string | null;
  fields: SearchField[];
  termCount: number;
}

interface GlobalSearchIndex {
  generatedAt: string;
  datasets: GlobalSearchDoc[];
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
    const global = await json<GlobalSearchIndex>(globalRes);
    expect(typeof global.generatedAt).toBe("string");
    const doc = global.datasets.find((d) => d.slug === "search-a");
    expect(doc).toBeDefined();
    expect(doc?.schemaVersion).toBe("1.0.0");
    expect(doc?.dataVersion).toBe("1");
    expect(doc?.fields.map((f) => f.name)).toEqual(["name", "age"]);
    expect(doc?.fields[0]).toEqual({ name: "name", title: "名称", type: "string" });
    // 全局条目为精简形状：含 termCount，不内联 terms。
    expect(doc?.termCount).toBe(1);
    expect(doc && "terms" in doc).toBe(false);

    const perRes = await callApp("/search-a/search-index.json");
    expect(perRes.status).toBe(200);
    const perDoc = await json<SearchDoc>(perRes);
    expect(perDoc.slug).toBe("search-a");
    expect(perDoc.fields.length).toBe(2);
    // 完整 terms 落在 per-dataset 索引，且与全局 termCount 一致。
    expect(perDoc.terms).toContain("alice");
    expect(perDoc.terms.length).toBe(doc?.termCount);
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

  it("covers all string names in termCount even with a large payload", async () => {
    const id = await setup("search-large");
    const rows = Array.from({ length: 5000 }, (_, i) => ({ name: `名称${i}` }));
    await postJson(`/api/admin/datasets/${id}/publish`, {
      payload: { name: "根节点", rows, meta: { code: 7 } },
    });

    // per-dataset 索引保留完整 terms：5000 个字符串 name + 1 个根名称 + 1 个数字，全部覆盖。
    const perRes = await callApp("/search-large/search-index.json");
    const perDoc = await json<SearchDoc>(perRes);
    expect(perDoc.terms).toContain("名称0");
    expect(perDoc.terms).toContain("名称4999");
    expect(perDoc.terms).toContain("根节点");
    expect(perDoc.terms).toContain("7");
    expect(perDoc.terms.length).toBe(5002);

    // 全局索引的 termCount 覆盖全部字符串（不再被数字挤掉），且不含 terms。
    const global = await json<GlobalSearchIndex>(await callApp("/search/index.json"));
    const doc = global.datasets.find((d) => d.slug === "search-large");
    expect(doc?.termCount).toBe(5002);
    expect(doc && "terms" in doc).toBe(false);
  });
});

describe("search index internals", () => {
  it("resolves a recursive local $ref schema into searchable fields", () => {
    const refSchema = {
      type: "array",
      items: { $ref: "#/$defs/node" },
      $defs: {
        node: {
          type: "object",
          properties: {
            id: { type: "integer", title: "编号" },
            name: { type: "string", title: "名称" },
            level: { type: "integer" },
            children: { type: "array", items: { $ref: "#/$defs/node" } },
          },
        },
      },
    };

    const fields = fieldsFromSchema(JSON.stringify(refSchema));
    expect(fields.map((f) => f.name)).toEqual(["id", "name", "level", "children"]);
    expect(fields[1]).toEqual({ name: "name", title: "名称", type: "string" });
  });

  it("keeps deep string names in terms despite thousands of numeric fields", () => {
    const rows = Array.from({ length: 3000 }, (_, i) => ({ id: i, level: 3 }));
    const snapshot = { rows, meta: { deep: { deeper: { name: "深层机密名称" } } } };

    const terms = new Set<string>();
    collectTerms(snapshot, terms);

    // 旧实现会在遍历 rows 时被 6000 个数字占满 2000 预算，根本到不了 meta 就中断。
    expect(terms.has("深层机密名称")).toBe(true);
    expect(terms.has("2999")).toBe(true);
  });

  it("collects every string term before spending budget on numbers", () => {
    const rows = Array.from({ length: 5000 }, (_, i) => ({ name: `名称${i}` }));
    const snapshot = { rows, meta: { code: 7, flag: 1 } };

    const terms = new Set<string>();
    collectTerms(snapshot, terms);

    // 5000 个字符串全部保留，数字按剩余预算补入，字符串不被数字挤掉。
    expect(terms.has("名称0")).toBe(true);
    expect(terms.has("名称4999")).toBe(true);
    expect(terms.has("7")).toBe(true);
    expect(terms.has("1")).toBe(true);
    expect(terms.size).toBe(5002);
  });
});
