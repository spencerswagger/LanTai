import { beforeEach, describe, expect, it } from "vitest";
import { listDataVersions } from "../src/publish/repository";
import { resetRateLimits } from "../src/submissions/ratelimit";
import { insertSubmission } from "../src/submissions/repository";
import { callApp, json, postJson, testEnv } from "./helpers";

const schema = {
  type: "object",
  properties: { name: { type: "string" } },
  required: ["name"],
};

async function setupFrozen(slug: string): Promise<string> {
  const res = await postJson("/api/admin/datasets", { slug, title: slug, schema });
  const { dataset } = await json<{ dataset: { id: string } }>(res);
  await postJson(`/api/admin/datasets/${dataset.id}/freeze`, { version: "1.0.0" });
  return dataset.id;
}

async function submit(slug: string, payload: unknown): Promise<string> {
  const res = await postJson("/api/submissions", { slug, payload });
  const { submissionId } = await json<{ submissionId: string }>(res);
  return submissionId;
}

async function submissionRow(id: string): Promise<{ status: string } | null> {
  return testEnv()
    .DB.prepare("SELECT status FROM submission WHERE id = ?")
    .bind(id)
    .first<{ status: string }>();
}

describe("stage & promote actions", () => {
  beforeEach(() => resetRateLimits());

  it("stages a submission without touching latest and updates the preview pointer", async () => {
    const datasetId = await setupFrozen("sp-a");
    await postJson(`/api/admin/datasets/${datasetId}/publish`, { payload: { name: "base" } });
    const submissionId = await submit("sp-a", { name: "candidate" });

    const res = await postJson(`/api/admin/submissions/${submissionId}/stage`, {});
    expect(res.status).toBe(200);
    const body = await json<{ status: string; previewVersion: string; stagingUrl: string }>(res);
    expect(body.status).toBe("staged");
    expect(body.previewVersion.startsWith("preview-")).toBe(true);
    expect(body.stagingUrl).toBe("/sp-a/preview.json");
    expect((await submissionRow(submissionId))?.status).toBe("staged");

    const latest = await callApp("/sp-a/latest.json");
    expect(await latest.json()).toMatchObject({ dataVersion: "1" });

    const preview = await callApp("/sp-a/preview.json");
    expect(await preview.json()).toMatchObject({ dataVersion: body.previewVersion });

    const snapshot = await callApp(`/sp-a/versions/${body.previewVersion}.json`);
    expect(snapshot.status).toBe(200);
    expect(await snapshot.json()).toEqual({ name: "candidate" });
  });

  it("promotes a staged submission, updating latest and writing a snapshot", async () => {
    const datasetId = await setupFrozen("sp-b");
    await postJson(`/api/admin/datasets/${datasetId}/publish`, { payload: { name: "base" } });
    const submissionId = await submit("sp-b", { name: "next" });
    await postJson(`/api/admin/submissions/${submissionId}/stage`, {});

    const res = await postJson(`/api/admin/submissions/${submissionId}/promote`, {});
    expect(res.status).toBe(200);
    const body = await json<{ status: string; dataVersion: string }>(res);
    expect(body.status).toBe("published");
    expect(body.dataVersion).toBe("2");
    expect((await submissionRow(submissionId))?.status).toBe("published");

    const latest = await callApp("/sp-b/latest.json");
    expect(await latest.json()).toMatchObject({ dataVersion: "2" });

    const snapshot = await callApp("/sp-b/versions/2.json");
    expect(snapshot.status).toBe(200);
    expect(await snapshot.json()).toEqual({ name: "next" });
  });

  it("rejects promoting a schema-invalid payload with 400 and writes no snapshot", async () => {
    const datasetId = await setupFrozen("sp-c");
    await postJson(`/api/admin/datasets/${datasetId}/publish`, { payload: { name: "base" } });

    const submissionId = crypto.randomUUID();
    await insertSubmission(testEnv(), {
      id: submissionId,
      datasetId,
      slug: "sp-c",
      schemaVersion: "1.0.0",
      status: "staged",
      token: `tok_${"a".repeat(40)}`,
      payload: { name: 123 },
    }).run();

    const res = await postJson(`/api/admin/submissions/${submissionId}/promote`, {});
    expect(res.status).toBe(400);
    expect(await json<{ error: { code: string } }>(res)).toMatchObject({
      error: { code: "schema_validation_failed" },
    });

    expect((await submissionRow(submissionId))?.status).toBe("staged");
    expect((await listDataVersions(testEnv(), datasetId)).length).toBe(1);

    const latest = await callApp("/sp-c/latest.json");
    expect(await latest.json()).toMatchObject({ dataVersion: "1" });
  });
});
