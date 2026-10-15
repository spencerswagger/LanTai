import { describe, expect, it } from "vitest";
import { notifyStatus, sendMail } from "../src/submissions/notify";
import { testEnv } from "./helpers";

describe("notify (cloud-mail)", () => {
  it("skips sending when MAIL_ENDPOINT is not configured", async () => {
    const result = await sendMail(testEnv({ MAIL_ENDPOINT: undefined }), {
      to: "a@b.test",
      subject: "s",
      text: "t",
    });
    expect(result).toEqual({ sent: false, skipped: true });
  });

  it("skips notifyStatus when no email is provided", async () => {
    const result = await notifyStatus(testEnv({ MAIL_ENDPOINT: undefined }), {
      datasetSlug: "demo",
      status: "pending",
      token: "tok_abcdefghijklmnopqrstuvwxyz",
    });
    expect(result).toEqual({ sent: false, skipped: true });
  });
});
