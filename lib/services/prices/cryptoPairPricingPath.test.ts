import { describe, expect, it } from "vitest";

import { applyPricesToHoldings } from "@/lib/client/portfolioPricing";
import { buildPortfolioPerformance } from "@/lib/client/portfolioPerformance";
import { resolveCanonicalCryptoPair } from "@/lib/services/portfolio/cryptoPairIdentity";
import { resolveQuotePriceTargets } from "@/lib/services/prices/resolvePriceTargets";
import type { PriceApiQuote, StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function cryptoHolding(
  symbol: string,
  overrides: Partial<StoredPortfolioHolding> = {},
): StoredPortfolioHolding {
  const pairCurrency = overrides.pairCurrency ?? "USD";
  return {
    id: `${symbol}-id`,
    assetType: "crypto",
    symbol,
    name: symbol,
    quantity: 1,
    purchasePrice: 100,
    currentPrice: 0,
    currentPairPrice: null,
    pairCurrency,
    tradingPair: `${symbol}/${pairCurrency}`,
    providerSymbol: `${symbol}-${pairCurrency}.CC`,
    currency: "EUR",
    portfolioCurrency: "EUR",
    priceDataStatus: "unavailable",
    ...overrides,
  };
}

function cryptoQuote(symbol: string, pairPrice: number, priceEur: number): PriceApiQuote {
  return {
    symbol,
    eodhdSymbol: `${symbol}-USD.CC`,
    providerSymbol: `${symbol}-USD.CC`,
    isin: null,
    priceEur,
    currentPrice: priceEur,
    pairPrice,
    changePercent: 1,
    change24hPercent: 1,
    currency: "USD",
    dataStatus: "live",
    cacheStatus: "fresh",
    provider: "eodhd-quotes",
    isStale: false,
    updatedAt: "2026-08-28T09:37:00.000Z",
    fetchedAt: "2026-08-28T09:37:00.000Z",
    assetType: "crypto",
    normalizedPair: `${symbol}/USD`,
  };
}

describe("crypto pair pricing path", () => {
  it("routes BTC/USD, ETH/USD and XRP/USD through the same canonical crypto plan", () => {
    const holdings = [
      cryptoHolding("BTC"),
      cryptoHolding("ETH", { symbol: "ETH/USD", pairCurrency: "USD" }),
      cryptoHolding("XRP"),
    ];

    const { targets, errors } = resolveQuotePriceTargets(
      holdings.map((holding) => ({
        id: holding.id,
        symbol: holding.symbol,
        name: holding.name,
        assetType: "crypto",
        pairCurrency: holding.pairCurrency,
        providerSymbol: holding.providerSymbol,
      })),
    );

    expect(errors).toEqual([]);
    expect(targets.map((target) => target.cryptoPlan?.normalizedPair).sort()).toEqual([
      "BTC/USD",
      "ETH/USD",
      "XRP/USD",
    ]);
    expect(targets.map((target) => target.providerSymbol).sort()).toEqual([
      "BTC-USD.CC",
      "ETH-USD.CC",
      "XRP-USD.CC",
    ]);
    expect(targets.every((target) => target.assetType === "crypto")).toBe(true);
  });

  it("canonicalizes slash-pair symbols onto the shared BASE/QUOTE identity", () => {
    expect(resolveCanonicalCryptoPair({ symbol: "ETH/USD" })).toEqual({
      base: "ETH",
      quote: "USD",
      tradingPair: "ETH/USD",
    });
    expect(resolveCanonicalCryptoPair({ symbol: "XRP-USD" })).toEqual({
      base: "XRP",
      quote: "USD",
      tradingPair: "XRP/USD",
    });
  });

  it("updates the portfolio total when a fresher material quote arrives", () => {
    const holdings = [
      cryptoHolding("BTC", {
        currentPrice: 80_000,
        currentPairPrice: 87_000,
        priceDataStatus: "delayed",
      }),
    ];

    const before = buildPortfolioPerformance(holdings).totalValue;
    const afterHoldings = applyPricesToHoldings(holdings, [
      cryptoQuote("BTC", 98_000, 90_000),
    ]);
    const after = buildPortfolioPerformance(afterHoldings).totalValue;

    expect(before).toBe(80_000);
    expect(after).toBe(90_000);
    expect(afterHoldings[0]?.currentPairPrice).toBe(98_000);
    expect(afterHoldings[0]?.marketPriceUpdatedAt).toBe("2026-08-28T09:37:00.000Z");
  });
});
