import { describe, expect, it } from "vitest";

import {
  lookupVerifiedByProviderSymbol,
  resolveQuoteCurrencyForProviderSymbol,
} from "@/lib/services/instruments/verifiedInstrumentRegistry";
import { createEodhdMarketDataProvider } from "@/lib/services/prices/providers/eodhdMarketDataProvider";
import { resolveQuotePriceTarget } from "@/lib/services/prices/resolvePriceTargets";
import type { PriceCurrency, ResolvedPriceTarget } from "@/lib/services/prices/types";
import { estimateFxProviderCalls } from "@/lib/services/marketSnapshot/snapshotSymbolFilter";

const STRC_TARGET: ResolvedPriceTarget = {
  symbol: "STRC",
  providerSymbol: "STRC.AS",
  isin: "NL0015001K93",
  name: "21Shares Strategy Yield ETP",
  currency: "USD",
};

const EODHD_STRC_USD_PRICE = 17.948;
const EODHD_STRC_PREVIOUS_CLOSE_USD = 17.982;

/** Typical USD→EUR multiplier (~1 / 1.14 EURUSD). */
const MOCK_USD_TO_EUR = 0.8785;

function mockFxRates(
  usdToEur: number = MOCK_USD_TO_EUR,
): Record<PriceCurrency, number | null> {
  return {
    EUR: 1,
    USD: usdToEur,
    GBP: null,
    CHF: null,
  };
}

describe("STRC.AS quote currency", () => {
  it("stores USD quote currency in verified instrument metadata", () => {
    const entry = lookupVerifiedByProviderSymbol("STRC.AS");
    expect(entry?.quoteCurrency).toBe("USD");
    expect(entry?.quoteCurrencyNote).toMatch(/omit currency/i);
    expect(resolveQuoteCurrencyForProviderSymbol("STRC.AS")).toBe("USD");
  });

  it("resolves STRC price targets in USD while other verified listings stay EUR", () => {
    expect(
      resolveQuotePriceTarget({
        symbol: "STRC",
        providerSymbol: "STRC.AS",
        isin: "NL0015001K93",
      })?.currency,
    ).toBe("USD");

    expect(
      resolveQuotePriceTarget({
        symbol: "VWCE",
        providerSymbol: "VWCE.XETRA",
      })?.currency,
    ).toBe("EUR");
  });

  it("requires USD FX when STRC.AS is in the symbol set", () => {
    expect(estimateFxProviderCalls(["VWCE.XETRA"])).toBe(0);
    expect(estimateFxProviderCalls(["VWCE.XETRA", "STRC.AS"])).toBe(1);
  });

  it("converts EODHD STRC.AS USD 17.948 to approximately EUR 15.75–15.80", () => {
    const provider = createEodhdMarketDataProvider("test-key");
    const normalized = provider.normalizeQuote(
      STRC_TARGET,
      {
        providerSymbol: "STRC.AS",
        wireCurrency: null,
        originalCurrency: "EUR",
        originalPrice: EODHD_STRC_USD_PRICE,
        previousCloseOriginal: EODHD_STRC_PREVIOUS_CLOSE_USD,
        changeOriginal: -0.034,
        changePercentOriginal: -0.1891,
        open: null,
        high: null,
        low: null,
        volume: null,
        timestamp: 1_753_340_640,
        updatedAt: "2026-07-24T07:04:00.000Z",
      },
      mockFxRates(),
    );

    expect(normalized.currency).toBe("USD");
    expect(normalized.currentPrice).toBeGreaterThanOrEqual(15.75);
    expect(normalized.currentPrice).toBeLessThanOrEqual(15.8);
    expect(normalized.currentPrice).not.toBe(EODHD_STRC_USD_PRICE);
    expect(normalized.previousClose).toBeGreaterThanOrEqual(15.75);
    expect(normalized.previousClose).toBeLessThanOrEqual(15.82);
  });

  it("does not alter EUR normalization for XETRA listings", () => {
    const provider = createEodhdMarketDataProvider("test-key");
    const normalized = provider.normalizeQuote(
      {
        symbol: "VWCE",
        providerSymbol: "VWCE.XETRA",
        isin: "IE00BK5BQT80",
        name: "VWCE",
        currency: "EUR",
      },
      {
        providerSymbol: "VWCE.XETRA",
        wireCurrency: "EUR",
        originalCurrency: "EUR",
        originalPrice: 163.88,
        previousCloseOriginal: 163.36,
        changeOriginal: 0.52,
        changePercentOriginal: 0.3183,
        open: null,
        high: null,
        low: null,
        volume: null,
        timestamp: 1_753_362_480,
        updatedAt: "2026-07-24T13:07:00.000Z",
      },
      mockFxRates(),
    );

    expect(normalized.currentPrice).toBe(163.88);
    expect(normalized.currency).toBe("EUR");
  });
});
