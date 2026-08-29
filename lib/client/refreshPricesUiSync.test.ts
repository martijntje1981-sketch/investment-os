/**
 * Regression: successful "Refresh prices" must make previously unavailable
 * prices visible immediately — without remount, F5, or window.location.reload.
 * Also covers the non-EUR presentation FX snapshot path.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  refreshLivePortfolioPrices,
  resetLivePriceRefreshStateForTests,
} from "@/lib/client/livePortfolioPriceRefresh";
import {
  applyCachedPrices,
  loadUserPortfolioHoldings,
  writePortfolioToStorage,
} from "@/lib/client/portfolioPricing";
import { buildPortfolioPerformance } from "@/lib/client/portfolioPerformance";
import {
  formatBaseCurrencyAmount,
  type BaseCurrencyFxSnapshot,
} from "@/lib/services/prices/baseCurrencyFxSnapshot";
import {
  configureMarketDataProvidersForTests,
  loadBaseCurrencyFxSnapshot,
  resetPriceServiceStateForTests,
} from "@/lib/services/prices/priceService";
import { resetMarketPriceCacheForTests } from "@/lib/services/prices/cache/marketPriceCache";
import { resetEodhdDailyQuotaForTests } from "@/lib/services/marketData/eodhdDailyQuota";
import { fetchEodhdFxRates } from "@/lib/services/prices/providers/eodhdMarketDataProvider";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

vi.mock("@/lib/services/prices/providers/eodhdMarketDataProvider", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("@/lib/services/prices/providers/eodhdMarketDataProvider")
  >();
  return {
    ...actual,
    fetchEodhdFxRates: vi.fn(async () => ({
      rates: {
        EUR: 1,
        USD: 0.92,
        GBP: 1.17,
        CHF: 1.05,
      },
      updatedAtByCurrency: {
        USD: "2026-07-26T08:00:00.000Z",
        GBP: "2026-07-26T08:00:00.000Z",
      },
    })),
  };
});

const USER = "refresh-ui-sync-user";

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

function unpricedHolding(): StoredPortfolioHolding {
  return {
    id: "vwce-1",
    symbol: "VWCE",
    name: "Vanguard FTSE All-World",
    quantity: 10,
    purchasePrice: 0,
    currentPrice: 0,
    currency: "EUR",
    assetType: "investment",
    providerSymbol: "VWCE.XETRA",
  };
}

/**
 * Mirrors Portfolio page post-refresh application without remounting a page:
 * refresh → persist priced holdings → derive visible totals/formatters in-place.
 */
function applySuccessfulRefreshToVisibleState(
  userSub: string,
  before: StoredPortfolioHolding[],
  refreshed: StoredPortfolioHolding[],
  fxSnapshot: BaseCurrencyFxSnapshot,
): {
  holdings: StoredPortfolioHolding[];
  totalLabel: string;
  holdingValueLabel: string;
} {
  writePortfolioToStorage(userSub, refreshed);
  const visible = applyCachedPrices(userSub, refreshed);
  const performance = buildPortfolioPerformance(visible);
  const holdingValue =
    visible[0]!.quantity * (visible[0]!.currentPrice > 0 ? visible[0]!.currentPrice : 0);

  return {
    holdings: visible,
    totalLabel: performance.totalValueAvailable
      ? formatBaseCurrencyAmount(performance.totalValue, fxSnapshot)
      : "Unavailable",
    holdingValueLabel:
      holdingValue > 0
        ? formatBaseCurrencyAmount(holdingValue, fxSnapshot)
        : "Price unavailable",
  };
}

