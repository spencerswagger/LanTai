import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { PLATFORM_INDEX_KEY, schemaKey } from "../src/r2/keys";
import { putImmutable } from "../src/r2/store";
import { json, postJson } from "./helpers";

const schema = {
  type: "object",
  properties: { name: { type: "string" } },
  required: ["name"],
};

async function registerAndFreeze(slug: string): Promise<void> {
  const res = await postJson("/api/admin/datasets", { slug, title: slug, schema });
  const { dataset } = await json<{ dataset: { id: string } }>(res);
  await postJson(`/api/admin/datasets/${dataset.id}/freeze`, { version: "1.0.0" });
}

describe("R2 materialization", () => {
  it("writes the frozen schema with immutable cache headers", async () => {
    await registerAndFreeze("mat-a");
    const object = await env.BUCKET.get(schemaKey("mat-a", "1.0.0"));
    expect(object).not.toBeNull();
    expect(await object?.json()).toMatchObject({ type: "object" });
    expect(object?.httpMetadata?.cacheControl).toContain("immutable");
  });

  it("upserts the platform catalog index", async () => {
    await registerAndFreeze("mat-b");
    const object = await env.BUCKET.get(PLATFORM_INDEX_KEY);
    const catalog = await object?.json<{ datasets: { slug: string }[] }>();
    expect(catalog?.datasets.some((d) => d.slug === "mat-b")).toBe(true);
  });

  it("refuses to overwrite an immutable key", async () => {
    await registerAndFreeze("mat-c");
    await expect(
      putImmutable(env.BUCKET, schemaKey("mat-c", "1.0.0"), { type: "object" }),
    ).rejects.toThrow();
  });
});
