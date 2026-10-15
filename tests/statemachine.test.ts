import { describe, expect, it } from "vitest";
import { ConflictError } from "../src/lib/errors";
import {
  assertTransition,
  canTransition,
  type SubmissionStatus,
  TERMINAL,
} from "../src/review/state-machine";

function expectIllegalTransition(from: SubmissionStatus, to: SubmissionStatus) {
  let caught: unknown;
  try {
    assertTransition(from, to);
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(ConflictError);
  expect((caught as ConflictError).code).toBe("illegal_transition");
}

describe("submission state machine", () => {
  it("allows the legal review transitions", () => {
    expect(canTransition("pending", "staged")).toBe(true);
    expect(canTransition("pending", "rejected")).toBe(true);
    expect(canTransition("staged", "published")).toBe(true);
    expect(canTransition("staged", "rejected")).toBe(true);
  });

  it("rejects the illegal pending -> published jump", () => {
    expect(canTransition("pending", "published")).toBe(false);
    expectIllegalTransition("pending", "published");
  });

  it("treats published and rejected as terminal states", () => {
    expect(TERMINAL.has("published")).toBe(true);
    expect(TERMINAL.has("rejected")).toBe(true);
    expect(canTransition("published", "rejected")).toBe(false);
    expect(canTransition("rejected", "staged")).toBe(false);
    expectIllegalTransition("published", "rejected");
  });
});
