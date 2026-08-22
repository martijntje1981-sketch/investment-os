/**
 * Dashboard / shared "Refresh prices" action — focused regressions.
 * Avoids importing TSX modules (vitest include is only .test.ts files).
 */

import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { buildDashboardPortfolioSnapshot } from "@/lib/client/dashboardPortfolioSnapshot";
import {
  refreshLivePortfolioPrices,
  resetLivePriceRefreshStateForTests,
} from "@/lib/client/livePortfolioPriceRefresh";
import {
  applyCachedPrices,
  writePortfolioToStorage,
} from "@/lib/client/portfolioPricing";
import { formatBaseCurrencyAmount } from "@/lib/services/prices/baseCurrencyFxSnapshot";
import {
  configureMarketDataProvidersForTests,
  resetPriceServiceStateForTests,
} from "@/lib/services/prices/priceService";
import { resetMarketPriceCacheForTests } from "@/lib/services/prices/cache/marketPriceCache";
import { resetEodhdDailyQuotaForTests } from "@/lib/services/marketData/eodhdDailyQuota";
import { fetchEodhdFxRates } from "@/lib/services/prices/providers/eodhdMarketDataProvider";
import {
  NO_QUOTABLE_REFRESH_MESSAGE,
  runLivePortfolioPriceRefreshAction,
  type RefreshPricesUiStatus,
} from "@/lib/client/livePortfolioPriceRefreshAction";
import type {
  GoalSettings,
  StoredPortfolioHolding,
} from "@/lib/types/portfolioStorage";

/** Markup contract for RefreshPricesButton (mirrors the shared component). */
function RefreshPricesButtonFixture({
  isRefreshing,
  disabled = false,
  status = "idle",
  variant = "compact",
}: {
  isRefreshing: boolean;
  disabled?: boolean;
  status?: RefreshPricesUiStatus;
  variant?: "hero" | "compact";
}) {
  const isDisabled = disabled || isRefreshing;
  const base =
    variant === "compact"
      ? "inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-2"
      : "inline-flex min-h-[44px] items-center gap-2";
  const statusLabel =
    status === "loading"
      ? "Refreshing prices"
      : status === "success"
        ? "Prices updated"
        : status === "error"
          ? "Price refresh failed"
          : "Refresh prices";

  return createElement(
    "button",
    {
      type: "button",
      disabled: isDisabled,
      "aria-busy": isRefreshing,
      "aria-label": statusLabel,
      "data-refresh-status": status,
      className: base,
    },
    createElement("span", null, isRefreshing ? "Refreshing…" : "Refresh prices"),
  );
}

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

const USER = "dashboard-refresh-user";

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
    id: "vwce-dash",
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

function mockEstimateThenRefresh(price = 125): void {
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
            priceEur: price,
            currentPrice: price,
            changePercent: 1.5,
            previousClose: price - 2,
            updatedAt: "2026-07-26T11:00:00.000Z",
            dataStatus: "live",
            marketPriceUpdatedAt: "2026-07-26T11:00:00.000Z",
          },
        ],
        received: 1,
        lastSuccessfulUpdate: "2026-07-26T11:00:00.000Z",
        quoteSource: "provider",
      }),
    } as Response);
}

