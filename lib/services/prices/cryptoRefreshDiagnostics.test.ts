import { describe, expect, it } from "vitest";

import { buildSanitizedServerCryptoDiagnostics } from "@/lib/services/prices/cryptoRefreshDiagnostics";
import type { HoldingPrice, PriceHoldingInput } from "@/lib/services/prices/types";

function cryptoHolding(
  symbol: string,
  pairCurrency: string,
  providerSymbol?: string | null,
): PriceHoldingInput {
  return {
    symbol,
    assetType: "crypto",
    pairCurrency,
    providerSymbol: providerSymbol ?? null,
  };
}

function cryptoPrice(
  symbol: string,
  normalizedPair: string,
  providerSymbol: string,
  overrides: Partial<HoldingPrice> = {},
): HoldingPrice {
  return {
    symbol,
    eodhdSymbol: providerSymbol,
    providerSymbol,
    isin: null,
    name: symbol,
    originalCurrency: "USD",
    originalPrice: 95_000,
    baseCurrency: "EUR",
    exchangeRateToEur: null,
    priceEur: 87_500,
    currentPrice: 87_500,
    pairPrice: 95_000,
    previousCloseOriginal: null,
    previousCloseEur: null,
    previousClose: null,
    change: null,
    changePercent: 1.2,
    change24hPercent: 1.2,
    currency: "USD",
    dataStatus: "live",
    cacheStatus: "fresh",
    provider: "eodhd",
    isStale: false,
    unavailableReason: null,
    open: null,
    high: null,
    low: null,
    volume: null,
    timestamp: null,
    updatedAt: "2026-07-25T18:00:00.000Z",
    assetType: "crypto",
    crypto: {
      assetType: "crypto",
      baseAsset: symbol,
      quoteCurrency: "USD",
      normalizedPair,
      pairPrice: 95_000,
      change24hPercent: 1.2,
      sourcePair: normalizedPair,
      conversionApplied: true,
      conversionPath: "USD->EUR",
      providerId: "eodhd-quotes",
      providerDisplayName: "EODHD",
      fetchedAt: "2026-07-25T18:00:00.000Z",
      unavailableReason: null,
    },
    ...overrides,
  };
}

describe("buildSanitizedServerCryptoDiagnostics", () => {
  it("reports provider error when PriceService returns an error for the symbol", () => {
    const [diagnostic] = buildSanitizedServerCryptoDiagnostics(
      [cryptoHolding("BTC", "USD")],
      {
        prices: [],
        errors: ["BTC: live price is temporarily unavailable."],
      },
    );

    expect(diagnostic?.quoteStatus).toBe("provider_error");
    expect(diagnostic?.providerSymbol).toBe("BTC-USD.CC");
    expect(diagnostic?.requestStatus).toBe("request_valid");
  });

  it("reports budget block without exposing budget numbers", () => {
    const [diagnostic] = buildSanitizedServerCryptoDiagnostics(
      [cryptoHolding("BTC", "USD")],
      {
        prices: [],
        errors: [],
        canAffordRefresh: false,
      },
    );

    expect(diagnostic?.quoteStatus).toBe("budget_blocked");
    expect(JSON.stringify(diagnostic)).not.toMatch(/spendable|dailyLimit/i);
  });

  it("reports cached unavailable quotes", () => {
    const [diagnostic] = buildSanitizedServerCryptoDiagnostics(
      [cryptoHolding("BTC", "USD")],
      {
        prices: [
          cryptoPrice("BTC", "BTC/USD", "BTC-USD.CC", {
            dataStatus: "unavailable",
            cacheStatus: "unavailable",
            priceEur: 0,
            currentPrice: 0,
            pairPrice: 0,
          }),
        ],
        errors: [],
      },
    );

    expect(diagnostic?.quoteStatus).toBe("cache_unavailable");
    expect(diagnostic?.cacheStatus).toBe("unavailable");
  });

  it("reports malformed quote when pair and portfolio prices are invalid", () => {
    const [diagnostic] = buildSanitizedServerCryptoDiagnostics(
      [cryptoHolding("BTC", "USD")],
      {
        prices: [
          cryptoPrice("BTC", "BTC/USD", "BTC-USD.CC", {
            pairPrice: 0,
            priceEur: 0,
            currentPrice: 0,
          }),
        ],
        errors: [],
      },
    );

    expect(diagnostic?.quoteStatus).toBe("malformed_quote");
  });

  it("reports a valid received quote with conversion present", () => {
    const [diagnostic] = buildSanitizedServerCryptoDiagnostics(
      [cryptoHolding("BTC", "USD")],
      {
        prices: [cryptoPrice("BTC", "BTC/USD", "BTC-USD.CC")],
        errors: [],
      },
    );

    expect(diagnostic?.quoteStatus).toBe("quote_received");
    expect(diagnostic?.pairPriceValid).toBe(true);
    expect(diagnostic?.portfolioPriceValid).toBe(true);
    expect(diagnostic?.conversionRequired).toBe(true);
    expect(diagnostic?.conversionPresent).toBe(true);
  });
});
