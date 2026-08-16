import { describe, it, expect } from "vitest";
import { WELCOME_BACK_MESSAGES, pickWelcomeBackMessage } from "./welcome-messages";

describe("pickWelcomeBackMessage", () => {
  it("always returns one of the known messages", () => {
    for (const random of [0, 0.25, 0.5, 0.75, 0.999999]) {
      expect(WELCOME_BACK_MESSAGES).toContain(pickWelcomeBackMessage(() => random));
    }
  });

  it("picks the first message when random() returns 0", () => {
    expect(pickWelcomeBackMessage(() => 0)).toBe(WELCOME_BACK_MESSAGES[0]);
  });

  it("picks the last message just under the top of the range", () => {
    expect(pickWelcomeBackMessage(() => 0.999999)).toBe(
      WELCOME_BACK_MESSAGES[WELCOME_BACK_MESSAGES.length - 1]
    );
  });
});