describe("refresh prices UI sync", () => {
  beforeEach(() => {
    localStorage.clear();
    resetLivePriceRefreshStateForTests();
    resetPriceServiceStateForTests();
    resetMarketPriceCacheForTests();
    resetEodhdDailyQuotaForTests();
    configureMarketDataProvidersForTests(null);
    vi.mocked(fetchEodhdFxRates).mockReset();
    vi.mocked(fetchEodhdFxRates).mockResolvedValue({
      rates: {
        EUR: 1,
        USD: 0.92,
        GBP: 1.17,
        CHF: 1.05,
      },
      updatedAtByCurrency: {
        USD: "2026-07-26T08:00:00.000Z",
        GBP: "2026-07-26T08:00:00.000Z",
      },
    });
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

  it("makes previously unavailable prices visible immediately after successful refresh without remount", async () => {
    const before = [unpricedHolding()];
    writePortfolioToStorage(USER, before);

    const beforePerf = buildPortfolioPerformance(before);
    expect(beforePerf.totalValueAvailable).toBe(false);

    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => estimateSuccessPayload(),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          prices: [
            {
              symbol: "VWCE",
              providerSymbol: "VWCE.XETRA",
              priceEur: 120,
              currentPrice: 120,
              updatedAt: "2026-07-26T10:00:00.000Z",
              dataStatus: "live",
            },
          ],
          received: 1,
          lastSuccessfulUpdate: "2026-07-26T10:00:00.000Z",
          quoteSource: "provider",
        }),
      } as Response);

    const result = await refreshLivePortfolioPrices(USER, before);
    expect(result.updated).toBe(true);
    expect(result.updatedCount).toBeGreaterThan(0);

    const eurIdentity: BaseCurrencyFxSnapshot = {
      baseCurrency: "EUR",
      eurToBaseRate: 1,
      source: "identity",
      updatedAt: null,
      status: "identity",
      conversionPath: "EUR (identity)",
      foreignToEurRate: null,
    };

    const visible = applySuccessfulRefreshToVisibleState(
      USER,
      before,
      result.holdings,
      eurIdentity,
    );

    expect(visible.holdings[0]?.currentPrice).toBe(120);
    expect(visible.totalLabel).not.toBe("Unavailable");
    expect(visible.holdingValueLabel).not.toBe("Price unavailable");
    expect(visible.totalLabel).toMatch(/€|EUR/);

    // Remount-equivalent read still works, but must not be required for the
    // first visible update above.
    const reloaded = loadUserPortfolioHoldings(USER);
    expect(reloaded[0]?.currentPrice).toBe(120);
  });

  it("non-EUR FX snapshot path: converted totals appear after refresh without remount", async () => {
    // Cold presentation FX previously returned unavailable under snapshotOnly.
    // Soft-fetch must yield a usable USD rate without inventing one.
    const fx = await loadBaseCurrencyFxSnapshot("USD", { snapshotOnly: true });
    expect(fx.status).not.toBe("unavailable");
    expect(fx.eurToBaseRate).not.toBeNull();

    const before = [unpricedHolding()];
    writePortfolioToStorage(USER, before);

    expect(
      formatBaseCurrencyAmount(1200, {
        ...fx,
        status: "unavailable",
        eurToBaseRate: null,
      }),
    ).toBe("Unavailable");

    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => estimateSuccessPayload(),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          prices: [
            {
              symbol: "VWCE",
              providerSymbol: "VWCE.XETRA",
              priceEur: 120,
              currentPrice: 120,
              updatedAt: "2026-07-26T10:00:00.000Z",
              dataStatus: "live",
            },
          ],
          received: 1,
          lastSuccessfulUpdate: "2026-07-26T10:00:00.000Z",
          quoteSource: "provider",
        }),
      } as Response);

    const result = await refreshLivePortfolioPrices(USER, before);
    expect(result.updated).toBe(true);

    // Presentation FX remains a separate request family — reuse warm cache (no
    // extra provider call required for the assertion below).
    const fxAfter = await loadBaseCurrencyFxSnapshot("USD", {
      snapshotOnly: true,
    });
    expect(fxAfter.eurToBaseRate).toBe(fx.eurToBaseRate);

    const visible = applySuccessfulRefreshToVisibleState(
      USER,
      before,
      result.holdings,
      fxAfter,
    );

    expect(visible.totalLabel).not.toBe("Unavailable");
    expect(visible.holdingValueLabel).not.toBe("Price unavailable");
    expect(visible.totalLabel).toMatch(/\$|USD/);
    // 10 * 120 EUR → USD via invert(0.92)
    expect(visible.holdings[0]?.currentPrice).toBe(120);
  });
});
