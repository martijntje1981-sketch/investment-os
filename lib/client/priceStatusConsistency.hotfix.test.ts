/**
 * Pre-launch price-status consistency hotfix.
 * Refresh-warning stickiness + Delayed vs Last session after venue close.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getHoldingMarketValue } from "@/lib/client/portfolioAnalysis";
import {
  holdingPriceHoldingsLabel,
  holdingPriceStatusUserLabel,
  holdingPriceTrustBadgeLabel,
  resolveHoldingDisplayPrice,
  resolveHoldingListedMarketGroup,
} from "@/lib/client/holdingDisplayPrice";
import {
  resetLivePriceRefreshStateForTests,
} from "@/lib/client/livePortfolioPriceRefresh";
import {
  readLivePriceRefreshUiState,
  resetLivePriceRefreshUiStateForTests,
  runLivePortfolioPriceRefreshAction,
} from "@/lib/client/livePortfolioPriceRefreshAction";
import {
  writePortfolioToStorage,
} from "@/lib/client/portfolioPricing";
import { resetMarketPriceCacheForTests } from "@/lib/services/prices/cache/marketPriceCache";
import { resetEodhdDailyQuotaForTests } from "@/lib/services/marketData/eodhdDailyQuota";
import {
  configureMarketDataProvidersForTests,
  resetPriceServiceStateForTests,
} from "@/lib/services/prices/priceService";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

const USER = "price-status-hotfix-user";
const EUROPE_OPEN = new Date("2026-08-19T10:00:00.000Z");
const EUROPE_CLOSED_US_OPEN = new Date("2026-08-19T16:00:00.000Z");

function read(relativePath: string): string {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

function equity(
  overrides: Partial<StoredPortfolioHolding> & Pick<StoredPortfolioHolding, "symbol">,
): StoredPortfolioHolding {
  return {
    id: `${overrides.symbol}-id`,
    name: overrides.name ?? overrides.symbol,
    quantity: 10,
    purchasePrice: 80,
    currentPrice: 100,
    currency: "EUR",
    assetType: "investment",
    ...overrides,
  };
}

function estimateSuccessPayload() {
  return {
    success: true,
    canAffordRefresh: true,
    refreshSummary: { providerCallsRequired: 1, fxCallsRequired: 0, totalCallsRequired: 1 },
    eodhdBudget: { spendableRemaining: 10 },
  };
}

describe("price status consistency hotfix", () => {
  beforeEach(() => {
    localStorage.clear();
    resetLivePriceRefreshStateForTests();
    resetLivePriceRefreshUiStateForTests();
    resetPriceServiceStateForTests();
    resetMarketPriceCacheForTests();
    resetEodhdDailyQuotaForTests();
    configureMarketDataProvidersForTests(null);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => estimateSuccessPayload(),
      })),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    configureMarketDataProvidersForTests(null);
    resetLivePriceRefreshUiStateForTests();
  });

  it("A. previous refresh failure then later success clears the warning", async () => {
    const holdings = [
      equity({ symbol: "VWCE", providerSymbol: "VWCE.XETRA", currentPrice: 110 }),
    ];
    writePortfolioToStorage(USER, holdings);

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

    const failed = await runLivePortfolioPriceRefreshAction({
      userSub: USER,
      holdings,
      saveHoldings: vi.fn(),
      baseCurrency: "EUR",
      fxStatus: "identity",
      refreshFx: vi.fn(),
    });
    expect(failed.status).toBe("error");
    expect(readLivePriceRefreshUiState(USER)?.status).toBe("error");

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
              priceEur: 121,
              currentPrice: 121,
              dataStatus: "delayed",
              updatedAt: "2026-08-19T16:05:00.000Z",
            },
          ],
          received: 1,
          lastSuccessfulUpdate: "2026-08-19T16:05:00.000Z",
          quoteSource: "provider",
        }),
      } as Response);

    const succeeded = await runLivePortfolioPriceRefreshAction({
      userSub: USER,
      holdings,
      saveHoldings: (next) => writePortfolioToStorage(USER, next),
      baseCurrency: "EUR",
      fxStatus: "identity",
      refreshFx: vi.fn(),
    });
    expect(succeeded.updated).toBe(true);
    expect(succeeded.status).toBe("success");
    expect(readLivePriceRefreshUiState(USER)?.status).toBe("success");
  });

  it("B. genuine failure keeps the warning while last-known-good stays visible", async () => {
    const holdings = [
      equity({ symbol: "VWCE", providerSymbol: "VWCE.XETRA", currentPrice: 110 }),
    ];
    writePortfolioToStorage(USER, holdings);
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
    expect(outcome.holdings[0]?.currentPrice).toBe(110);
    expect(outcome.message).toMatch(/last available prices remain visible/i);
  });

  it("C. Dashboard and Portfolio refresh warnings agree on shared action state", async () => {
    const holdings = [
      equity({ symbol: "VWCE", providerSymbol: "VWCE.XETRA", currentPrice: 110 }),
    ];
    writePortfolioToStorage(USER, holdings);
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
              priceEur: 122,
              currentPrice: 122,
              dataStatus: "delayed",
            },
          ],
          received: 1,
          quoteSource: "provider",
        }),
      } as Response);

    const dashboard = await runLivePortfolioPriceRefreshAction({
      userSub: USER,
      holdings,
      saveHoldings: (next) => writePortfolioToStorage(USER, next),
      baseCurrency: "EUR",
      fxStatus: "identity",
      refreshFx: vi.fn(),
    });
    const portfolio = readLivePriceRefreshUiState(USER);
    expect(dashboard.status).toBe("success");
    expect(portfolio?.status).toBe(dashboard.status);
    expect(portfolio?.message).toBe(dashboard.message);

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        prices: [],
        requested: 1,
        received: 0,
      }),
    } as Response);

    const cacheFirst = await runLivePortfolioPriceRefreshAction({
      userSub: USER,
      holdings: dashboard.holdings,
      saveHoldings: vi.fn(),
      baseCurrency: "EUR",
      fxStatus: "identity",
      refreshFx: vi.fn(),
      cacheFirst: true,
    });
    expect(cacheFirst.updated).toBe(false);
    expect(cacheFirst.status).toBe("idle");
    expect(cacheFirst.holdings[0]?.currentPrice).toBe(122);
    expect(readLivePriceRefreshUiState(USER)?.status).toBe("idle");
  });

  it("D. delayed European quote while the venue is open is Delayed", () => {
    for (const row of [
      equity({ symbol: "IB1T", providerSymbol: "IB1T.XETRA", priceDataStatus: "delayed" }),
      equity({ symbol: "NUKL", providerSymbol: "NUKL.XETRA", priceDataStatus: "delayed" }),
      equity({ symbol: "VWCE", providerSymbol: "VWCE.XETRA", priceDataStatus: "delayed" }),
      equity({ symbol: "EUNA", providerSymbol: "EUNA.XETRA", priceDataStatus: "delayed" }),
    ]) {
      const source = resolveHoldingDisplayPrice(row, { now: EUROPE_OPEN }).source;
      expect(source).toBe("delayed");
      expect(holdingPriceStatusUserLabel(source)).toBe("Delayed");
      expect(holdingPriceHoldingsLabel(source)).toBe("Delayed");
    }
  });

  it("E. the same delayed quote after European close is Last session", () => {
    for (const row of [
      equity({ symbol: "IB1T", providerSymbol: "IB1T.XETRA", priceDataStatus: "delayed" }),
      equity({ symbol: "NUKL", priceDataStatus: "delayed" }),
      equity({ symbol: "VWCE", providerSymbol: "VWCE.XETRA", priceDataStatus: "delayed" }),
      equity({ symbol: "EUNA", providerSymbol: "EUNA.XETRA", priceDataStatus: "delayed" }),
    ]) {
      const source = resolveHoldingDisplayPrice(row, {
        now: EUROPE_CLOSED_US_OPEN,
      }).source;
      expect(source).toBe("last_session");
      expect(holdingPriceStatusUserLabel(source)).toBe("Last session");
      expect(holdingPriceHoldingsLabel(source)).toBe("Last session");
      expect(holdingPriceTrustBadgeLabel(source)).toBeNull();
    }
  });

  it("F. a current BTC pair remains Current after European close", () => {
    const btc: StoredPortfolioHolding = {
      id: "btc",
      symbol: "BTC",
      name: "Bitcoin",
      quantity: 0.1,
      purchasePrice: 40_000,
      currentPrice: 60_000,
      currentPairPrice: 60_000,
      pairCurrency: "EUR",
      currency: "EUR",
      assetType: "crypto",
      pricingStatus: "live",
      priceDataStatus: "live",
    };
    const source = resolveHoldingDisplayPrice(btc, {
      now: EUROPE_CLOSED_US_OPEN,
    }).source;
    expect(source).toBe("live");
    expect(holdingPriceStatusUserLabel(source)).toBe("Current");
    expect(holdingPriceHoldingsLabel(source)).toBeNull();
  });

  it("G. unavailable never becomes a €0 value", () => {
    const missing = equity({
      symbol: "GONE",
      currentPrice: 0,
      purchasePrice: 0,
      priceDataStatus: "unavailable",
    });
    expect(resolveHoldingDisplayPrice(missing).source).toBe("unavailable");
    expect(resolveHoldingDisplayPrice(missing).price).toBeNull();
    expect(getHoldingMarketValue(missing)).toBeNull();
    expect(holdingPriceStatusUserLabel("unavailable")).toBe("Price unavailable");
  });

  it("H. PDF and Excel still use the canonical display helpers", () => {
    const brief = read("lib/services/periodIntelligence/buildPeriodReportBrief.ts");
    const excel = read("lib/client/portfolioExport.ts");
    expect(brief).toContain("holdingPriceStatusUserLabel");
    expect(brief).toContain("resolveHoldingPriceTrustStatus");
    expect(excel).toContain("holdingPriceStatusUserLabel");
    expect(excel).toContain("resolveHoldingDisplayPrice");
  });

  it("H. unique verified suffixless NUKL resolves to Xetra / Europe", () => {
    const nukl = equity({ symbol: "NUKL", priceDataStatus: "delayed" });
    expect(nukl.providerSymbol).toBeUndefined();
    expect(resolveHoldingListedMarketGroup(nukl)).toBe("Europe");
    expect(
      resolveHoldingDisplayPrice(nukl, { now: EUROPE_CLOSED_US_OPEN }).source,
    ).toBe("last_session");
  });

  it("J. IB1T / NUKL / VWCE traces: Delayed while Xetra open, Last session after close even if US is open", () => {
    const traces = [
      equity({ symbol: "IB1T", providerSymbol: "IB1T.XETRA", priceDataStatus: "delayed" }),
      equity({ symbol: "NUKL", priceDataStatus: "delayed" }),
      equity({ symbol: "VWCE", providerSymbol: "VWCE", priceDataStatus: "delayed" }),
    ];
    for (const row of traces) {
      expect(resolveHoldingListedMarketGroup(row)).toBe("Europe");
      expect(resolveHoldingDisplayPrice(row, { now: EUROPE_OPEN }).source).toBe(
        "delayed",
      );
      expect(
        resolveHoldingDisplayPrice(row, { now: EUROPE_CLOSED_US_OPEN }).source,
      ).toBe("last_session");
      expect(
        holdingPriceHoldingsLabel(
          resolveHoldingDisplayPrice(row, { now: EUROPE_CLOSED_US_OPEN }).source,
        ),
      ).toBe("Last session");
    }
  });

  it("uses the canonical holdings label on Dashboard, Portfolio, and holding detail", () => {
    const holdingsRow = read("components/dashboard/HoldingsTodayRow.tsx");
    const portfolio = read("components/portfolio/glance/PortfolioHoldingsList.tsx");
    const holdingPage = read("app/holding/[ticker]/page.tsx");
    const symbolPage = read("app/portfolio/[symbol]/page.tsx");
    expect(holdingsRow).toContain("formatHoldingQuoteTrustLine");
    expect(portfolio).toContain("holdingPriceHoldingsLabel");
    expect(holdingPage).toContain("holdingPriceHoldingsLabel");
    expect(symbolPage).toContain("holdingPriceHoldingsLabel");
    expect(holdingsRow).not.toContain("holdingPriceTrustBadgeLabel");
    expect(portfolio).not.toContain("holdingPriceTrustBadgeLabel");
    expect(holdingPage).not.toContain("holdingPriceTrustBadgeLabel");
    expect(symbolPage).not.toContain("holdingPriceTrustBadgeLabel");
  });

  it("I. does not add a new API or provider path", () => {
    const action = read("lib/client/livePortfolioPriceRefreshAction.ts");
    const display = read("lib/client/holdingDisplayPrice.ts");
    const holdingsRow = read("components/dashboard/HoldingsTodayRow.tsx");
    const portfolio = read("components/portfolio/glance/PortfolioHoldingsList.tsx");
    expect(action).toContain("refreshLivePortfolioPrices");
    expect(action).not.toMatch(/fetch\("\/api\/prices"/);
    expect(display).toContain("getMarketStatuses");
    expect(display).not.toMatch(/eodhd|openai/i);
    expect(holdingsRow).toContain("formatHoldingQuoteTrustLine");
    expect(portfolio).toContain("holdingPriceHoldingsLabel");
    expect(holdingsRow).not.toMatch(/priceDataStatus === ["']delayed["']/);
  });

  it("cache-first empty quotes with last-known-good is idle, not a sticky error", async () => {
    const holdings = [
      equity({ symbol: "VWCE", providerSymbol: "VWCE.XETRA", currentPrice: 110 }),
    ];
    writePortfolioToStorage(USER, holdings);
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        prices: [],
        requested: 1,
        received: 0,
      }),
    } as Response);

    const outcome = await runLivePortfolioPriceRefreshAction({
      userSub: USER,
      holdings,
      saveHoldings: vi.fn(),
      baseCurrency: "EUR",
      fxStatus: "identity",
      refreshFx: vi.fn(),
      cacheFirst: true,
    });
    expect(outcome.updated).toBe(false);
    expect(outcome.status).toBe("idle");
    expect(outcome.holdings[0]?.currentPrice).toBe(110);
    expect(outcome.message).not.toMatch(/could not be refreshed/i);
  });
});
