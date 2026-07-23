import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resetMarketPriceCacheForTests } from "@/lib/services/prices/cache/marketPriceCache";
import { resetPriceServiceMetricsForTests } from "@/lib/services/prices/observability";
import {
  configureMarketDataProvidersForTests,
  getNormalizedQuote,
  loadPricesForTargets,
  resetPriceServiceStateForTests,
} from "@/lib/services/prices/priceService";
import type {
  MarketDataProvider,
  ProviderRawQuote,
  ResolvedPriceTarget,
} from "@/lib/services/prices/types";
import { ProviderQuoteError } from "@/lib/services/prices/providers/eodhdMarketDataProvider";

vi.mock("@/lib/services/prices/providers/eodhdMarketDataProvider", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("@/lib/services/prices/providers/eodhdMarketDataProvider")
  >();
  return {
    ...actual,
    fetchEodhdFxRates: vi.fn(async () => ({
      EUR: 1,
      USD: 0.92,
      GBP: 1.17,
      CHF: 1.05,
    })),
  };
});

const VWCE: ResolvedPriceTarget = {
  symbol: "VWCE",
  providerSymbol: "VWCE.XETRA",
  isin: "IE00BK5BQT80",
  name: "Vanguard FTSE All-World",
  currency: "EUR",
};

const AAPL: ResolvedPriceTarget = {
  symbol: "AAPL",
  providerSymbol: "AAPL.US",
  isin: null,
  name: "Apple",
  currency: "USD",
};

function mockRawQuote(
  providerSymbol: string,
  price: number,
  previousClose: number | null = price - 1,
): ProviderRawQuote {
  return {
    providerSymbol,
    originalCurrency: providerSymbol.endsWith(".US") ? "USD" : "EUR",
    originalPrice: price,
    previousCloseOriginal: previousClose,
    changeOriginal: null,
    changePercentOriginal: null,
    open: price,
    high: price,
    low: price,
    volume: 1000,
    timestamp: 1_700_000_000,
    updatedAt: "2026-07-20T10:00:00.000Z",
    marketStatus: "open",
  };
}

function createMockProvider(
  handler: (symbol: string) => Promise<ProviderRawQuote>,
  id = "eodhd-quotes",
): MarketDataProvider & { calls: string[] } {
  const calls: string[] = [];
  return {
    id,
    calls,
    supports: () => true,
    async getQuote(providerSymbol: string) {
      calls.push(providerSymbol);
      return handler(providerSymbol);
    },
    normalizeQuote(target, raw, fxRates) {
      const rate = fxRates[raw.originalCurrency] ?? 1;
      const currentPrice = raw.originalPrice * rate;
      const previousClose =
        raw.previousCloseOriginal !== null
          ? raw.previousCloseOriginal * rate
          : null;
      const change =
        currentPrice !== null && previousClose !== null
          ? currentPrice - previousClose
          : null;
      const changePercent =
        change !== null && previousClose
          ? (change / previousClose) * 100
          : null;

      return {
        symbol: target.symbol,
        providerSymbol: target.providerSymbol,
        currentPrice,
        previousClose,
        change,
        changePercent,
        currency: raw.originalCurrency,
        marketStatus: raw.marketStatus ?? null,
        updatedAt: raw.updatedAt,
        provider: id,
        isStale: false,
        unavailableReason: null,
        dataStatus: "live",
        cacheStatus: "fresh",
      };
    },
  };
}

function resetAllPriceServiceState(): void {
  resetMarketPriceCacheForTests();
  resetPriceServiceMetricsForTests();
  resetPriceServiceStateForTests();
}

