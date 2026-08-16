import { describe, it, expect } from "vitest";
import {
  hasPlan,
  hasFeature,
  getEffectivePlan,
  yearlySavingsPercent,
  PLANS,
} from "./plans";

describe("hasPlan", () => {
  it("a plan always satisfies itself", () => {
    expect(hasPlan("FREE", "FREE")).toBe(true);
    expect(hasPlan("PRO", "PRO")).toBe(true);
    expect(hasPlan("PRO_PLUS", "PRO_PLUS")).toBe(true);
  });

  it("a higher plan satisfies a lower requirement", () => {
    expect(hasPlan("PRO", "FREE")).toBe(true);
    expect(hasPlan("PRO_PLUS", "PRO")).toBe(true);
    expect(hasPlan("PRO_PLUS", "FREE")).toBe(true);
  });

  it("a lower plan does not satisfy a higher requirement", () => {
    expect(hasPlan("FREE", "PRO")).toBe(false);
    expect(hasPlan("PRO", "PRO_PLUS")).toBe(false);
    expect(hasPlan("FREE", "PRO_PLUS")).toBe(false);
  });
});

describe("hasFeature", () => {
  it("gates a Pro feature correctly", () => {
    expect(hasFeature("FREE", "ADVANCED_ANALYTICS")).toBe(false);
    expect(hasFeature("PRO", "ADVANCED_ANALYTICS")).toBe(true);
    expect(hasFeature("PRO_PLUS", "ADVANCED_ANALYTICS")).toBe(true);
  });

  it("gates a Pro+ feature correctly", () => {
    expect(hasFeature("FREE", "AI_INSIGHTS")).toBe(false);
    expect(hasFeature("PRO", "AI_INSIGHTS")).toBe(false);
    expect(hasFeature("PRO_PLUS", "AI_INSIGHTS")).toBe(true);
  });
});

describe("getEffectivePlan", () => {
  const now = new Date("2026-08-16T00:00:00Z");

  it("free plan is always free", () => {
    expect(getEffectivePlan({ plan: "FREE", status: "FREE", currentPeriodEnd: null }, now)).toBe(
      "FREE"
    );
  });

  it("active/trialing/past_due grant the stored plan", () => {
    expect(getEffectivePlan({ plan: "PRO", status: "ACTIVE", currentPeriodEnd: null }, now)).toBe(
      "PRO"
    );
    expect(
      getEffectivePlan({ plan: "PRO_PLUS", status: "TRIALING", currentPeriodEnd: null }, now)
    ).toBe("PRO_PLUS");
    expect(getEffectivePlan({ plan: "PRO", status: "PAST_DUE", currentPeriodEnd: null }, now)).toBe(
      "PRO"
    );
  });

  it("canceled but still within the paid period keeps access", () => {
    const future = new Date("2026-08-20T00:00:00Z");
    expect(
      getEffectivePlan({ plan: "PRO", status: "CANCELED", currentPeriodEnd: future }, now)
    ).toBe("PRO");
  });

  it("canceled after the paid period ends downgrades to free", () => {
    const past = new Date("2026-08-01T00:00:00Z");
    expect(
      getEffectivePlan({ plan: "PRO", status: "CANCELED", currentPeriodEnd: past }, now)
    ).toBe("FREE");
  });

  it("canceled with no currentPeriodEnd downgrades immediately", () => {
    expect(
      getEffectivePlan({ plan: "PRO", status: "CANCELED", currentPeriodEnd: null }, now)
    ).toBe("FREE");
  });

  it("incomplete/unpaid grant no access", () => {
    expect(
      getEffectivePlan({ plan: "PRO", status: "INCOMPLETE", currentPeriodEnd: null }, now)
    ).toBe("FREE");
    expect(getEffectivePlan({ plan: "PRO", status: "UNPAID", currentPeriodEnd: null }, now)).toBe(
      "FREE"
    );
  });
});

describe("yearlySavingsPercent", () => {
  it("is zero for a free plan", () => {
    expect(yearlySavingsPercent(PLANS.FREE)).toBe(0);
  });

  it("computes the discount for Pro", () => {
    // 4.99 * 12 = 59.88; yearly 39.99 -> ~33% off
    expect(yearlySavingsPercent(PLANS.PRO)).toBeGreaterThan(30);
    expect(yearlySavingsPercent(PLANS.PRO)).toBeLessThan(36);
  });

  it("computes the discount for Pro+", () => {
    // 9.99 * 12 = 119.88; yearly 79.99 -> ~33% off
    expect(yearlySavingsPercent(PLANS.PRO_PLUS)).toBeGreaterThan(30);
    expect(yearlySavingsPercent(PLANS.PRO_PLUS)).toBeLessThan(36);
  });
});
