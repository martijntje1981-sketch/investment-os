import { describe, expect, it } from "vitest";

import {
  classifyHoldingSearchQuery,
  resolveManualLookupMatchInput,
} from "@/lib/client/manualHoldingSearchQuery";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function draft(
  overrides: Partial<StoredPortfolioHolding> = {},
): StoredPortfolioHolding {
  return {
    id: "d1",
    symbol: "",
    name: "",
    quantity: 0,
    purchasePrice: 0,
    currentPrice: 0,
    currency: "EUR",
    assetType: "investment",
    isin: null,
    providerSymbol: null,
    ...overrides,
  };
}

describe("classifyHoldingSearchQuery", () => {
  it("classifies tickers, names, ISINs, and provider symbols", () => {
    expect(classifyHoldingSearchQuery("MSFT").kind).toBe("ticker");
    expect(classifyHoldingSearchQuery("MSFT").ticker).toBe("MSFT");
    expect(classifyHoldingSearchQuery("Microsoft Corporation").kind).toBe(
      "name",
    );
    expect(classifyHoldingSearchQuery("US0378331005").kind).toBe("isin");
    expect(classifyHoldingSearchQuery("US0378331005").isin).toBe("US0378331005");
    expect(classifyHoldingSearchQuery("MSFT.US").kind).toBe("provider_symbol");
    expect(classifyHoldingSearchQuery("").kind).toBe("empty");
  });
});

describe("resolveManualLookupMatchInput", () => {
  it("sends a name search without inventing a ticker", () => {
    expect(
      resolveManualLookupMatchInput(
        draft({ symbol: "Novo Nordisk" }),
      ),
    ).toEqual({
      ticker: null,
      isin: null,
      exchange: null,
      instrumentName: "Novo Nordisk",
      assetType: "investment",
    });
  });

  it("keeps explicit More search options ISIN with a ticker search", () => {
    expect(
      resolveManualLookupMatchInput(
        draft({ symbol: "ASML", isin: "NL0010273215", exchange: "AS" }),
      ),
    ).toEqual({
      ticker: "ASML",
      isin: "NL0010273215",
      exchange: "AS",
      instrumentName: null,
      assetType: "investment",
    });
  });

  it("treats an ISIN typed in Search as ISIN-first identity", () => {
    expect(
      resolveManualLookupMatchInput(draft({ symbol: "US0378331005" })),
    ).toEqual({
      ticker: null,
      isin: "US0378331005",
      exchange: null,
      instrumentName: null,
      assetType: "investment",
    });
  });
});
