import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { mapConsensusResultToCard } from "@/lib/client/marketConsensus/mapConsensusResultToCard";
import {
  expireMarketConsensusCacheEntryForTests,
  getCachedMarketConsensus,
  readMarketConsensusCacheEntry,
  resetMarketConsensusCacheForTests,
  writeMarketConsensusCacheEntry,
} from "@/lib/services/marketConsensus/cache/consensusCache";
import {
  configureMarketConsensusServiceForTests,
  getMarketConsensusForPortfolio,
  resetMarketConsensusServiceForTests,
} from "@/lib/services/marketConsensus/marketConsensusService";
import { resetMarketConsensusNarrativeCacheForTests } from "@/lib/services/marketConsensus/narrative/narrativeCache";
import {
  resetMarketConsensusNarrativeServiceForTests,
} from "@/lib/services/marketConsensus/narrative/marketConsensusNarrativeService";
import {
  buildStaticConsensusResult,
  nullMarketConsensusProvider,
} from "@/lib/services/marketConsensus/providers/registry";
import type {
  AnalystConsensusResult,
  MarketConsensusProvider,
} from "@/lib/services/marketConsensus/types";
import {
  validateAndSanitizeConsensusResult,
} from "@/lib/services/marketConsensus/validateConsensusResult";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

import { buildMarketConsensusViewModel } from "@/lib/client/marketConsensus/buildMarketConsensusViewModel";

function holding(
  overrides: Partial<StoredPortfolioHolding> = {},
): StoredPortfolioHolding {
  return {
    id: overrides.id ?? "holding-1",
    symbol: overrides.symbol ?? "ASML",
    name: overrides.name ?? "ASML Holding",
    quantity: overrides.quantity ?? 10,
    purchasePrice: overrides.purchasePrice ?? 600,
    currentPrice: overrides.currentPrice ?? 700,
    currency: "EUR",
    assetType: overrides.assetType ?? "investment",
    providerSymbol: overrides.providerSymbol ?? "ASML.AS",
    ...overrides,
  };
}

function completeEquityResult(
  overrides: Partial<AnalystConsensusResult> = {},
): AnalystConsensusResult {
  return {
    instrumentId: "holding-1",
    symbol: "ASML",
    coverageType: "equity-analyst",
    availability: "available",
    classification: "positive",
    analystCount: 10,
    buyCount: 7,
    holdCount: 2,
    sellCount: 1,
    currentPrice: 700,
    averageTarget: 760,
    impliedUpsidePercent: 8.6,
    agreementLevel: "high",
    sourceName: "Test provider",
    updatedAt: "2026-07-24T12:00:00.000Z",
    ...overrides,
  };
}

function createMockProvider(
  id: string,
  handler: MarketConsensusProvider["getConsensus"],
): MarketConsensusProvider {
  return {
    id,
    supports: (target) => target.assetType !== "cash",
    getConsensus: handler,
  };
}

