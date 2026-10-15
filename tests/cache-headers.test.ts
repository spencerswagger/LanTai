import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { CACHE_POLICY, cacheClassForPath } from "../src/ops/cache";
import { cacheControlForKey } from "../src/r2/keys";
import { json, postJson } from "./helpers";

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

async function cacheControlOf(key: string): Promise<string | undefined> {
  return (await env.BUCKET.head(key))?.httpMetadata?.cacheControl;
}

describe("cache layering", () => {
  it("classifies public read paths", () => {
    expect(cacheClassForPath("/cache-a/versions/1.json")).toBe("immutable");
    expect(cacheClassForPath("/schemas/cache-a/1.0.0.json")).toBe("immutable");
    expect(cacheClassForPath("/cache-a/latest.json")).toBe("pointer");
    expect(cacheClassForPath("/cache-a/preview.json")).toBe("pointer");
    expect(cacheClassForPath("/index.json")).toBe("index");
    expect(cacheClassForPath("/search/index.json")).toBe("index");
    expect(cacheClassForPath("/nope.txt")).toBeNull();
  });

  it("applies the matching cache-control metadata per layer", async () => {
    const id = await setup("cache-a");
    await postJson(`/api/admin/datasets/${id}/publish`, { payload: { name: "x" } });

    expect(await cacheControlOf("cache-a/versions/1.json")).toBe(
      cacheControlForKey("cache-a/versions/1.json"),
    );
    expect(await cacheControlOf("cache-a/versions/1.json")).toContain("immutable");
    expect(await cacheControlOf("schemas/cache-a/1.0.0.json")).toContain("immutable");
    expect(await cacheControlOf("cache-a/latest.json")).toBe(CACHE_POLICY.pointer.cacheControl);
    expect(await cacheControlOf("index.json")).toBe(CACHE_POLICY.index.cacheControl);
    expect(await cacheControlOf("search/index.json")).toBe(CACHE_POLICY.index.cacheControl);
  });
});
