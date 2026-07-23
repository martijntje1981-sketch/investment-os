import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildLiveRefreshPreviewMessage,
  countUniqueQuotableProviderSymbols,
  LIVE_PRICE_REFRESH_COOLDOWN_MS,
  refreshLivePortfolioPrices,
  resetLivePriceRefreshStateForTests,
} from "@/lib/client/livePortfolioPriceRefresh";
import {
  applyCachedPrices,
  isPriceCacheFresh,
  loadUserPortfolioHoldings,
  writePortfolioToStorage,
  writePriceCache,
} from "@/lib/client/portfolioPricing";
import { resetMarketPriceCacheForTests } from "@/lib/services/prices/cache/marketPriceCache";
import {
  configureMarketDataProvidersForTests,
  resetPriceServiceStateForTests,
} from "@/lib/services/prices/priceService";
import { resetEodhdDailyQuotaForTests } from "@/lib/services/marketData/eodhdDailyQuota";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

const USER = "user-live-refresh";

function estimateSuccessPayload() {
  return {
    success: true,
    canAffordRefresh: true,
    refreshSummary: {
      providerCallsRequired: 1,
      fxCallsRequired: 0,
      totalCallsRequired: 1,
    },
    eodhdBudget: {
      spendableRemaining: 10,
    },
  };
}

function mockEstimateThenRefresh(
  refreshPayload: Record<string, unknown>,
): void {
  vi.mocked(fetch)
    .mockResolvedValueOnce({
      ok: true,
      json: async () => estimateSuccessPayload(),
    } as Response)
    .mockResolvedValueOnce({
      ok: true,
      json: async () => refreshPayload,
    } as Response);
}

function holding(
  symbol: string,
  providerSymbol: string | null,
): StoredPortfolioHolding {
  return {
    id: symbol,
    symbol,
    name: symbol,
    quantity: 1,
    purchasePrice: 100,
    currentPrice: 0,
    currency: "EUR",
    assetType: "investment",
    providerSymbol,
  };
}

const SYMBOLS = ["STRC.AS", "AIFS.XETRA", "NUKL.XETRA", "VWCE.XETRA", "IB1T.XETRA", "4COP.XETRA"];

