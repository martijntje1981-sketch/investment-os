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

    const result = await tryRefreshPortfolioPrices(USER, [HOLDING], {
      skipIfCacheFresh: true,
    });

    expect(fetch).not.toHaveBeenCalled();
    expect(result.updated).toBe(false);
    expect(result.message).toMatch(/cached/i);
  });

  it("requests only filtered provider symbols for a new holding", async () => {
    await tryRefreshPortfolioPrices(USER, [HOLDING], {
      onlyProviderSymbols: ["VWCE.XETRA"],
    });

    expect(fetch).toHaveBeenCalledOnce();
    const [, init] = vi.mocked(fetch).mock.calls[0]!;
    const body = JSON.parse(String(init?.body));
    expect(body.holdings).toHaveLength(1);
    expect(body.holdings[0].providerSymbol).toBe("VWCE.XETRA");
  });
});
