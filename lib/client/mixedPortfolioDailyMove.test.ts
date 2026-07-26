import { beforeEach, describe, expect, it } from "vitest";

import { buildDashboardSummary } from "@/lib/client/dashboardSummary";
import {
  formatDailyPerformanceCoverageMessage,
  pickTopAndLowestMovers,
  resolveDailyMoveHeroLabel,
  resolveDailyMovePeriodDetail,
  summarizeDailyMovePeriods,
  summarizeDailyPerformance,
} from "@/lib/client/dailyPerformance";
import { resolveHoldingDisplayPrice } from "@/lib/client/holdingDisplayPrice";
import { getHoldingMarketValue } from "@/lib/client/portfolioAnalysis";
import {
  applyCachedPrices,
  applyPricesToHoldings,
  isQuoteCompatibleWithHolding,
  parsePriceApiResponseQuotes,
  writePriceCache,
} from "@/lib/client/portfolioPricing";
import { applyRemoteSnapshotToLocalCache } from "@/lib/client/portfolioSyncState";
import { priceCacheKey } from "@/lib/client/portfolioStorageKeys";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";
import type { RemotePortfolioSnapshot } from "@/lib/services/portfolio/types";

const USER = "mixed-portfolio-user";

function equity(
  overrides: Partial<StoredPortfolioHolding> & Pick<StoredPortfolioHolding, "symbol">,
): StoredPortfolioHolding {
  return {
    id: overrides.id ?? `${overrides.symbol}-id`,
    symbol: overrides.symbol,
    name: overrides.name ?? overrides.symbol,
    quantity: overrides.quantity ?? 10,
    purchasePrice: overrides.purchasePrice ?? 90,
    currentPrice: overrides.currentPrice ?? 100,
    currency: "EUR",
    assetType: "investment",
    previousClose: overrides.previousClose,
    changePercent: overrides.changePercent,
    providerSymbol: overrides.providerSymbol,
  };
}

function crypto(
  overrides: Partial<StoredPortfolioHolding> & Pick<StoredPortfolioHolding, "symbol">,
): StoredPortfolioHolding {
  return {
    id: overrides.id ?? `${overrides.symbol}-crypto`,
    symbol: overrides.symbol,
    name: overrides.name ?? overrides.symbol,
    quantity: overrides.quantity ?? 1,
    purchasePrice: overrides.purchasePrice ?? 0,
    currentPrice: overrides.currentPrice ?? 0,
    currentPairPrice: overrides.currentPairPrice ?? null,
    pairCurrency: overrides.pairCurrency ?? "EUR",
    tradingPair: overrides.tradingPair ?? `${overrides.symbol}/EUR`,
    currency: "EUR",
    portfolioCurrency: "EUR",
    assetType: "crypto",
    change24hPercent: overrides.change24hPercent,
    changePercent: overrides.changePercent,
    providerSymbol: overrides.providerSymbol,
    priceDataStatus: overrides.priceDataStatus,
  };
}

const btcQuote = {
  symbol: "BTC",
  assetType: "crypto" as const,
  normalizedPair: "BTC/EUR",
  pairPrice: 95_000,
  priceEur: 47_500,
  currentPrice: 47_500,
  change24hPercent: 2.5,
  currency: "EUR",
  provider: "eodhd",
  providerDisplayName: "EODHD",
  updatedAt: "2026-07-25T10:00:00.000Z",
};

const vwceQuote = {
  symbol: "VWCE",
  providerSymbol: "VWCE.XETRA",
  priceEur: 128,
  currentPrice: 128,
  previousClose: 127,
  changePercent: 0.79,
  currency: "EUR",
  updatedAt: "2026-07-25T10:00:00.000Z",
};

