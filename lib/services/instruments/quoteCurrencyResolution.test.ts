import { describe, expect, it } from "vitest";

import {
  backfillListingQuoteCurrency,
  normalizeProviderQuoteCurrency,
  resolveListingQuoteCurrency,
  resolveMatchQuoteCurrency,
  QUOTE_CURRENCY_REVIEW_WARNING,
} from "@/lib/services/instruments/quoteCurrency";
import { createEodhdMarketDataProvider } from "@/lib/services/prices/providers/eodhdMarketDataProvider";
import { resolveQuotePriceTarget } from "@/lib/services/prices/resolvePriceTargets";
import { estimateFxProviderCalls } from "@/lib/services/marketSnapshot/snapshotSymbolFilter";
import type { PriceCurrency, ResolvedPriceTarget } from "@/lib/services/prices/types";

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

describe("resolveListingQuoteCurrency", () => {
  it("prefers live quote currency when present", () => {
    expect(
      resolveListingQuoteCurrency({
        liveQuoteCurrency: "USD",
        persistedQuoteCurrency: "EUR",
        providerSymbol: "STRC.AS",
      }),
    ).toEqual({
      currency: "USD",
      source: "live_quote",
      requiresReview: false,
    });
  });

  it("uses persisted listing currency when live payload omits currency", () => {
    expect(
      resolveListingQuoteCurrency({
        persistedQuoteCurrency: "USD",
        providerSymbol: "STRC.AS",
      }),
    ).toEqual({
      currency: "USD",
      source: "persisted_listing",
      requiresReview: false,
    });
  });

  it("falls back to verified registry for known listings", () => {
    expect(
      resolveListingQuoteCurrency({
        providerSymbol: "VWCE.XETRA",
      }),
    ).toEqual({
      currency: "EUR",
      source: "verified_registry",
      requiresReview: false,
    });
  });

  it("does not infer currency from exchange suffix alone", () => {
    expect(
      resolveListingQuoteCurrency({
        providerSymbol: "UNKNOWN.AS",
      }),
    ).toEqual({
      currency: null,
      source: "unresolved",
      requiresReview: true,
    });
  });

  it("does not silently default unresolved listings to EUR or USD", () => {
    const resolution = resolveListingQuoteCurrency({
      providerSymbol: "NEWCO.XETRA",
    });
    expect(resolution.currency).toBeNull();
    expect(resolution.requiresReview).toBe(true);
  });
});

describe("EODHD match currency propagation", () => {
  it("captures EUR from id-mapping rows for Xetra listings", () => {
    const resolved = resolveMatchQuoteCurrency({
      providerCurrency: "EUR",
      providerSymbol: "VWCE.XETRA",
    });
    expect(resolved).toBe("EUR");
  });

  it("captures USD from id-mapping rows for Amsterdam listings", () => {
    const resolved = resolveMatchQuoteCurrency({
      providerCurrency: "USD",
      providerSymbol: "STRC.AS",
    });
    expect(resolved).toBe("USD");
  });
});

describe("provider normalization", () => {
  const strcTarget: ResolvedPriceTarget = {
    symbol: "STRC",
    providerSymbol: "STRC.AS",
    isin: "NL0015001K93",
    name: "21Shares Strategy Yield ETP",
    currency: "USD",
  };

  it("converts STRC.AS USD 17.948 to approximately EUR 15.75–15.80", () => {
    const provider = createEodhdMarketDataProvider("test-key");
    const normalized = provider.normalizeQuote(
      strcTarget,
      {
        providerSymbol: "STRC.AS",
        wireCurrency: null,
        originalCurrency: "EUR",
        originalPrice: 17.948,
        previousCloseOriginal: 17.982,
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
    expect(normalized.currentPrice).not.toBe(17.948);
  });

  it("keeps EUR Xetra listings unchanged", () => {
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

  it("returns unavailable when currency cannot be verified", () => {
    const provider = createEodhdMarketDataProvider("test-key");
    const normalized = provider.normalizeQuote(
      {
        symbol: "NEWCO",
        providerSymbol: "NEWCO.XETRA",
        isin: null,
        name: "NEWCO",
        currency: null,
      },
      {
        providerSymbol: "NEWCO.XETRA",
        wireCurrency: null,
        originalCurrency: "EUR",
        originalPrice: 10,
        previousCloseOriginal: 9.5,
        changeOriginal: 0.5,
        changePercentOriginal: 5,
        open: null,
        high: null,
        low: null,
        volume: null,
        timestamp: 1_753_362_480,
        updatedAt: "2026-07-24T13:07:00.000Z",
      },
      mockFxRates(),
    );

    expect(normalized.dataStatus).toBe("unavailable");
    expect(normalized.currentPrice).toBeNull();
    expect(normalized.unavailableReason).toMatch(/quote currency/i);
  });
});

describe("price targets and FX estimation", () => {
  it("resolves STRC targets from persisted listing currency", () => {
    const target = resolveQuotePriceTarget({
      symbol: "STRC",
      providerSymbol: "STRC.AS",
      quoteCurrency: "USD",
    });

    expect(target?.currency).toBe("USD");
  });

  it("requires USD FX when STRC.AS is included", () => {
    expect(estimateFxProviderCalls(["VWCE.XETRA"])).toBe(0);
    expect(estimateFxProviderCalls(["VWCE.XETRA", "STRC.AS"])).toBe(1);
  });
});

describe("holding backfill", () => {
  it("backfills known listings from verified registry without changing quantities", () => {
    const backfilled = backfillListingQuoteCurrency({
      id: "strc",
      symbol: "STRC",
      name: "STRC",
      quantity: 450,
      purchasePrice: 12,
      currentPrice: 17.948,
      currency: "EUR",
      providerSymbol: "STRC.AS",
    });

    expect(backfilled.quoteCurrency).toBe("USD");
    expect(backfilled.quantity).toBe(450);
    expect(backfilled.purchasePrice).toBe(12);
    expect(backfilled.currency).toBe("EUR");
  });

  it("marks unknown listings for review instead of defaulting currency", () => {
    const backfilled = backfillListingQuoteCurrency({
      id: "new",
      symbol: "NEWCO",
      name: "NEWCO",
      quantity: 1,
      purchasePrice: 10,
      currentPrice: 0,
      currency: "EUR",
      providerSymbol: "NEWCO.XETRA",
    });

    expect(backfilled.quoteCurrency).toBeUndefined();
    expect(backfilled.requiresConfirmation).toBe(true);
    expect(backfilled.matchWarnings).toContain(QUOTE_CURRENCY_REVIEW_WARNING);
  });
});

describe("normalizeProviderQuoteCurrency", () => {
  it("accepts supported listing currencies only", () => {
    expect(normalizeProviderQuoteCurrency("eur")).toBe("EUR");
    expect(normalizeProviderQuoteCurrency("usd")).toBe("USD");
    expect(normalizeProviderQuoteCurrency("SEK")).toBeNull();
  });
});
