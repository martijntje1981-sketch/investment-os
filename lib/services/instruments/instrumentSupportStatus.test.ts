import { describe, expect, it } from "vitest";

import {
  resolveHoldingInstrumentSupportStatus,
  resolveImportRowInstrumentSupportStatus,
} from "@/lib/services/instruments/instrumentSupportStatus";
import type { ImportRow } from "@/lib/services/import/types";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function baseImportRow(overrides: Partial<ImportRow> = {}): ImportRow {
  return {
    id: "row-1",
    name: "Test Holding",
    symbol: "AAPL",
    quantity: 1,
    purchasePrice: 0,
    currentPrice: 0,
    assetType: "investment",
    providerSymbol: "AAPL.US",
    matchMethod: "ticker_exchange",
    reviewTier: "auto",
    ...overrides,
  };
}

function baseHolding(
  overrides: Partial<StoredPortfolioHolding> = {},
): StoredPortfolioHolding {
  return {
    id: "holding-1",
    name: "Test Holding",
    symbol: "AAPL",
    quantity: 1,
    purchasePrice: 0,
    currentPrice: 0,
    currency: "EUR",
    assetType: "investment",
    providerSymbol: "AAPL.US",
    priceDataStatus: "live",
    ...overrides,
  };
}

describe("instrumentSupportStatus", () => {
  it("marks live-priced registry crypto as supported during import review", () => {
    expect(
      resolveImportRowInstrumentSupportStatus(
        baseImportRow({ symbol: "XRP", providerSymbol: "XRP.CC" }),
      ),
    ).toBe("supported");
  });

  it("treats CC-mapped crypto as supported during import review", () => {
    expect(
      resolveImportRowInstrumentSupportStatus(
        baseImportRow({
          symbol: "MYST",
          assetType: "crypto",
          providerSymbol: "MYST.CC",
          matchMethod: "unresolved",
          reviewTier: "blocked",
        }),
      ),
    ).toBe("supported");
  });

  it("keeps unmapped crypto pending until it is matched or reviewed", () => {
    expect(
      resolveImportRowInstrumentSupportStatus(
        baseImportRow({
          symbol: "MYST",
          providerSymbol: null,
          matchMethod: "unresolved",
          reviewTier: "blocked",
          assetType: "crypto",
        }),
      ),
    ).toBe("pending_match");
  });

  it("marks unmatched investments as pending match", () => {
    expect(
      resolveImportRowInstrumentSupportStatus(
        baseImportRow({
          symbol: "ACME",
          isin: "US0000000000",
          providerSymbol: null,
          matchMethod: "unresolved",
          reviewTier: "review",
        }),
      ),
    ).toBe("pending_match");
  });

  it("uses live price unavailable for temporary provider failures on saved holdings", () => {
    expect(
      resolveHoldingInstrumentSupportStatus(
        baseHolding({
          assetType: "crypto",
          symbol: "XRP",
          priceDataStatus: "unavailable",
          pricingStatus: "price_unavailable",
        }),
      ),
    ).toBe("live_price_unavailable");
  });

  it("does not mark supported holdings as not currently supported on temporary failures", () => {
    expect(
      resolveHoldingInstrumentSupportStatus(
        baseHolding({
          priceDataStatus: "unavailable",
        }),
      ),
    ).toBe("live_price_unavailable");

    expect(
      resolveHoldingInstrumentSupportStatus(
        baseHolding({
          priceDataStatus: "unavailable",
        }),
      ),
    ).not.toBe("not_supported");
  });

  it("marks conversion-based crypto pricing as supported via conversion", () => {
    expect(
      resolveHoldingInstrumentSupportStatus(
        baseHolding({
          assetType: "crypto",
          symbol: "ETH",
          quoteConversionApplied: true,
          priceDataStatus: "live",
        }),
      ),
    ).toBe("supported_via_conversion");
  });
});
