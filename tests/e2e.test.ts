import { beforeEach, describe, expect, it } from "vitest";
import { resetRateLimits } from "../src/submissions/ratelimit";
import { callApp, json, postJson } from "./helpers";

const schema = {
  type: "object",
  properties: { name: { type: "string", title: "名称" } },
  required: ["name"],
};

describe("review e2e", () => {
  beforeEach(() => resetRateLimits());

  it("flows anonymous submit -> views -> stage -> promote -> published", async () => {
    const reg = await postJson("/api/admin/datasets", {
      slug: "e2e-a",
      title: "e2e-a",
      schema,
    });
    const { dataset } = await json<{ dataset: { id: string } }>(reg);
    await postJson(`/api/admin/datasets/${dataset.id}/freeze`, { version: "1.0.0" });

    const created = await postJson("/api/submissions", { slug: "e2e-a", payload: { name: "Ada" } });
    expect(created.status).toBe(201);
    const { submissionId, token } = await json<{ submissionId: string; token: string }>(created);

    const viewsRes = await callApp(`/api/admin/submissions/${submissionId}`);
    expect(viewsRes.status).toBe(200);
    const views = await json<{ jsonTree: unknown; diffBase: string; render: unknown[] }>(viewsRes);
    expect(views.jsonTree).toEqual({ name: "Ada" });
    expect(views.diffBase).toBe("latest-published");
    expect(views.render.length).toBe(1);

    const staged = await postJson(`/api/admin/submissions/${submissionId}/stage`, {});
    expect(staged.status).toBe(200);
    expect(await json<{ status: string }>(staged)).toMatchObject({ status: "staged" });

    const promoted = await postJson(`/api/admin/submissions/${submissionId}/promote`, {});
    expect(promoted.status).toBe(200);
    expect(await json<{ status: string }>(promoted)).toMatchObject({ status: "published" });

    const statusRes = await callApp(`/api/submissions/${token}`);
    expect(statusRes.status).toBe(200);
    expect(await json<{ slug: string; status: string }>(statusRes)).toMatchObject({
      slug: "e2e-a",
      status: "published",
    });
  });
});
