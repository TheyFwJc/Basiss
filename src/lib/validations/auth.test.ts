import { describe, it, expect } from "vitest";
import { signUpSchema, loginSchema, resetPasswordSchema } from "./auth";

describe("signUpSchema", () => {
  it("accepts valid input and lowercases the email", () => {
    const result = signUpSchema.parse({
      name: "Jordan Trader",
      email: "Jordan@Example.com",
      password: "supersecret1",
    });
    expect(result.email).toBe("jordan@example.com");
  });

  it("rejects a password shorter than 8 characters", () => {
    const result = signUpSchema.safeParse({
      name: "Jordan Trader",
      email: "jordan@example.com",
      password: "short",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty name", () => {
    const result = signUpSchema.safeParse({
      name: "",
      email: "jordan@example.com",
      password: "supersecret1",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid email", () => {
    const result = signUpSchema.safeParse({
      name: "Jordan Trader",
      email: "not-an-email",
      password: "supersecret1",
    });
    expect(result.success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("requires a non-empty password", () => {
    const result = loginSchema.safeParse({
      email: "jordan@example.com",
      password: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("resetPasswordSchema", () => {
  it("requires both a token and a valid password", () => {
    const result = resetPasswordSchema.safeParse({
      token: "abc123",
      password: "supersecret1",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a missing token", () => {
    const result = resetPasswordSchema.safeParse({
      token: "",
      password: "supersecret1",
    });
    expect(result.success).toBe(false);
  });
});
