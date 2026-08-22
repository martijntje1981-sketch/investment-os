import { describe, expect, it } from "vitest";

import {
  buildPortfolioExposureAllocation,
  formatAllocationPercent,
} from "@/lib/services/classification";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function holding(
  overrides: Partial<StoredPortfolioHolding> &
    Pick<StoredPortfolioHolding, "symbol">,
): StoredPortfolioHolding {
  return {
    id: `${overrides.symbol}-id`,
    name: overrides.symbol,
    quantity: 10,
    purchasePrice: 100,
    currentPrice: 100,
    currency: "EUR",
    assetType: "investment",
    ...overrides,
  };
}

describe("formatAllocationPercent", () => {
  it("shows true zero as 0% and tiny positive weights as <0.1%", () => {
    expect(formatAllocationPercent(0)).toBe("0%");
    expect(formatAllocationPercent(-0)).toBe("0%");
    expect(formatAllocationPercent(0.04)).toBe("<0.1%");
    expect(formatAllocationPercent(0.099)).toBe("<0.1%");
    expect(formatAllocationPercent(0.1)).toBe("0.1%");
    expect(formatAllocationPercent(0.4)).toBe("0.4%");
    expect(formatAllocationPercent(12.4)).toBe("12%");
    expect(formatAllocationPercent(null)).toBe("—");
    expect(formatAllocationPercent(Number.NaN)).toBe("—");
  });

  it("does not display a valued Fixed Income sleeve as 0%", () => {
    const allocation = buildPortfolioExposureAllocation([
      holding({
        symbol: "EUNA",
        name: "iShares Core Global Aggregate Bond UCITS ETF EUR Hedged (Acc)",
        quantity: 2,
        purchasePrice: 10,
        currentPrice: 10,
      }),
      holding({
        symbol: "VWCE",
        providerSymbol: "VWCE.XETRA",
        quantity: 400,
        currentPrice: 120,
      }),
    ]);
    const fi = allocation.groups.find((group) => group.groupId === "fixed_income");
    expect(fi?.value).toBeGreaterThan(0);
    expect(fi?.rawPercent).toBeGreaterThan(0);
    expect(fi?.rawPercent).toBeLessThan(0.1);
    expect(formatAllocationPercent(fi?.rawPercent)).toBe("<0.1%");
    expect(formatAllocationPercent(fi?.displayPercent)).not.toBe(
      formatAllocationPercent(fi?.rawPercent),
    );
  });
});
