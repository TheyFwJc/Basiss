import { describe, it, expect } from "vitest";
import { computeCurrentBalance } from "./accounts";

describe("computeCurrentBalance", () => {
  it("returns the starting balance when there is no realized P&L", () => {
    expect(computeCurrentBalance(50000, null).toString()).toBe("50000");
  });

  it("returns the starting balance when realized P&L is undefined", () => {
    expect(computeCurrentBalance(50000, undefined).toString()).toBe("50000");
  });

  it("adds positive realized P&L", () => {
    expect(computeCurrentBalance(50000, 1200).toString()).toBe("51200");
  });

  it("subtracts negative realized P&L", () => {
    expect(computeCurrentBalance(50000, -800.5).toString()).toBe("49199.5");
  });

  it("works with string inputs (as read from the database)", () => {
    expect(computeCurrentBalance("50000.00000000", "1200.50").toString()).toBe(
      "51200.5"
    );
  });
});
