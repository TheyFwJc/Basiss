import { describe, it, expect } from "vitest";
import { generateResetToken, hashResetToken } from "./tokens";

describe("generateResetToken", () => {
  it("produces a raw token whose hash matches hashResetToken", () => {
    const { rawToken, hashedToken } = generateResetToken();
    expect(hashResetToken(rawToken)).toBe(hashedToken);
  });

  it("produces different tokens on each call", () => {
    const a = generateResetToken();
    const b = generateResetToken();
    expect(a.rawToken).not.toBe(b.rawToken);
    expect(a.hashedToken).not.toBe(b.hashedToken);
  });

  it("never reveals the raw token via its hash", () => {
    const { rawToken, hashedToken } = generateResetToken();
    expect(hashedToken).not.toBe(rawToken);
  });
});
