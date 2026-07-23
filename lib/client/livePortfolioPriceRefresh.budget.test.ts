import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  refreshLivePortfolioPrices,
  resetLivePriceRefreshStateForTests,
} from "@/lib/client/livePortfolioPriceRefresh";
import { resetEodhdDailyQuotaForTests } from "@/lib/services/marketData/eodhdDailyQuota";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

const USER = "budget-user";

function holding(): StoredPortfolioHolding {
  return {
    id: "vwce",
    symbol: "VWCE",
    name: "VWCE",
    quantity: 1,
    purchasePrice: 100,
    currentPrice: 100,
    currency: "EUR",
    assetType: "investment",
    providerSymbol: "VWCE.XETRA",
  };
}

describe("manual live refresh budget guard", () => {
  beforeEach(() => {
    resetLivePriceRefreshStateForTests();
    resetEodhdDailyQuotaForTests();
    vi.restoreAllMocks();
  });

  it("blocks manual refresh before force refresh when estimate reports insufficient budget", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        canAffordRefresh: false,
        refreshSummary: {
          providerCallsRequired: 5,
          fxCallsRequired: 1,
          totalCallsRequired: 6,
        },
        eodhdBudget: {
          spendableRemaining: 0,
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await refreshLivePortfolioPrices(USER, [holding()]);

    expect(result.quotaExhausted).toBe(true);
    expect(result.updated).toBe(false);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(String(fetchMock.mock.calls[0]?.[1]?.body)).toContain(
      '"estimateOnly":true',
    );
  });

  it("requests estimate before force refresh when budget is available", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
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
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
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
        }),
      });

    vi.stubGlobal("fetch", fetchMock);

    const result = await refreshLivePortfolioPrices(USER, [holding()]);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0]?.[1]?.body)).toContain(
      '"estimateOnly":true',
    );
    expect(result.updated).toBe(true);
  });
});
