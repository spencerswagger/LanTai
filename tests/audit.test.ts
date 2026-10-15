import { beforeEach, describe, expect, it } from "vitest";
import { resetRateLimits } from "../src/submissions/ratelimit";
import { json, postJson, testEnv } from "./helpers";

const schema = {
  type: "object",
  properties: { name: { type: "string" } },
  required: ["name"],
};

interface AuditRow {
  actor: string | null;
  action: string;
  target: string | null;
  detail: string | null;
}

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

async function auditRows(action: string): Promise<AuditRow[]> {
  const result = await testEnv()
    .DB.prepare("SELECT actor, action, target, detail FROM audit_log WHERE action = ?")
    .bind(action)
    .all<AuditRow>();
  return result.results ?? [];
}

describe("review audit trail", () => {
  beforeEach(() => resetRateLimits());

  it("records review.stage / review.promote / review.reject with the actor", async () => {
    const datasetId = await setupFrozen("au-a");
    await postJson(`/api/admin/datasets/${datasetId}/publish`, { payload: { name: "base" } });

    const promotedId = await submit("au-a", { name: "one" });
    await postJson(`/api/admin/submissions/${promotedId}/stage`, {});
    await postJson(`/api/admin/submissions/${promotedId}/promote`, {});

    const rejectedId = await submit("au-a", { name: "two" });
    await postJson(`/api/admin/submissions/${rejectedId}/reject`, { reason: "not needed" });

    const stage = await auditRows("review.stage");
    expect(stage).toHaveLength(1);
    expect(stage[0]).toMatchObject({ actor: "dev@localhost", target: promotedId });

    const promote = await auditRows("review.promote");
    expect(promote).toHaveLength(1);
    expect(promote[0]).toMatchObject({ actor: "dev@localhost", target: promotedId });
    expect(JSON.parse(promote[0].detail ?? "{}")).toMatchObject({ dataVersion: "2" });

    const reject = await auditRows("review.reject");
    expect(reject).toHaveLength(1);
    expect(reject[0]).toMatchObject({ actor: "dev@localhost", target: rejectedId });
    expect(JSON.parse(reject[0].detail ?? "{}")).toMatchObject({ reason: "not needed" });
  });
});
