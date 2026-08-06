import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  isPriceCacheFresh,
  tryRefreshPortfolioPrices,
  writePriceCache,
} from "@/lib/client/portfolioPricing";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

const USER = "user-test-navigation";

const HOLDING: StoredPortfolioHolding = {
  id: "1",
  symbol: "VWCE",
  name: "VWCE",
  assetType: "investment",
  quantity: 1,
  purchasePrice: 100,
  currentPrice: 0,
  providerSymbol: "VWCE.XETRA",
  currency: "EUR",
  updatedAt: new Date().toISOString(),
};

describe("portfolio pricing navigation guard", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          success: true,
          prices: [],
          requested: 0,
          received: 0,
        }),
      })),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("treats a recent local price cache as fresh", () => {
    writePriceCache(USER, [
      {
        symbol: "VWCE",
        providerSymbol: "VWCE.XETRA",
        priceEur: 110,
        currentPrice: 110,
        updatedAt: new Date().toISOString(),
        currency: "EUR",
      },
    ]);

    expect(isPriceCacheFresh(USER)).toBe(true);
  });

  it("skips POST /api/prices when skipIfCacheFresh and cache is fresh", async () => {
    writePriceCache(USER, [
      {
        symbol: "VWCE",
        providerSymbol: "VWCE.XETRA",
        priceEur: 110,
        currentPrice: 110,
        updatedAt: new Date().toISOString(),
        currency: "EUR",
      },
    ]);

    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => ({
        ok: true,
        json: async () =>
          String(url).includes("/api/market-snapshot")
            ? {
                success: true,
                lastRefreshedAt: "2020-01-01T00:00:00.000Z",
                status: "completed",
                symbolsReceived: 1,
              }
            : {
                success: true,
                prices: [],
                requested: 0,
                received: 0,
              },
      })),
    );

    const result = await tryRefreshPortfolioPrices(USER, [HOLDING], {
      skipIfCacheFresh: true,
    });

    expect(fetch).toHaveBeenCalledOnce();
    expect(String(vi.mocked(fetch).mock.calls[0]?.[0])).toContain(
      "/api/market-snapshot",
    );
    expect(result.updated).toBe(false);
    expect(result.message).toMatch(/cached/i);
  });

  it("requests only filtered provider symbols for a new holding", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => ({
        ok: true,
        json: async () =>
          String(url).includes("/api/market-snapshot")
            ? {
                success: true,
                lastRefreshedAt: "2026-07-23T07:30:00.000Z",
                status: "completed",
                symbolsReceived: 1,
              }
            : {
                success: true,
                prices: [
                  {
                    symbol: "VWCE",
                    providerSymbol: "VWCE.XETRA",
                    priceEur: 110,
                    currentPrice: 110,
                    updatedAt: "2026-07-23T07:30:00.000Z",
                  },
                ],
                requested: 1,
                received: 1,
                quoteSource: "cache",
              },
      })),
    );

    await tryRefreshPortfolioPrices(USER, [HOLDING], {
      onlyProviderSymbols: ["VWCE.XETRA"],
    });

    const pricesCall = vi.mocked(fetch).mock.calls.find(([url, init]) => {
      return String(url).includes("/api/prices") && init?.method === "POST";
    });
    expect(pricesCall).toBeTruthy();
    const body = JSON.parse(String(pricesCall?.[1]?.body));
    expect(body.holdings).toHaveLength(1);
    expect(body.holdings[0].providerSymbol).toBe("VWCE.XETRA");
    expect(body.forceRefresh).toBeUndefined();
  });
});
