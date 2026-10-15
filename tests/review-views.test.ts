import { beforeEach, describe, expect, it } from "vitest";
import { resetRateLimits } from "../src/submissions/ratelimit";
import { callApp, json, postJson } from "./helpers";

const schema = {
  type: "object",
  properties: {
    name: { type: "string", title: "名称" },
    value: { type: "number", title: "数值" },
  },
  required: ["name"],
};

interface RenderField {
  key: string;
  title: string;
  type: string;
  value: unknown;
  children?: RenderField[];
}

interface Views {
  submission: Record<string, unknown>;
  schema: unknown;
  render: RenderField[];
  jsonTree: unknown;
  diff: { path: string; kind: string; before?: unknown; after?: unknown }[];
  diffBase: string;
  current: unknown;
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

describe("review views", () => {
  beforeEach(() => resetRateLimits());

  it("assembles the three views for a pending submission", async () => {
    await setupFrozen("rv-a");
    const submissionId = await submit("rv-a", { name: "Alice" });

    const res = await callApp(`/api/admin/submissions/${submissionId}`);
    expect(res.status).toBe(200);
    const views = await json<Views>(res);

    expect(views.submission).toMatchObject({
      slug: "rv-a",
      status: "pending",
      schemaVersion: "1.0.0",
    });
    expect(views.submission).not.toHaveProperty("payload");
    expect(views.submission).not.toHaveProperty("token");
    expect(views.jsonTree).toEqual({ name: "Alice" });
    expect(views.current).toBeNull();
    expect(views.diffBase).toBe("latest-published");

    expect(views.diff).toEqual([
      { path: "", kind: "changed", before: null, after: { name: "Alice" } },
    ]);

    const nameField = views.render.find((field) => field.key === "name");
    expect(nameField).toEqual({ key: "name", title: "名称", type: "string", value: "Alice" });
  });

  it("diffs the candidate against the latest published snapshot", async () => {
    const datasetId = await setupFrozen("rv-b");
    await postJson(`/api/admin/datasets/${datasetId}/publish`, {
      payload: { name: "Base", value: 1 },
    });
    const submissionId = await submit("rv-b", { name: "Base", value: 2 });

    const views = await json<Views>(await callApp(`/api/admin/submissions/${submissionId}`));
    expect(views.current).toEqual({ name: "Base", value: 1 });
    expect(views.diff).toEqual([{ path: "/value", kind: "changed", before: 1, after: 2 }]);
  });

  it("returns 404 for an unknown submission", async () => {
    const res = await callApp(`/api/admin/submissions/${crypto.randomUUID()}`);
    expect(res.status).toBe(404);
  });
});
