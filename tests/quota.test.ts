import { describe, expect, it } from "vitest";
import { evaluateQuota, runQuotaCheck } from "../src/ops/quota";
import { testEnv } from "./helpers";

describe("quota", () => {
  it("grades usage at the 0.8 and 1.0 boundaries", () => {
    const thresholds = { requestsPerDay: 1000 };
    expect(evaluateQuota({ requestsToday: 799 }, thresholds).level).toBe("ok");
    expect(evaluateQuota({ requestsToday: 800 }, thresholds).level).toBe("warn");
    expect(evaluateQuota({ requestsToday: 999 }, thresholds).level).toBe("warn");
    expect(evaluateQuota({ requestsToday: 1000 }, thresholds).level).toBe("critical");
    expect(evaluateQuota({ requestsToday: 799 }, thresholds).ratio).toBeCloseTo(0.799);
  });

  it("does not alert while usage stays within threshold", async () => {
    const result = await runQuotaCheck(testEnv(), { requestsToday: 10 });
    expect(result.alerted).toBe(false);
    expect(result.evaluation.level).toBe("ok");
  });

  it("alerts and records an audit when over threshold without mail configured", async () => {
    const e = testEnv({ ADMIN_FALLBACK_EMAIL: "admin@test", MAIL_ENDPOINT: undefined });
    const result = await runQuotaCheck(e, { requestsToday: 90000 });

    expect(result.alerted).toBe(true);
    expect(result.evaluation.level).toBe("critical");
    expect(result.mailed).toBe(false);

    const row = await e.DB.prepare("SELECT COUNT(*) AS n FROM audit_log WHERE action = ?")
      .bind("ops.quota.alert")
      .first<{ n: number }>();
    expect(row?.n).toBeGreaterThan(0);
  });
});
