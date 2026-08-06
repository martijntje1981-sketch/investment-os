import { describe, expect, it } from "vitest";

import {
  holdingIdentityKey,
  mergeImportedHoldings,
} from "@/lib/client/importMergeHoldings";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function holding(
  partial: Partial<StoredPortfolioHolding> &
    Pick<StoredPortfolioHolding, "id" | "symbol" | "name">,
): StoredPortfolioHolding {
  return {
    quantity: 1,
    purchasePrice: 10,
    currentPrice: 10,
    assetType: "investment",
    currency: "EUR",
    ...partial,
  };
}

describe("importMergeHoldings", () => {
  it("skips duplicates by provider symbol", () => {
    const existing = [
      holding({
        id: "1",
        symbol: "VWCE",
        name: "Vanguard",
        providerSymbol: "VWCE.DEX",
      }),
    ];
    const incoming = [
      holding({
        id: "2",
        symbol: "VWCE",
        name: "Vanguard",
        providerSymbol: "VWCE.DEX",
        quantity: 5,
      }),
    ];
    const result = mergeImportedHoldings(existing, incoming);
    expect(result.holdings).toHaveLength(1);
    expect(result.skippedDuplicates).toBe(1);
  });

  it("skips duplicates by ISIN", () => {
    const existing = [
      holding({
        id: "1",
        symbol: "VWCE",
        name: "Vanguard",
        isin: "IE00BK5BQT80",
      }),
    ];
    const incoming = [
      holding({
        id: "2",
        symbol: "VWCE",
        name: "Vanguard",
        isin: "IE00BK5BQT80",
      }),
    ];
    const result = mergeImportedHoldings(existing, incoming);
    expect(result.skippedDuplicates).toBe(1);
    expect(result.holdings).toHaveLength(1);
  });

  it("skips duplicates by ticker + exchange", () => {
    const existing = [
      holding({
        id: "1",
        symbol: "AAPL",
        name: "Apple",
        exchange: "XNAS",
      }),
    ];
    const incoming = [
      holding({
        id: "2",
        symbol: "aapl",
        name: "Apple Inc",
        exchange: "xnas",
      }),
    ];
    const result = mergeImportedHoldings(existing, incoming);
    expect(result.skippedDuplicates).toBe(1);
  });

  it("does not invent merges for distinct listings", () => {
    const existing = [
      holding({
        id: "1",
        symbol: "VUSA",
        name: "Vanguard S&P 500",
        exchange: "XLON",
        providerSymbol: "VUSA.LSE",
      }),
    ];
    const incoming = [
      holding({
        id: "2",
        symbol: "VUSA",
        name: "Vanguard S&P 500",
        exchange: "XAMS",
        providerSymbol: "VUSA.AMS",
      }),
    ];
    const result = mergeImportedHoldings(existing, incoming);
    expect(result.holdings).toHaveLength(2);
    expect(result.skippedDuplicates).toBe(0);
  });

  it("builds stable identity keys", () => {
    expect(
      holdingIdentityKey({
        providerSymbol: "VWCE.DEX",
        isin: "IE00BK5BQT80",
        symbol: "VWCE",
        exchange: "XETRA",
        assetType: "investment",
      }),
    ).toBe("ps:VWCE.DEX");
    expect(
      holdingIdentityKey({
        providerSymbol: null,
        isin: "IE00BK5BQT80",
        symbol: "VWCE",
        exchange: "XETRA",
        assetType: "investment",
      }),
    ).toBe("isin:IE00BK5BQT80");
  });
});