describe("market consensus architecture", () => {
  beforeEach(() => {
    resetMarketConsensusCacheForTests();
    resetMarketConsensusServiceForTests();
    resetMarketConsensusNarrativeCacheForTests();
    resetMarketConsensusNarrativeServiceForTests();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    resetMarketConsensusCacheForTests();
    resetMarketConsensusServiceForTests();
    resetMarketConsensusNarrativeCacheForTests();
    resetMarketConsensusNarrativeServiceForTests();
  });

  it("null provider returns unavailable safely", async () => {
    const result = await nullMarketConsensusProvider.getConsensus(holding(), {
      fxRateToEur: 0.9,
    });

    expect(result.availability).toBe("unavailable");
    expect(result.classification).toBe("unavailable");
    expect(result.buyCount).toBeUndefined();
  });

  it("accepts complete valid equity coverage", () => {
    const sanitized = validateAndSanitizeConsensusResult(completeEquityResult());

    expect(sanitized.availability).toBe("available");
    expect(sanitized.classification).toBe("positive");
    expect(sanitized.buyCount).toBe(7);
    expect(sanitized.impliedUpsidePercent).toBe(8.6);
  });

  it("downgrades incomplete analyst distribution", () => {
    const sanitized = validateAndSanitizeConsensusResult(
      completeEquityResult({
        analystCount: 10,
        buyCount: 4,
        holdCount: 2,
        sellCount: 1,
      }),
    );

    expect(sanitized.availability).toBe("limited");
    expect(sanitized.buyCount).toBeUndefined();
    expect(sanitized.impliedUpsidePercent).toBeUndefined();
  });

  it("prevents ETF holdings from receiving equity price-target UI", () => {
    const card = mapConsensusResultToCard({
      holding: holding({
        id: "etf-1",
        symbol: "VWCE",
        name: "Vanguard FTSE All-World UCITS ETF",
        providerSymbol: "VWCE.XETRA",
      }),
      position: {
        holding: holding({
          id: "etf-1",
          symbol: "VWCE",
          name: "Vanguard FTSE All-World UCITS ETF",
          providerSymbol: "VWCE.XETRA",
        }),
        value: 5000,
        weightPercent: 25,
      },
      result: completeEquityResult({
        instrumentId: "etf-1",
        coverageType: "underlying-market",
        availability: "unavailable",
      }),
      isLoading: false,
    });

    expect(card.state).toBe("etf_outlook");
    expect(card.ratingDistribution).toBeNull();
    expect(card.priceTargetLabel).toBeNull();
    expect(card.impliedUpsideLabel).toBeNull();
  });

  it("prevents crypto ETP holdings from receiving Buy/Hold/Sell UI", () => {
    const card = mapConsensusResultToCard({
      holding: holding({
        id: "btc-1",
        symbol: "IB1T",
        name: "Bitcoin ETP",
        providerSymbol: "IB1T.XETRA",
      }),
      result: completeEquityResult({
        instrumentId: "btc-1",
        coverageType: "crypto-market-outlook",
        availability: "limited",
      }),
      isLoading: false,
    });

    expect(card.state).toBe("crypto_outlook");
    expect(card.ratingDistribution).toBeNull();
    expect(card.cryptoDisclaimer).toContain("Crypto forecasts");
  });

  it("does not block other holdings when one provider call fails", async () => {
    const fetchMock = vi.fn(async (target: StoredPortfolioHolding) => {
      if (target.id === "fail-1") {
        throw new Error("provider failed");
      }

      return completeEquityResult({
        instrumentId: target.id,
        symbol: target.symbol,
      });
    });

    configureMarketConsensusServiceForTests({
      providerAvailable: true,
      providers: [createMockProvider("mock", fetchMock)],
    });

    const results = await getMarketConsensusForPortfolio([
      holding({ id: "ok-1", symbol: "OK", providerSymbol: "OK.US" }),
      holding({ id: "fail-1", symbol: "FAIL", providerSymbol: "FAIL.US" }),
      holding({
        id: "etf-1",
        symbol: "VWCE",
        name: "Vanguard FTSE All-World UCITS ETF",
        providerSymbol: "VWCE.XETRA",
      }),
    ]);

    expect(results).toHaveLength(3);
    expect(results[0]?.availability).toBe("available");
    expect(results[1]?.availability).toBe("unavailable");
    expect(results[2]?.coverageType).toBe("underlying-market");
  });

  it("cache prevents duplicate provider calls", async () => {
    const fetchMock = vi.fn(async () => completeEquityResult());

    configureMarketConsensusServiceForTests({
      providerAvailable: true,
      providers: [createMockProvider("mock", fetchMock)],
    });

    const target = holding();
    await getMarketConsensusForPortfolio([target]);
    await getMarketConsensusForPortfolio([target]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("deduplicates concurrent requests", async () => {
    let resolveFetch: ((value: AnalystConsensusResult) => void) | undefined;
    const fetchMock = vi.fn(
      () =>
        new Promise<AnalystConsensusResult>((resolve) => {
          resolveFetch = resolve;
        }),
    );

    configureMarketConsensusServiceForTests({
      providerAvailable: true,
      providers: [createMockProvider("mock", fetchMock)],
    });

    const target = holding({ id: "concurrent-1" });
    const cacheKey = `${target.id}:ASML.AS:equity`;
    const first = getCachedMarketConsensus(cacheKey, () =>
      fetchMock(holding(), { fxRateToEur: null }),
    );
    const second = getCachedMarketConsensus(cacheKey, () =>
      fetchMock(holding(), { fxRateToEur: null }),
    );

    resolveFetch?.(completeEquityResult({ instrumentId: target.id }));
    const [one, two] = await Promise.all([first, second]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(one.instrumentId).toBe(two.instrumentId);
  });

  it("returns stale cache when provider fetch fails", async () => {
    const cacheKey = "stale:test";
    writeMarketConsensusCacheEntry(cacheKey, completeEquityResult());
    expireMarketConsensusCacheEntryForTests(cacheKey);

    const result = await getCachedMarketConsensus(cacheKey, async () => {
      throw new Error("provider down");
    });

    expect(result.isStale).toBe(true);
    expect(result.availability).toBe("limited");
    expect(readMarketConsensusCacheEntry(cacheKey)?.result.availability).toBe(
      "available",
    );
  });

  it("production view model never uses demo cards", () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    const viewModel = buildMarketConsensusViewModel({
      valuedPositions: [
        {
          holding: holding(),
          value: 7000,
          weightPercent: 35,
        },
      ],
      unvaluedHoldings: [],
      results: [completeEquityResult()],
      summary: {
        summary: "Third-party analyst coverage is available for 1 of 1 investment holdings.",
        holdingsWithCoverage: 1,
        positiveConsensus: 1,
        mixedConsensus: 0,
        limitedCoverage: 0,
        totalInvestments: 1,
        providerAvailable: true,
        generatedAt: "2026-07-24T12:00:00.000Z",
      },
      isLoading: false,
    });

    expect(viewModel.showDevPreviewBanner).toBe(false);
    expect(viewModel.portfolioSummary.isDemoData).toBe(false);
    expect(viewModel.holdingCards.every((card) => !card.isDemoData)).toBe(true);
    expect(viewModel.holdingCards.some((card) => card.id.startsWith("demo-"))).toBe(
      false,
    );

    process.env.NODE_ENV = originalEnv;
  });

  it("static ETF and crypto results stay provider-neutral", () => {
    const etf = buildStaticConsensusResult(
      holding({
        symbol: "VWCE",
        name: "Vanguard FTSE All-World UCITS ETF",
        providerSymbol: "VWCE.XETRA",
      }),
    );
    const crypto = buildStaticConsensusResult(
      holding({
        symbol: "IB1T",
        name: "Bitcoin ETP",
        providerSymbol: "IB1T.XETRA",
      }),
    );

    expect(etf.coverageType).toBe("underlying-market");
    expect(etf.buyCount).toBeUndefined();
    expect(crypto.coverageType).toBe("crypto-market-outlook");
    expect(crypto.buyCount).toBeUndefined();
  });
});
