import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { nowIso } from "../src/lib/ids";
import { planRetention, runRetention } from "../src/ops/retention";
import { writePreviewPointer } from "../src/publish/pointer";
import { dataSnapshotKey } from "../src/r2/keys";
import { putImmutable } from "../src/r2/store";
import { insertSubmission } from "../src/submissions/repository";
import { json, postJson, testEnv } from "./helpers";

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

async function payloadOf(id: string): Promise<string | undefined> {
  const row = await testEnv()
    .DB.prepare("SELECT payload FROM submission WHERE id = ?")
    .bind(id)
    .first<{ payload: string }>();
  return row?.payload;
}

describe("retention (non-production only)", () => {
  it("plans orphans and clears them on confirmation, leaving published artifacts intact", async () => {
    const datasetId = await setup("ret-a");
    await postJson(`/api/admin/datasets/${datasetId}/publish`, { payload: { name: "base" } });

    await putImmutable(env.BUCKET, dataSnapshotKey("ret-a", "preview-current"), { name: "cur" });
    await putImmutable(env.BUCKET, dataSnapshotKey("ret-a", "preview-orphan"), { name: "old" });
    await writePreviewPointer(env.BUCKET, "ret-a", {
      dataset: "ret-a",
      dataVersion: "preview-current",
      schemaVersion: "1.0.0",
      stagedAt: nowIso(),
      nonProduction: true,
    });

    const oldId = crypto.randomUUID();
    await insertSubmission(testEnv(), {
      id: oldId,
      datasetId,
      slug: "ret-a",
      schemaVersion: "1.0.0",
      status: "rejected",
      token: `tok_${"r".repeat(40)}`,
      payload: { name: "secret" },
    }).run();
    await testEnv()
      .DB.prepare("UPDATE submission SET created_at = ? WHERE id = ?")
      .bind(new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), oldId)
      .run();

    const recentId = crypto.randomUUID();
    await insertSubmission(testEnv(), {
      id: recentId,
      datasetId,
      slug: "ret-a",
      schemaVersion: "1.0.0",
      status: "rejected",
      token: `tok_${"s".repeat(40)}`,
      payload: { name: "keep" },
    }).run();

    const plan = await planRetention(testEnv());
    expect(plan.previewSnapshots).toContain("ret-a/versions/preview-orphan.json");
    expect(plan.previewSnapshots).not.toContain("ret-a/versions/preview-current.json");
    expect(plan.rejectedSubmissions).toContain(oldId);
    expect(plan.rejectedSubmissions).not.toContain(recentId);

    const dry = await runRetention(testEnv(), "ops@test", false);
    expect(dry.confirmed).toBe(false);
    expect(await env.BUCKET.head("ret-a/versions/preview-orphan.json")).not.toBeNull();

    const applied = await runRetention(testEnv(), "ops@test", true);
    expect(applied.confirmed).toBe(true);
    expect(applied.deletedPreviews).toBeGreaterThanOrEqual(1);

    expect(await env.BUCKET.head("ret-a/versions/preview-orphan.json")).toBeNull();
    expect(await env.BUCKET.head("ret-a/versions/preview-current.json")).not.toBeNull();
    expect(await env.BUCKET.head("ret-a/latest.json")).not.toBeNull();
    expect(await env.BUCKET.head("ret-a/versions/1.json")).not.toBeNull();

    expect(await payloadOf(oldId)).toBe("");
    expect(await payloadOf(recentId)).not.toBe("");
  });
});
