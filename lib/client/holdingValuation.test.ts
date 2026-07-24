import { describe, expect, it } from "vitest";

import {
  buildHoldingValuation,
  getHoldingCostBasis,
  getHoldingMarketValue,
  getHoldingPortfolioWeightPercent,
  getHoldingReturnPercent,
  getHoldingReturnValue,
  getPortfolioTotalMarketValue,
} from "@/lib/client/holdingValuation";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function holding(
  overrides: Partial<StoredPortfolioHolding> & Pick<StoredPortfolioHolding, "symbol" | "name">,
): StoredPortfolioHolding {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    symbol: overrides.symbol,
    name: overrides.name,
    quantity: overrides.quantity ?? 10,
    purchasePrice: overrides.purchasePrice ?? 100,
    currentPrice: overrides.currentPrice ?? 100,
    currency: overrides.currency ?? "EUR",
    assetType: overrides.assetType ?? "investment",
    priceDataStatus: overrides.priceDataStatus,
  };
}

describe("holdingValuation", () => {
  it("values holdings with the same resolved price as portfolio analysis", () => {
    const liveHolding = holding({
      symbol: "VWCE",
      name: "VWCE",
      quantity: 5,
      currentPrice: 110,
      purchasePrice: 95,
    });
    const estimatedHolding = holding({
      symbol: "STRC",
      name: "STRC",
      quantity: 20,
      currentPrice: 0,
      purchasePrice: 16,
    });

    expect(getHoldingMarketValue(liveHolding)).toBe(550);
    expect(getHoldingMarketValue(estimatedHolding)).toBe(320);
  });

  it("builds consistent overview and detail valuations for the same holding set", () => {
    const holdings = [
      holding({ symbol: "VWCE", name: "VWCE", quantity: 5, currentPrice: 110 }),
      holding({
        symbol: "STRC",
        name: "STRC",
        quantity: 20,
        currentPrice: 0,
        purchasePrice: 16,
      }),
      holding({
        symbol: "EUR",
        name: "Cash",
        assetType: "cash",
        quantity: 1000,
        currentPrice: 1,
        purchasePrice: 1,
      }),
    ];

    const vwceValuation = buildHoldingValuation(holdings[0]!, holdings);
    const strcValuation = buildHoldingValuation(holdings[1]!, holdings);

    expect(vwceValuation.marketValue).toBe(550);
    expect(strcValuation.marketValue).toBe(320);
    expect(strcValuation.displayPrice.source).toBe("estimated");
    expect(getPortfolioTotalMarketValue(holdings)).toBe(1870);
    expect(vwceValuation.portfolioWeightPercent).toBeCloseTo((550 / 1870) * 100, 5);
    expect(strcValuation.portfolioWeightPercent).toBeCloseTo((320 / 1870) * 100, 5);
  });

  it("derives cost basis, return value and return percent from the same market value", () => {
    const target = holding({
      symbol: "NUKL",
      name: "NUKL",
      quantity: 4,
      currentPrice: 125,
      purchasePrice: 100,
    });

    expect(getHoldingCostBasis(target)).toBe(400);
    expect(getHoldingReturnValue(target)).toBe(100);
    expect(getHoldingReturnPercent(target)).toBe(25);
  });

  it("returns null market metrics when no usable price is available", () => {
    const unavailable = holding({
      symbol: "IB1T",
      name: "IB1T",
      quantity: 3,
      currentPrice: 0,
      purchasePrice: 0,
    });

    const valuation = buildHoldingValuation(unavailable, [unavailable]);

    expect(valuation.marketValue).toBeNull();
    expect(valuation.displayPrice.source).toBe("unavailable");
    expect(getHoldingPortfolioWeightPercent(unavailable, [unavailable])).toBeNull();
    expect(getHoldingReturnValue(unavailable)).toBeNull();
    expect(getHoldingReturnPercent(unavailable)).toBeNull();
  });
});
