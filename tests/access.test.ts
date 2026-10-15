import { describe, expect, it } from "vitest";
import { callApp } from "./helpers";

describe("access guard", () => {
  it("redirects /admin to Access login when unauthenticated", async () => {
    const res = await callApp("/admin", {}, { SKIP_ACCESS_DEV: "false" });
    expect(res.status).toBe(302);
    expect(res.headers.get("location") ?? "").toContain("/cdn-cgi/access/login");
  });

  it("returns 401 for /api/admin when unauthenticated", async () => {
    const res = await callApp("/api/admin/datasets", {}, { SKIP_ACCESS_DEV: "false" });
    expect(res.status).toBe(401);
  });

  it("allows /api/admin when Access identity header is present", async () => {
    const res = await callApp(
      "/api/admin/datasets",
      { headers: { "Cf-Access-Authenticated-User-Email": "admin@lantai.test" } },
      { SKIP_ACCESS_DEV: "false" },
    );
    expect(res.status).toBe(200);
  });
});