describe("livePortfolioPriceRefresh", () => {
  beforeEach(() => {
    localStorage.clear();
    resetLivePriceRefreshStateForTests();
    resetPriceServiceStateForTests();
    resetMarketPriceCacheForTests();
    resetEodhdDailyQuotaForTests();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => estimateSuccessPayload(),
      })),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    configureMarketDataProvidersForTests(null);
  });

  it("counts unique provider symbols and skips unmatched holdings", () => {
    const holdings = [
      ...SYMBOLS.map((symbol) => holding(symbol.split(".")[0]!, symbol)),
      holding("UNKNOWN", null),
    ];

    expect(countUniqueQuotableProviderSymbols(holdings, USER)).toBe(6);
    expect(buildLiveRefreshPreviewMessage(6)).toBe(
      "This will request live prices for 6 unique holdings.",
    );
  });

  it("deduplicates duplicate provider symbols in the refresh payload", async () => {
    writePortfolioToStorage(USER, [
      holding("VWCE", "VWCE.XETRA"),
      holding("VWCE2", "VWCE.XETRA"),
    ]);

    mockEstimateThenRefresh({
      success: true,
      prices: [
        {
          symbol: "VWCE",
          providerSymbol: "VWCE.XETRA",
          priceEur: 110,
          currentPrice: 110,
          updatedAt: new Date().toISOString(),
        },
      ],
      requested: 1,
      received: 1,
      refreshSummary: {
        uniqueSymbols: ["VWCE.XETRA"],
        providerCallsRequired: 1,
        providerCallsMade: 1,
      },
    });

    await refreshLivePortfolioPrices(USER, loadUserPortfolioHoldings(USER));

    expect(fetch).toHaveBeenCalledTimes(2);
    const [, forceInit] = vi.mocked(fetch).mock.calls[1]!;
    const body = JSON.parse(String(forceInit?.body));
    expect(body.holdings).toHaveLength(2);
    expect(body.forceRefresh).toBe(true);
  });

  it("applies cooldown after a successful refresh", async () => {
    writePortfolioToStorage(USER, [holding("VWCE", "VWCE.XETRA")]);

    mockEstimateThenRefresh({
      success: true,
      prices: [
        {
          symbol: "VWCE",
          providerSymbol: "VWCE.XETRA",
          priceEur: 111,
          currentPrice: 111,
          updatedAt: new Date().toISOString(),
        },
      ],
      requested: 1,
      received: 1,
    });

    const first = await refreshLivePortfolioPrices(USER, loadUserPortfolioHoldings(USER));
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(first.updated).toBe(true);

    const second = await refreshLivePortfolioPrices(USER, loadUserPortfolioHoldings(USER));
    expect(second.cooldownRemainingMs).toBeGreaterThan(0);
    expect(second.message).toMatch(/cooling down/i);
  });

  it("reuses cached prices across portfolio reads without extra fetch calls", () => {
    writePortfolioToStorage(USER, [holding("VWCE", "VWCE.XETRA")]);
    writePriceCache(USER, [
      {
        symbol: "VWCE",
        providerSymbol: "VWCE.XETRA",
        priceEur: 110,
        currentPrice: 110,
        updatedAt: new Date().toISOString(),
        quoteSource: "provider",
        lastSuccessfulUpdate: new Date().toISOString(),
      },
    ]);

    const first = loadUserPortfolioHoldings(USER);
    const second = loadUserPortfolioHoldings(USER);

    expect(first[0]?.currentPrice).toBe(110);
    expect(second[0]?.currentPrice).toBe(110);
    expect(isPriceCacheFresh(USER)).toBe(true);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("clears stale quota state when the provider returns fresh quotes", async () => {
    writePortfolioToStorage(USER, [holding("VWCE", "VWCE.XETRA")]);

    mockEstimateThenRefresh({
      success: true,
      prices: [
        {
          symbol: "VWCE",
          providerSymbol: "VWCE.XETRA",
          priceEur: 112,
          currentPrice: 112,
          updatedAt: new Date().toISOString(),
        },
      ],
      requested: 1,
      received: 1,
      refreshSummary: {
        circuitOpen: false,
        providerCallsMade: 1,
      },
    });

    const result = await refreshLivePortfolioPrices(USER, loadUserPortfolioHoldings(USER));

    expect(result.quotaExhausted).toBe(false);
    expect(result.updated).toBe(true);
    expect(result.message).toMatch(/Live prices updated/i);
  });

  it("preserves stale prices and shows quota message when provider is exhausted", async () => {
    writePortfolioToStorage(USER, [holding("VWCE", "VWCE.XETRA")]);
    writePriceCache(USER, [
      {
        symbol: "VWCE",
        providerSymbol: "VWCE.XETRA",
        priceEur: 110,
        currentPrice: 110,
        updatedAt: new Date().toISOString(),
      },
    ]);

    resetLivePriceRefreshStateForTests();

    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => estimateSuccessPayload(),
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: "402 Payment Required",
          refreshSummary: { circuitOpen: true },
        }),
      } as Response);

    const result = await refreshLivePortfolioPrices(USER, loadUserPortfolioHoldings(USER));

    expect(result.quotaExhausted).toBe(true);
    expect(result.message).toMatch(/market-data limit has been reached/i);
    expect(result.holdings[0]?.currentPrice).toBe(110);
  });

  it("treats stale cache-only refresh responses as quota exhaustion", async () => {
    writePortfolioToStorage(USER, [holding("VWCE", "VWCE.XETRA")]);
    writePriceCache(USER, [
      {
        symbol: "VWCE",
        providerSymbol: "VWCE.XETRA",
        priceEur: 110,
        currentPrice: 110,
        updatedAt: "2026-07-22T15:46:00.000Z",
        dataStatus: "stale",
      },
    ]);

    resetLivePriceRefreshStateForTests();

    mockEstimateThenRefresh({
      success: true,
      prices: [
        {
          symbol: "VWCE",
          providerSymbol: "VWCE.XETRA",
          priceEur: 110,
          currentPrice: 110,
          updatedAt: "2026-07-22T15:46:00.000Z",
          dataStatus: "stale",
        },
      ],
      requested: 1,
      received: 1,
      quoteSource: "cache",
      refreshSummary: {
        providerCallsMade: 0,
        circuitOpen: true,
      },
    });

    const result = await refreshLivePortfolioPrices(USER, loadUserPortfolioHoldings(USER));

    expect(result.quotaExhausted).toBe(true);
    expect(result.updated).toBe(false);
    expect(result.message).toMatch(/market-data limit has been reached/i);
    expect(result.holdings[0]?.priceDataStatus).toBe("stale");
  });

  it("blocks repeated clicks while a refresh is in flight", async () => {
    writePortfolioToStorage(USER, [holding("VWCE", "VWCE.XETRA")]);

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => estimateSuccessPayload(),
    } as Response);

    void refreshLivePortfolioPrices(USER, loadUserPortfolioHoldings(USER));
    const second = await refreshLivePortfolioPrices(USER, loadUserPortfolioHoldings(USER));

    expect(second.inProgress).toBe(true);
    expect(second.message).toMatch(/already in progress/i);
  });

  it("uses the configured cooldown window", () => {
    expect(LIVE_PRICE_REFRESH_COOLDOWN_MS).toBeGreaterThanOrEqual(60_000);
  });
});