describe("mixed portfolio pricing identity", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("shows the same crypto price in crypto-only and mixed portfolios", () => {
    const btc = crypto({
      symbol: "BTC",
      currentPrice: 47_500,
      currentPairPrice: 95_000,
      change24hPercent: 2.5,
      quantity: 0.5,
    });

    const mixed = [btc, equity({ symbol: "VWCE", currentPrice: 128, previousClose: 127 })];
    expect(resolveHoldingDisplayPrice(btc).price).toBe(95_000);
    expect(resolveHoldingDisplayPrice(mixed[0]!).price).toBe(95_000);
  });

  it("applies equity and crypto quotes independently in a mixed portfolio", () => {
    const quotes = parsePriceApiResponseQuotes([btcQuote, vwceQuote]);
    const updated = applyPricesToHoldings(
      [
        crypto({ symbol: "BTC", pairCurrency: "EUR", tradingPair: "BTC/EUR" }),
        equity({ symbol: "VWCE", providerSymbol: "VWCE.XETRA" }),
      ],
      quotes,
    );

    expect(updated[0]?.currentPairPrice).toBe(95_000);
    expect(updated[1]?.currentPrice).toBe(128);
    expect(updated[1]?.previousClose).toBe(127);
  });

  it("does not match ETH/EUR and ETH/USD by ticker alone", () => {
    const quotes = parsePriceApiResponseQuotes([
      {
        symbol: "ETH",
        assetType: "crypto",
        normalizedPair: "ETH/USD",
        pairPrice: 1_854.32,
        priceEur: 1_706.97,
        currentPrice: 1_706.97,
        change24hPercent: -0.48,
        currency: "USD",
      },
    ]);

    expect(
      isQuoteCompatibleWithHolding(
        crypto({
          symbol: "ETH",
          pairCurrency: "EUR",
          tradingPair: "ETH/EUR",
        }),
        quotes[0]!,
      ),
    ).toBe(false);
  });

  it("round-trips crypto pair metadata through the price cache", () => {
    writePriceCache(USER, parsePriceApiResponseQuotes([btcQuote, vwceQuote]));

    const hydrated = applyCachedPrices(USER, [
      crypto({ symbol: "BTC", pairCurrency: "EUR", tradingPair: "BTC/EUR", quantity: 0.5 }),
      equity({ symbol: "VWCE", providerSymbol: "VWCE.XETRA", quantity: 10 }),
    ]);

    expect(hydrated[0]?.currentPairPrice).toBe(95_000);
    expect(hydrated[0]?.change24hPercent).toBe(2.5);
    expect(resolveHoldingDisplayPrice(hydrated[0]!).price).toBe(95_000);
    expect(hydrated[1]?.previousClose).toBe(127);
  });

  it("preserves local crypto prices when cloud hydrate omits market data", () => {
    const local = [
      crypto({
        symbol: "BTC",
        id: "btc-remote",
        currentPrice: 47_500,
        currentPairPrice: 95_000,
        change24hPercent: 2.5,
        priceDataStatus: "live",
        providerSymbol: "BTC-EUR.CC",
      }),
      equity({
        symbol: "VWCE",
        id: "vwce-remote",
        currentPrice: 128,
        previousClose: 127,
      }),
    ];

    writePriceCache(USER, parsePriceApiResponseQuotes([btcQuote, vwceQuote]));

    const snapshot: RemotePortfolioSnapshot = {
      holdings: [
        {
          ...local[0]!,
          currentPrice: 0,
          currentPairPrice: null,
          priceDataStatus: "unavailable",
        },
        {
          ...local[1]!,
          currentPrice: 128,
          previousClose: 127,
        },
      ],
      goal: null,
      importMappings: [],
      migrationCompletedAt: null,
      remoteUpdatedAt: "2026-07-25T11:00:00.000Z",
      portfolioId: "portfolio-1",
      holdingCount: 2,
    };

    const merged = applyRemoteSnapshotToLocalCache(USER, snapshot, {
      preserveLocalPrices: local,
      context: "hydrate",
      force: true,
    });
    expect(merged[0]?.currentPairPrice).toBe(95_000);
    expect(resolveHoldingDisplayPrice(merged[0]!).price).toBe(95_000);
    expect(merged[1]?.currentPrice).toBe(128);
    expect(localStorage.getItem(priceCacheKey(USER))).not.toBeNull();
  });

  it("does not use purchase price when crypto quote is unavailable", () => {
    const unpriced = crypto({
      symbol: "BTC",
      purchasePrice: 40_000,
      currentPrice: 0,
      currentPairPrice: null,
      priceDataStatus: "unavailable",
    });

    expect(resolveHoldingDisplayPrice(unpriced).price).toBeNull();
    expect(getHoldingMarketValue(unpriced)).toBeNull();
  });
});

