import { describe, it, expect } from "vitest";
import { formatCurrency, formatDate } from "./format";

describe("formatCurrency", () => {
  it("formats a positive number as USD by default", () => {
    expect(formatCurrency(1234.5)).toBe("$1,234.50");
  });

  it("formats a negative number with a leading minus sign", () => {
    expect(formatCurrency(-500)).toBe("-$500.00");
  });

  it("accepts a string amount, as Prisma Decimal.toString() produces", () => {
    expect(formatCurrency("2500.1234")).toBe("$2,500.12");
  });

  it("respects the currency code", () => {
    expect(formatCurrency(10, "EUR")).toBe("€10.00");
  });
});

describe("formatDate", () => {
  it("formats a Date consistently", () => {
    expect(formatDate(new Date("2026-03-05T00:00:00Z"))).toMatch(/Mar 5, 2026|Mar 4, 2026/);
  });
});
