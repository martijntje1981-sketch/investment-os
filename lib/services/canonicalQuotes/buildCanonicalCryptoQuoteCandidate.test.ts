import { describe, expect, it } from "vitest";

import { buildCanonicalCryptoQuoteCandidate } from "@/lib/services/canonicalQuotes/buildCanonicalCryptoQuoteCandidate";
import type { HoldingPrice, PricePayload } from "@/lib/services/prices/types";

const HOLDING_BTC = "c0c0c0c0-c0c0-40c0-80c0-c0c0c0c0c0c0";
const HOLDING_SHIB = "d1d1d1d1-d1d1-41d1-81d1-d1d1d1d1d1d1";
const HOLDING_EUR = "e2e2e2e2-e2e2-42e2-82e2-e2e2e2e2e2e2";
const HOLDING_VWCE = "a1a1a1a1-a1a1-41a1-81a1-a1a1a1a1a1a1";

const FX: PricePayload["fxRates"] = {
  EUR: 1,
  USD_TO_EUR: 0.92,
  GBP_TO_EUR: 1.17,
  CHF_TO_EUR: 1.05,
};

function cryptoPrice(overrides: Partial<HoldingPrice> = {}): HoldingPrice {
  return {
    symbol: "BTC",
    eodhdSymbol: "BTC-USD.CC",
    providerSymbol: "BTC-USD.CC",
    isin: null,
    name: "Bitcoin",
    originalCurrency: "USD",
    originalPrice: 95_000,
    baseCurrency: "EUR",
    exchangeRateToEur: null,
    priceEur: 87_400,
    currentPrice: 87_400,
    previousCloseOriginal: null,
    previousCloseEur: null,
    previousClose: null,
    change: null,
    changePercent: 1.2,
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
    updatedAt: "2026-09-01T11:00:00.000Z",
    fetchedAt: "2026-09-01T11:00:01.000Z",
    assetType: "crypto",
    pairPrice: 95_000,
    change24hPercent: 1.2,
    crypto: {
      assetType: "crypto",
      baseAsset: "BTC",
      quoteCurrency: "USD",
      normalizedPair: "BTC/USD",
      pairPrice: 95_000,
      change24hPercent: 1.2,
      sourcePair: "BTC/USD",
      conversionApplied: false,
      conversionPath: null,
      providerId: "eodhd-quotes",
      providerDisplayName: "EODHD",
      fetchedAt: "2026-09-01T11:00:01.000Z",
      unavailableReason: null,
    },
    ...overrides,
  };
}

