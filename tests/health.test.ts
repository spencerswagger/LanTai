import { describe, expect, it } from "vitest";
import { callApp, json } from "./helpers";

describe("GET /api/health", () => {
  it("returns ok", async () => {
    const res = await callApp("/api/health");
    expect(res.status).toBe(200);
    expect(await json(res)).toMatchObject({ ok: true, service: "lantai" });
  });
});