describe("PriceService", () => {
  beforeEach(() => {
    resetAllPriceServiceState();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-20T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    resetAllPriceServiceState();
  });

  it("deduplicates concurrent requests for the same symbol into one provider call", async () => {
    const provider = createMockProvider(async (symbol) =>
      mockRawQuote(symbol, 100, 95),
    );
    configureMarketDataProvidersForTests([provider]);

    const [a, b, c] = await Promise.all([
      getNormalizedQuote(VWCE),
      getNormalizedQuote(VWCE),
      getNormalizedQuote(VWCE),
    ]);

    expect(provider.calls).toEqual(["VWCE.XETRA"]);
    expect(a.currentPrice).toBe(100);
    expect(b.currentPrice).toBe(100);
    expect(c.currentPrice).toBe(100);
  });

  it("serves fresh cache without a second provider call", async () => {
    const provider = createMockProvider(async (symbol) =>
      mockRawQuote(symbol, 110, 100),
    );
    configureMarketDataProvidersForTests([provider]);

    await getNormalizedQuote(VWCE);
    await getNormalizedQuote(VWCE);

    expect(provider.calls).toEqual(["VWCE.XETRA"]);
  });

  it("returns stale cache without background provider calls by default", async () => {
    const provider = createMockProvider(async (symbol) =>
      mockRawQuote(symbol, 120, 115),
    );
    configureMarketDataProvidersForTests([provider]);

    await getNormalizedQuote(VWCE);
    expect(provider.calls).toHaveLength(1);

    vi.advanceTimersByTime(12 * 60 * 60 * 1000 + 30 * 60 * 1000);

    const stale = await getNormalizedQuote(VWCE);
    expect(stale.isStale).toBe(true);
    expect(stale.cacheStatus).toBe("stale");
    expect(stale.currentPrice).toBe(120);
    expect(provider.calls).toEqual(["VWCE.XETRA"]);
  });

  it("deduplicates duplicate symbols in a batch request", async () => {
    const provider = createMockProvider(async (symbol) =>
      mockRawQuote(symbol, 50, 49),
    );
    configureMarketDataProvidersForTests([provider]);

    const payload = await loadPricesForTargets([VWCE, VWCE, AAPL, VWCE]);

    expect(provider.calls.sort()).toEqual(["AAPL.US", "VWCE.XETRA"]);
    expect(payload.requested).toBe(2);
    expect(payload.received).toBe(2);
  });

  it("activates negative cache after quota exhaustion (402)", async () => {
    const provider = createMockProvider(async () => {
      throw new ProviderQuoteError("quota_exhausted", "quota hit", 402);
    });
    configureMarketDataProvidersForTests([provider]);

    await expect(getNormalizedQuote(VWCE)).rejects.toThrow(/quota/i);

    const second = await getNormalizedQuote(VWCE);
    expect(second.dataStatus).toBe("unavailable");
    expect(second.unavailableReason).toMatch(/quota/i);
    expect(provider.calls).toHaveLength(1);
  });

  it("blocks further provider calls while provider cooldown is active", async () => {
    const provider = createMockProvider(async (symbol) =>
      mockRawQuote(symbol, 100, 95),
    );
    configureMarketDataProvidersForTests([provider]);

    await getNormalizedQuote(VWCE);
    expect(provider.calls).toHaveLength(1);

    provider.getQuote = vi.fn(async () => {
      throw new ProviderQuoteError("quota_exhausted", "quota hit", 402);
    });

    await expect(getNormalizedQuote(AAPL)).rejects.toThrow(/quota/i);
    expect(provider.getQuote).toHaveBeenCalledTimes(1);

    const duringCooldown = await getNormalizedQuote(VWCE);
    expect(duringCooldown.currentPrice).toBe(100);
    expect(provider.getQuote).toHaveBeenCalledTimes(1);
  });

  it("retries the provider on forceRefresh even while quote cooldown is active", async () => {
    let quoteHandler = async (symbol: string) => mockRawQuote(symbol, 100, 95);
    const provider = createMockProvider((symbol) => quoteHandler(symbol));
    configureMarketDataProvidersForTests([provider]);

    await getNormalizedQuote(VWCE);
    quoteHandler = async () => {
      throw new ProviderQuoteError("quota_exhausted", "quota hit", 402);
    };
    await expect(getNormalizedQuote(AAPL)).rejects.toThrow(/quota/i);

    quoteHandler = async (symbol: string) => mockRawQuote(symbol, 105, 100);
    const forced = await getNormalizedQuote(VWCE, { forceRefresh: true });
    expect(forced.currentPrice).toBe(105);
    expect(provider.calls).toEqual(["VWCE.XETRA", "AAPL.US", "VWCE.XETRA"]);
  });

  it("returns cached price after provider failure when cache exists", async () => {
    const provider = createMockProvider(async (symbol) =>
      mockRawQuote(symbol, 88, 85),
    );
    configureMarketDataProvidersForTests([provider]);

    await getNormalizedQuote(VWCE);
    expect(provider.calls).toHaveLength(1);

    vi.advanceTimersByTime(12 * 60 * 60 * 1000 + 30 * 60 * 1000);

    provider.getQuote = vi.fn(async () => {
      throw new ProviderQuoteError("provider_error", "provider down", 500);
    });

    const quote = await getNormalizedQuote(VWCE);
    expect(quote.currentPrice).toBe(88);
    expect(quote.cacheStatus).toBe("stale");
  });

  it("does not fall back to stale cache when forceRefresh fails", async () => {
    const provider = createMockProvider(async (symbol) =>
      mockRawQuote(symbol, 88, 85),
    );
    configureMarketDataProvidersForTests([provider]);

    await getNormalizedQuote(VWCE);
    expect(provider.calls).toHaveLength(1);

    vi.advanceTimersByTime(12 * 60 * 60 * 1000 + 30 * 60 * 1000);

    provider.getQuote = vi.fn(async () => {
      throw new ProviderQuoteError("quota_exhausted", "quota hit", 402);
    });

    await expect(getNormalizedQuote(VWCE, { forceRefresh: true })).rejects.toThrow(
      /quota/i,
    );

    const payload = await loadPricesForTargets([VWCE], { forceRefresh: true });
    expect(payload.prices).toHaveLength(0);
    expect(payload.errors[0]).toMatch(/quota/i);
  });

  it("returns unavailable (not zero) when provider fails without cache", async () => {
    const provider = createMockProvider(async () => {
      throw new ProviderQuoteError("provider_error", "provider down", 500);
    });
    configureMarketDataProvidersForTests([provider]);

    await expect(getNormalizedQuote(VWCE)).rejects.toThrow(/provider down/i);

    const payload = await loadPricesForTargets([VWCE]);
    expect(payload.prices).toHaveLength(0);
    expect(payload.errors[0]).toMatch(/provider down/i);
  });

  it("recomputes daily change from current price and previous close", async () => {
    const provider = createMockProvider(async (symbol) =>
      mockRawQuote(symbol, 110, 100),
    );
    configureMarketDataProvidersForTests([provider]);

    const quote = await getNormalizedQuote(VWCE);
    expect(quote.change).toBe(10);
    expect(quote.changePercent).toBe(10);
  });

  it("does not call the provider in snapshotOnly mode without cache", async () => {
    const provider = createMockProvider(async (symbol) =>
      mockRawQuote(symbol, 110, 100),
    );
    configureMarketDataProvidersForTests([provider]);

    const quote = await getNormalizedQuote(VWCE, { snapshotOnly: true });
    expect(provider.calls).toEqual([]);
    expect(quote.dataStatus).toBe("unavailable");
  });

  it("serves cached quotes in snapshotOnly mode", async () => {
    const provider = createMockProvider(async (symbol) =>
      mockRawQuote(symbol, 110, 100),
    );
    configureMarketDataProvidersForTests([provider]);

    await getNormalizedQuote(VWCE);
    expect(provider.calls).toEqual(["VWCE.XETRA"]);

    const snapshotQuote = await getNormalizedQuote(VWCE, { snapshotOnly: true });
    expect(provider.calls).toEqual(["VWCE.XETRA"]);
    expect(snapshotQuote.currentPrice).toBe(110);
  });
});