describe("buildCanonicalCryptoQuoteCandidate", () => {
  it("computes BTC/USD canonical EUR as pair_price × exact fx_to_eur", () => {
    const result = buildCanonicalCryptoQuoteCandidate({
      holdingId: HOLDING_BTC,
      price: cryptoPrice(),
      fxRates: FX,
      fxAt: "2026-09-01T11:00:02.000Z",
      quoteSource: "provider",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.candidate.pairPrice).toBe(95_000);
    expect(result.candidate.pairCurrency).toBe("USD");
    expect(result.candidate.fxToEur).toBe(0.92);
    expect(result.candidate.canonicalEurUnitPrice).toBe(95_000 * 0.92);
    expect(result.candidate.canonicalEurUnitPrice).not.toBe(87_400.5);
    expect(result.candidate.providerSymbol).toBe("BTC-USD.CC");
    expect(result.candidate.quoteKind).toBe("crypto_market");
    expect(result.candidate.estimateOnly).toBe(false);
  });

  it("computes SHIB/USD canonical EUR for very small pair prices", () => {
    const shibPrice = 1.3e-8;
    const result = buildCanonicalCryptoQuoteCandidate({
      holdingId: HOLDING_SHIB,
      price: cryptoPrice({
        symbol: "SHIB",
        eodhdSymbol: "SHIB-USD.CC",
        providerSymbol: "SHIB-USD.CC",
        originalPrice: shibPrice,
        priceEur: shibPrice * 0.92,
        currentPrice: shibPrice * 0.92,
        pairPrice: shibPrice,
        crypto: {
          assetType: "crypto",
          baseAsset: "SHIB",
          quoteCurrency: "USD",
          normalizedPair: "SHIB/USD",
          pairPrice: shibPrice,
          change24hPercent: 0,
          sourcePair: "SHIB/USD",
          conversionApplied: false,
          conversionPath: null,
          providerId: "eodhd-quotes",
          providerDisplayName: "EODHD",
          fetchedAt: "2026-09-01T11:00:01.000Z",
          unavailableReason: null,
        },
      }),
      fxRates: FX,
      fxAt: "2026-09-01T11:00:02.000Z",
      quoteSource: "provider",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.candidate.pairPrice).toBe(shibPrice);
    expect(result.candidate.canonicalEurUnitPrice).toBe(shibPrice * 0.92);
  });

  it("uses FX 1 for an EUR crypto pair", () => {
    const result = buildCanonicalCryptoQuoteCandidate({
      holdingId: HOLDING_EUR,
      price: cryptoPrice({
        originalCurrency: "EUR",
        originalPrice: 80_000,
        priceEur: 80_000,
        currentPrice: 80_000,
        currency: "EUR",
        pairPrice: 80_000,
        providerSymbol: "BTC-EUR.CC",
        crypto: {
          assetType: "crypto",
          baseAsset: "BTC",
          quoteCurrency: "EUR",
          normalizedPair: "BTC/EUR",
          pairPrice: 80_000,
          change24hPercent: 0,
          sourcePair: "BTC/EUR",
          conversionApplied: false,
          conversionPath: null,
          providerId: "eodhd-quotes",
          providerDisplayName: "EODHD",
          fetchedAt: "2026-09-01T11:00:01.000Z",
          unavailableReason: null,
        },
      }),
      fxRates: { ...FX, USD_TO_EUR: 0.92 },
      fxAt: "2026-09-01T11:00:02.000Z",
      quoteSource: "provider",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.candidate.pairCurrency).toBe("EUR");
    expect(result.candidate.fxToEur).toBe(1);
    expect(result.candidate.canonicalEurUnitPrice).toBe(80_000);
  });

  it("rejects listed holdings, estimates, stale, manual, purchase, and cache-only quotes", () => {
    expect(
      buildCanonicalCryptoQuoteCandidate({
        holdingId: HOLDING_VWCE,
        price: cryptoPrice({
          assetType: "investment",
          crypto: undefined,
          symbol: "VWCE",
          providerSymbol: "VWCE.XETRA",
        }),
        fxRates: FX,
        fxAt: "2026-09-01T11:00:02.000Z",
        quoteSource: "provider",
      }),
    ).toMatchObject({ ok: false, reason: "listed_holding" });

    expect(
      buildCanonicalCryptoQuoteCandidate({
        holdingId: HOLDING_BTC,
        price: cryptoPrice(),
        fxRates: FX,
        fxAt: "2026-09-01T11:00:02.000Z",
        quoteSource: "provider",
        estimateOnly: true,
      }),
    ).toMatchObject({ ok: false, reason: "estimate_only" });

    expect(
      buildCanonicalCryptoQuoteCandidate({
        holdingId: HOLDING_BTC,
        price: cryptoPrice({ dataStatus: "stale", isStale: true }),
        fxRates: FX,
        fxAt: "2026-09-01T11:00:02.000Z",
        quoteSource: "provider",
      }),
    ).toMatchObject({ ok: false, reason: "stale_or_unavailable" });

    expect(
      buildCanonicalCryptoQuoteCandidate({
        holdingId: HOLDING_BTC,
        price: cryptoPrice(),
        fxRates: FX,
        fxAt: "2026-09-01T11:00:02.000Z",
        quoteSource: "cache",
      }),
    ).toMatchObject({ ok: false, reason: "cache_only" });
  });

  it("does not copy request-body or HoldingPrice financial overlay fields onto the candidate", () => {
    const polluted = cryptoPrice({
      priceEur: 1,
      currentPrice: 1,
    }) as HoldingPrice & {
      purchasePrice: number;
      last_market_price: number;
    };
    polluted.purchasePrice = 90;
    polluted.last_market_price = 1;
    const result = buildCanonicalCryptoQuoteCandidate({
      holdingId: HOLDING_BTC,
      price: polluted,
      fxRates: FX,
      fxAt: "2026-09-01T11:00:02.000Z",
      quoteSource: "provider",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.candidate.canonicalEurUnitPrice).toBe(95_000 * 0.92);
    expect(result.candidate).not.toHaveProperty("purchasePrice");
    expect(result.candidate).not.toHaveProperty("last_market_price");
    expect(result.candidate).not.toHaveProperty("currentPrice");
    expect(result.candidate).not.toHaveProperty("priceEur");
  });

  it("rejects a provider/pair that is missing FX or pair identity", () => {
    expect(
      buildCanonicalCryptoQuoteCandidate({
        holdingId: HOLDING_BTC,
        price: cryptoPrice({
          crypto: {
            assetType: "crypto",
            baseAsset: "BTC",
            quoteCurrency: "USD",
            normalizedPair: "BTC/USD",
            pairPrice: 95_000,
            change24hPercent: 0,
            sourcePair: "BTC/USD",
            conversionApplied: false,
            conversionPath: null,
            providerId: "other-provider",
            providerDisplayName: "Other",
            fetchedAt: "2026-09-01T11:00:01.000Z",
            unavailableReason: null,
          },
        }),
        fxRates: FX,
        fxAt: "2026-09-01T11:00:02.000Z",
        quoteSource: "provider",
      }),
    ).toMatchObject({ ok: false, reason: "invalid_provider" });

    expect(
      buildCanonicalCryptoQuoteCandidate({
        holdingId: HOLDING_BTC,
        price: cryptoPrice(),
        fxRates: { EUR: 1, USD_TO_EUR: null, GBP_TO_EUR: null, CHF_TO_EUR: null },
        fxAt: "2026-09-01T11:00:02.000Z",
        quoteSource: "provider",
      }),
    ).toMatchObject({ ok: false, reason: "missing_fx" });
  });
});