describe("mixed portfolio daily movement", () => {
  it("aggregates valid equity-only movement", () => {
    const summary = summarizeDailyPerformance([
      equity({
        symbol: "VWCE",
        currentPrice: 128,
        previousClose: 127,
        changePercent: 0.79,
        quantity: 10,
      }),
    ]);

    expect(summary.hasDailyData).toBe(true);
    expect(summary.performanceCoverageComplete).toBe(true);
    expect(summary.todayChange).toBeGreaterThan(0);
  });

  it("aggregates valid crypto-only 24h movement", () => {
    const summary = summarizeDailyPerformance([
      crypto({
        symbol: "BTC",
        currentPrice: 47_500,
        currentPairPrice: 95_000,
        change24hPercent: 2.5,
        quantity: 0.5,
      }),
    ]);

    expect(summary.hasDailyData).toBe(true);
    expect(summary.todayChange).toBeCloseTo(47_500 * 0.5 * 0.025, 1);
  });

  it("aggregates mixed equity and crypto movement", () => {
    const summary = summarizeDailyPerformance([
      equity({
        symbol: "VWCE",
        currentPrice: 128,
        previousClose: 127,
        changePercent: 0.79,
        quantity: 10,
      }),
      crypto({
        symbol: "BTC",
        currentPrice: 47_500,
        currentPairPrice: 95_000,
        change24hPercent: 2.5,
        quantity: 0.5,
      }),
    ]);

    expect(summary.hasDailyData).toBe(true);
    expect(summary.validPerformanceCount).toBe(2);
    expect(summary.todayChange).toBeGreaterThan(0);
    expect(resolveDailyMoveHeroLabel(summarizeDailyMovePeriods(summary.performers))).toBe(
      "Latest portfolio move",
    );
    expect(resolveDailyMovePeriodDetail(summarizeDailyMovePeriods(summary.performers))).toBe(
      "Exchange-traded assets use their latest session; crypto uses 24h.",
    );
  });

  it("excludes an equity without previous close but keeps crypto movement", () => {
    const summary = summarizeDailyPerformance([
      equity({ symbol: "VUSA", currentPrice: 100, quantity: 10 }),
      equity({
        symbol: "VWCE",
        currentPrice: 128,
        previousClose: 127,
        changePercent: 0.79,
        quantity: 10,
      }),
      crypto({
        symbol: "BTC",
        currentPrice: 47_500,
        currentPairPrice: 95_000,
        change24hPercent: 2.5,
        quantity: 0.5,
      }),
    ]);

    expect(summary.hasDailyData).toBe(true);
    expect(summary.performanceCoverageComplete).toBe(false);
    expect(summary.validPerformanceCount).toBe(2);
    expect(summary.eligibleMarketHoldingCount).toBe(3);
    expect(summary.todayChange).toBeGreaterThan(0);
    expect(formatDailyPerformanceCoverageMessage(summary)).toBe(
      "Based on 2 of 3 holdings.",
    );
  });

  it("excludes unavailable crypto without suppressing equity movement", () => {
    const summary = summarizeDailyPerformance([
      equity({
        symbol: "VWCE",
        currentPrice: 128,
        previousClose: 127,
        changePercent: 0.79,
        quantity: 10,
      }),
      crypto({
        symbol: "BTC",
        currentPrice: 0,
        currentPairPrice: null,
        quantity: 0.5,
      }),
    ]);

    expect(summary.hasDailyData).toBe(true);
    expect(summary.validPerformanceCount).toBe(1);
    expect(summary.todayChange).toBeGreaterThan(0);
  });

  it("excludes cash from movement coverage", () => {
    const summary = summarizeDailyPerformance([
      equity({
        symbol: "VWCE",
        currentPrice: 128,
        previousClose: 127,
        changePercent: 0.79,
      }),
      {
        ...equity({ symbol: "EUR", assetType: "cash", currentPrice: 1 }),
        assetType: "cash",
      },
    ]);

    expect(summary.eligibleMarketHoldingCount).toBe(1);
    expect(summary.performanceCoverageComplete).toBe(true);
  });

  it("returns unavailable when no holdings are covered", () => {
    const summary = summarizeDailyPerformance([
      equity({ symbol: "VUSA", currentPrice: 100 }),
      crypto({ symbol: "BTC", currentPrice: 0, currentPairPrice: null }),
    ]);

    expect(summary.hasDailyData).toBe(false);
    expect(summary.todayChange).toBe(0);
  });

  it("keeps zero-percent covered movement as a valid result", () => {
    const summary = summarizeDailyPerformance([
      equity({
        symbol: "FLAT",
        currentPrice: 100,
        previousClose: 100,
        changePercent: 0,
      }),
    ]);

    expect(summary.hasDailyData).toBe(true);
    expect(summary.todayChange).toBe(0);
    expect(summary.todayPercent).toBe(0);
  });

  it("shows partial dashboard movement with coverage messaging", () => {
    const summary = buildDashboardSummary(
      [
        equity({ symbol: "VUSA", currentPrice: 100, quantity: 10 }),
        equity({
          symbol: "VWCE",
          currentPrice: 128,
          previousClose: 127,
          changePercent: 0.79,
          quantity: 10,
        }),
        crypto({
          symbol: "BTC",
          currentPrice: 47_500,
          currentPairPrice: 95_000,
          change24hPercent: 2.5,
          quantity: 0.5,
        }),
      ],
      null,
      false,
    );

    expect(summary.hasDailyData).toBe(true);
    expect(summary.performanceCoverageComplete).toBe(false);
    expect(summary.todayChange).toBeGreaterThan(0);
    expect(summary.dailyPerformanceCoverageMessage).toBe("Based on 2 of 3 holdings.");
    expect(summary.dailyMoveHeroLabel).toBe("Latest portfolio move");
    expect(summary.dailyMovePeriodDetail).toBe(
      "Exchange-traded assets use their latest session; crypto uses 24h.",
    );

    const movers = pickTopAndLowestMovers(summarizeDailyPerformance([
      equity({
        symbol: "VWCE",
        currentPrice: 128,
        previousClose: 127,
        changePercent: 0.79,
      }),
      crypto({
        symbol: "BTC",
        currentPrice: 47_500,
        currentPairPrice: 95_000,
        change24hPercent: 2.5,
      }),
      equity({ symbol: "VUSA", currentPrice: 100 }),
    ]));
    expect(movers.hasReliableMoverData).toBe(true);
  });
});
