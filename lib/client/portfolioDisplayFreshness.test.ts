/**
 * Canonical portfolio display freshness — truthful hero timestamps.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  formatPortfolioDisplayFreshnessLabel,
  readPortfolioDisplayFreshness,
  recordPortfolioDisplayFreshness,
  resetPortfolioDisplayFreshnessForTests,
  resolvePortfolioDisplayFreshness,
} from "@/lib/client/portfolioDisplayFreshness";
import { resetLivePriceRefreshStateForTests } from "@/lib/client/livePortfolioPriceRefresh";
import {
  resetLivePriceRefreshUiStateForTests,
  runLivePortfolioPriceRefreshAction,
} from "@/lib/client/livePortfolioPriceRefreshAction";
import { writePortfolioToStorage } from "@/lib/client/portfolioPricing";
import { lastLivePriceRefreshKey } from "@/lib/client/portfolioStorageKeys";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

const USER = "freshness-user";
const NOW = new Date("2026-08-21T11:01:00.000Z");

function read(relativePath: string): string {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

function vwce(price = 110): StoredPortfolioHolding {
  return {
    id: "vwce",
    symbol: "VWCE",
    name: "VWCE",
    quantity: 10,
    purchasePrice: 100,
    currentPrice: price,
    currency: "EUR",
    assetType: "investment",
    providerSymbol: "VWCE.XETRA",
    priceDataStatus: "delayed",
  };
}

describe("portfolio display freshness", () => {
  beforeEach(() => {
    localStorage.clear();
    resetLivePriceRefreshStateForTests();
    resetLivePriceRefreshUiStateForTests();
    resetPortfolioDisplayFreshnessForTests();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("A. successful usable reconciliation updates display freshness", async () => {
    writePortfolioToStorage(USER, [vwce(110)]);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          quoteSource: "cache",
          prices: [
            {
              symbol: "VWCE",
              providerSymbol: "VWCE.XETRA",
              priceEur: 122,
              currentPrice: 122,
              dataStatus: "delayed",
              updatedAt: "2026-08-20T18:51:00.000Z",
            },
          ],
          requested: 1,
          received: 1,
          refreshSummary: { providerCallsMade: 0 },
        }),
      }),
    );

    const outcome = await runLivePortfolioPriceRefreshAction({
      userSub: USER,
      holdings: [vwce(110)],
      saveHoldings: vi.fn(),
      baseCurrency: "EUR",
      fxStatus: "identity",
      refreshFx: vi.fn(),
      cacheFirst: true,
    });

    expect(outcome.updated).toBe(true);
    expect(outcome.displayFreshnessAt).toBeTruthy();
    expect(readPortfolioDisplayFreshness(USER)).toBe(outcome.displayFreshnessAt);
    expect(outcome.displayFreshnessAt).not.toBe("2026-08-20T18:51:00.000Z");
  });

  it("B. failed refresh preserves previous successful freshness", async () => {
    recordPortfolioDisplayFreshness(USER, "2026-08-20T18:51:00.000Z");
    writePortfolioToStorage(USER, [vwce(110)]);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network down")),
    );

    const outcome = await runLivePortfolioPriceRefreshAction({
      userSub: USER,
      holdings: [vwce(110)],
      saveHoldings: vi.fn(),
      baseCurrency: "EUR",
      fxStatus: "identity",
      refreshFx: vi.fn(),
      cacheFirst: true,
    });

    expect(outcome.updated).toBe(false);
    expect(outcome.displayFreshnessAt).toBe("2026-08-20T18:51:00.000Z");
    expect(readPortfolioDisplayFreshness(USER)).toBe(
      "2026-08-20T18:51:00.000Z",
    );
  });

  it("C. component render alone cannot update freshness", () => {
    const before = readPortfolioDisplayFreshness(USER);
    const rendered = resolvePortfolioDisplayFreshness({
      displayFreshnessAt: null,
      legacyLiveRefreshAt: null,
      now: NOW,
    });
    expect(before).toBeNull();
    expect(rendered.updatedAt).toBeNull();
    expect(rendered.label).toBeNull();
    expect(readPortfolioDisplayFreshness(USER)).toBeNull();
  });

  it("D. Dashboard and Portfolio use the same freshness helper", () => {
    const dashboard = read("components/dashboard/PortfolioValueCard.tsx");
    const portfolio = read("app/portfolio/page.tsx");
    const hook = read("lib/client/useLivePortfolioPriceRefresh.ts");
    const snapshotSync = read("lib/client/marketSnapshotSync.ts");
    expect(dashboard).toContain("resolvePortfolioDisplayFreshness");
    expect(portfolio).toContain("resolvePortfolioDisplayFreshness");
    expect(hook).toContain("displayFreshnessAt");
    expect(hook).toContain("readPortfolioDisplayFreshness");
    expect(snapshotSync).toContain("recordPortfolioDisplayFreshness");
    expect(portfolio).not.toContain("formatPortfolioHeroRefreshLabel");
    expect(dashboard).not.toContain("formatMarketUpdateTime(snapshot.lastUpdatedAt)");
    expect(dashboard).not.toContain("Last updated:");
    expect(portfolio).not.toContain("Last updated:");
  });

  it("formats yesterday and older Amsterdam dates without Last updated", () => {
    expect(
      formatPortfolioDisplayFreshnessLabel("2026-08-21T11:01:00.000Z", NOW),
    ).toBe("Updated today, 13:01");
    expect(
      formatPortfolioDisplayFreshnessLabel("2026-08-20T18:51:00.000Z", NOW),
    ).toBe("Updated yesterday, 20:51");
    expect(
      formatPortfolioDisplayFreshnessLabel("2026-08-19T18:51:00.000Z", NOW),
    ).toBe("Updated 19 Aug, 20:51");
  });

  it("legacy live-refresh timestamp may appear until the next successful reconciliation", () => {
    localStorage.setItem(
      lastLivePriceRefreshKey(USER),
      "2026-08-20T18:51:00.000Z",
    );
    const resolved = resolvePortfolioDisplayFreshness({
      displayFreshnessAt: null,
      legacyLiveRefreshAt: "2026-08-20T18:51:00.000Z",
      now: NOW,
    });
    expect(resolved.label).toBe("Updated yesterday, 20:51");
  });
});