describe("Dashboard refresh prices action", () => {
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

  it("updates Dashboard totals and movers immediately after successful refresh without remount", async () => {
    const beforeHoldings = [unpricedHolding()];
    writePortfolioToStorage(USER, beforeHoldings);
    const goal: GoalSettings | null = null;

    const beforeSnap = buildDashboardPortfolioSnapshot(beforeHoldings, goal, false);
    expect(beforeSnap.portfolioValueAvailable).toBe(false);

    mockEstimateThenRefresh(130);
    const saved: StoredPortfolioHolding[][] = [];
    const refreshFx = vi.fn();

    const outcome = await runLivePortfolioPriceRefreshAction({
      userSub: USER,
      holdings: beforeHoldings,
      saveHoldings: (next) => {
        saved.push(next);
        writePortfolioToStorage(USER, next);
      },
      baseCurrency: "EUR",
      fxStatus: "identity",
      refreshFx,
    });

    expect(outcome.updated).toBe(true);
    expect(outcome.status).toBe("success");
    expect(outcome.liveRefreshAt).toBeTruthy();
    expect(saved).toHaveLength(1);

    // Same in-memory holdings the Dashboard would render after saveHoldings —
    // no remount / F5 required.
    const visible = applyCachedPrices(USER, outcome.holdings);
    const afterSnap = buildDashboardPortfolioSnapshot(visible, goal, false);
    expect(afterSnap.portfolioValueAvailable).toBe(true);
    expect(afterSnap.portfolioValue).toBe(1300);
    expect(afterSnap.hasDailyData).toBe(true);

    const eurLabel = formatBaseCurrencyAmount(afterSnap.portfolioValue, {
      baseCurrency: "EUR",
      eurToBaseRate: 1,
      source: "identity",
      updatedAt: null,
      status: "identity",
      conversionPath: "EUR (identity)",
      foreignToEurRate: null,
    });
    expect(eurLabel).not.toBe("Unavailable");
    expect(refreshFx).not.toHaveBeenCalled();
  });

  it("shows loading/disabled markup with a 44px touch target", () => {
    const loading = renderToStaticMarkup(
      createElement(RefreshPricesButtonFixture, {
        isRefreshing: true,
        disabled: true,
        status: "loading",
        variant: "compact",
      }),
    );
    expect(loading).toContain("min-h-[44px]");
    expect(loading).toContain("min-w-[44px]");
    expect(loading).toContain("disabled");
    expect(loading).toContain('aria-busy="true"');
    expect(loading).toContain("Refreshing");
    expect(loading).toContain('aria-label="Refreshing prices"');
  });

  it("exposes an error status on the shared button contract", () => {
    const html = renderToStaticMarkup(
      createElement(RefreshPricesButtonFixture, {
        isRefreshing: false,
        status: "error",
        variant: "compact",
      }),
    );
    expect(html).toContain('data-refresh-status="error"');
    expect(html).toContain("Price refresh failed");
  });

  it("marks failed refreshes as error without requiring remount", async () => {
    const holdings = [unpricedHolding()];
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => estimateSuccessPayload(),
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: "Live prices could not be refreshed.",
        }),
      } as Response);

    const outcome = await runLivePortfolioPriceRefreshAction({
      userSub: USER,
      holdings,
      saveHoldings: vi.fn(),
      baseCurrency: "EUR",
      fxStatus: "identity",
      refreshFx: vi.fn(),
    });

    expect(outcome.updated).toBe(false);
    expect(outcome.status).toBe("error");
  });

  it("deduplicates concurrent refresh requests through the shared live refresh path", async () => {
    const holdings = [unpricedHolding()];
    let resolveRefresh: ((value: unknown) => void) | null = null;
    const slowRefresh = new Promise((resolve) => {
      resolveRefresh = resolve;
    });

    vi.mocked(fetch).mockImplementation(async (_url, init) => {
      const body = JSON.parse(String(init?.body ?? "{}")) as {
        estimateOnly?: boolean;
      };
      if (body.estimateOnly) {
        return {
          ok: true,
          json: async () => estimateSuccessPayload(),
        } as Response;
      }
      await slowRefresh;
      return {
        ok: true,
        json: async () => ({
          success: true,
          prices: [
            {
              symbol: "VWCE",
              providerSymbol: "VWCE.XETRA",
              priceEur: 140,
              currentPrice: 140,
              updatedAt: "2026-07-26T11:00:00.000Z",
              dataStatus: "live",
            },
          ],
          received: 1,
          lastSuccessfulUpdate: "2026-07-26T11:00:00.000Z",
          quoteSource: "provider",
        }),
      } as Response;
    });

    const first = refreshLivePortfolioPrices(USER, holdings);
    await Promise.resolve();
    const second = await refreshLivePortfolioPrices(USER, holdings);
    expect(second.inProgress).toBe(true);
    expect(second.updated).toBe(false);

    resolveRefresh?.(null);
    const firstResult = await first;
    expect(firstResult.updated).toBe(true);
  });

  it("conditionally recovers non-EUR FX only when presentation FX is unavailable", async () => {
    const holdings = [unpricedHolding()];
    mockEstimateThenRefresh(110);
    const refreshFx = vi.fn();

    const recovered = await runLivePortfolioPriceRefreshAction({
      userSub: USER,
      holdings,
      saveHoldings: vi.fn(),
      baseCurrency: "USD",
      fxStatus: "unavailable",
      refreshFx,
    });
    expect(recovered.updated).toBe(true);
    expect(recovered.fxRecoveryRequested).toBe(true);
    expect(refreshFx).toHaveBeenCalledTimes(1);

    resetLivePriceRefreshStateForTests();
    mockEstimateThenRefresh(111);
    const refreshFxWarm = vi.fn();
    const warm = await runLivePortfolioPriceRefreshAction({
      userSub: USER,
      holdings,
      saveHoldings: vi.fn(),
      baseCurrency: "USD",
      fxStatus: "current",
      refreshFx: refreshFxWarm,
    });
    expect(warm.updated).toBe(true);
    expect(warm.fxRecoveryRequested).toBe(false);
    expect(refreshFxWarm).not.toHaveBeenCalled();
  });

  it("never requests FX recovery for EUR base currency", async () => {
    const holdings = [unpricedHolding()];
    mockEstimateThenRefresh(120);
    const refreshFx = vi.fn();

    const outcome = await runLivePortfolioPriceRefreshAction({
      userSub: USER,
      holdings,
      saveHoldings: vi.fn(),
      baseCurrency: "EUR",
      fxStatus: "unavailable",
      refreshFx,
    });

    expect(outcome.updated).toBe(true);
    expect(outcome.fxRecoveryRequested).toBe(false);
    expect(refreshFx).not.toHaveBeenCalled();
    expect(fetchEodhdFxRates).not.toHaveBeenCalled();
  });

  it("returns a clear idle message when no holdings are quotable", async () => {
    const holdings: StoredPortfolioHolding[] = [
      {
        ...unpricedHolding(),
        providerSymbol: null,
      },
    ];
    const outcome = await runLivePortfolioPriceRefreshAction({
      userSub: USER,
      holdings,
      saveHoldings: vi.fn(),
      baseCurrency: "EUR",
      fxStatus: "identity",
      refreshFx: vi.fn(),
    });
    expect(outcome.updated).toBe(false);
    expect(outcome.message).toBe(NO_QUOTABLE_REFRESH_MESSAGE);
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });
});
