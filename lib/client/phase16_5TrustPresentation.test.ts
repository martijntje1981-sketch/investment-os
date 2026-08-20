import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

import { buildDashboardPortfolioSnapshot } from "@/lib/client/dashboardPortfolioSnapshot";
import {
  getHoldingMarketValue,
} from "@/lib/client/portfolioAnalysis";
import {
  holdingPriceTrustBadgeLabel,
  resolveHoldingDisplayPrice,
  resolveHoldingPriceTrustStatus,
} from "@/lib/client/holdingDisplayPrice";
import { calculateContributionSummary } from "@/lib/services/contributions/calculateContributionSummary";
import type { PortfolioContributionEntry } from "@/lib/services/contributions/types";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function holding(
  overrides: Partial<StoredPortfolioHolding> & Pick<StoredPortfolioHolding, "symbol">,
): StoredPortfolioHolding {
  return {
    id: `${overrides.symbol}-id`,
    name: overrides.name ?? overrides.symbol,
    quantity: overrides.quantity ?? 10,
    purchasePrice: overrides.purchasePrice ?? 90,
    currentPrice: overrides.currentPrice ?? 100,
    currency: overrides.currency ?? "EUR",
    assetType: overrides.assetType ?? "investment",
    previousClose: overrides.previousClose ?? 99,
    marketPriceUpdatedAt: overrides.marketPriceUpdatedAt ?? "2026-08-20T16:00:00.000Z",
    ...overrides,
    symbol: overrides.symbol,
  };
}

function contribution(
  overrides: Partial<PortfolioContributionEntry> = {},
): PortfolioContributionEntry {
  return {
    id: "c1",
    portfolioId: "portfolio-1",
    userId: "user-1",
    entryType: "contribution",
    amount: 400,
    currency: "EUR",
    baseAmount: 400,
    baseCurrency: "EUR",
    fxRateUsed: 1,
    entryDate: "2026-08-01",
    note: null,
    source: "manual",
    destinationType: "cash",
    destinationHoldingId: null,
    destinationHoldingSymbol: null,
    destinationQuantity: null,
    destinationPricePerUnit: null,
    destinationFee: null,
    createdAt: "2026-08-01T10:00:00.000Z",
    updatedAt: "2026-08-01T10:00:00.000Z",
    ...overrides,
  };
}

describe("Phase 16.5 price-status trust", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("A. last-session market prices are not labelled Estimated", () => {
    const vwce = holding({
      symbol: "VWCE",
      name: "Vanguard FTSE All-World",
      priceDataStatus: "stale",
      currentPrice: 120.12,
      quantity: 559,
    });

    expect(resolveHoldingDisplayPrice(vwce).source).toBe("last_session");
    expect(holdingPriceTrustBadgeLabel("last_session")).toBeNull();
    expect(
      buildDashboardPortfolioSnapshot([vwce], null, false).marketHoldings[0]
        ?.priceQuality,
    ).toBe("last_session");
  });

  it("B. delayed prices say Delayed and never Live or Current as a badge", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-19T15:00:00.000Z"));
    const aapl = holding({
      symbol: "AAPL",
      name: "Apple",
      currency: "USD",
      providerSymbol: "AAPL.US",
      priceDataStatus: "delayed",
      currentPrice: 185,
    });

    expect(resolveHoldingPriceTrustStatus(aapl)).toBe("delayed");
    expect(holdingPriceTrustBadgeLabel("delayed")).toBe("Delayed");
    expect(holdingPriceTrustBadgeLabel("delayed")).not.toMatch(/live/i);
    expect(
      buildDashboardPortfolioSnapshot([aapl], null, false).marketHoldings[0]
        ?.priceQuality,
    ).toBe("delayed");
  });

  it("C. genuine purchase-price fallback remains Estimated", () => {
    const bond = holding({
      symbol: "IEMA",
      name: "iShares Emerging Markets Bond",
      currentPrice: 0,
      purchasePrice: 16.4,
      priceDataStatus: "unavailable",
    });

    expect(resolveHoldingDisplayPrice(bond).source).toBe("estimated");
    expect(holdingPriceTrustBadgeLabel("estimated")).toBe("Estimated");
  });

  it("D. unavailable prices stay null, not €0", () => {
    const missing = holding({
      symbol: "SGLN",
      name: "iShares Physical Gold",
      currentPrice: 0,
      purchasePrice: 0,
      priceDataStatus: "unavailable",
    });

    expect(resolveHoldingDisplayPrice(missing).source).toBe("unavailable");
    expect(getHoldingMarketValue(missing)).toBeNull();
    expect(
      buildDashboardPortfolioSnapshot([missing], null, false).marketHoldings[0]
        ?.currentValue,
    ).toBeNull();
  });

  it("F. Dashboard snapshot quality matches the shared holding trust status", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-19T15:00:00.000Z"));
    const rows = [
      holding({ symbol: "VWCE", priceDataStatus: "stale", providerSymbol: "VWCE.XETRA" }),
      holding({
        symbol: "AAPL",
        priceDataStatus: "delayed",
        currency: "USD",
        providerSymbol: "AAPL.US",
      }),
      holding({ symbol: "SPY", priceDataStatus: "live", providerSymbol: "SPY.US" }),
    ];
    const snapshot = buildDashboardPortfolioSnapshot(rows, null, false);

    for (const row of snapshot.marketHoldings) {
      const source = rows.find((item) => item.symbol === row.symbol)!;
      expect(row.priceQuality).toBe(resolveHoldingPriceTrustStatus(source));
    }
  });

  it("representative categories: last-session ETF/ETC/bond do not become Estimated because of FX or venue close", () => {
    const sample = [
      holding({
        symbol: "VWCE",
        name: "European ETF",
        priceDataStatus: "stale",
        currency: "EUR",
      }),
      holding({
        symbol: "MSFT",
        name: "US security",
        priceDataStatus: "stale",
        currency: "USD",
        currentPrice: 410,
      }),
      holding({
        symbol: "AGGH",
        name: "Bond ETF",
        priceDataStatus: "stale",
      }),
      holding({
        symbol: "SGLD",
        name: "Gold ETC",
        priceDataStatus: "stale",
      }),
    ];

    for (const row of sample) {
      expect(resolveHoldingDisplayPrice(row).source).toBe("last_session");
      expect(holdingPriceTrustBadgeLabel("last_session")).toBeNull();
    }
  });
});

describe("Phase 16.5 incomplete contribution history", () => {
  it("G/H. recorded €400 stays visible and does not invent +31,000% performance", () => {
    const summary = calculateContributionSummary(
      [contribution()],
      125_000,
      "EUR",
    );

    expect(summary.netContributed).toBe(400);
    expect(summary.contributionBasisReliable).toBe(false);
    expect(summary.valueAboveContributions).toBeNull();
    expect(summary.valueAboveContributionsPercent).toBeNull();
  });
});

describe("Phase 16.5 Dashboard presentation contracts", () => {
  function read(relativePath: string) {
    return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
  }

  it("uses one Portfolio History card and never shows value-above-contributions on Dashboard", () => {
    const dashboard = read("app/dashboard/page.tsx");
    const history = read(
      "components/dashboard/DashboardPortfolioHistorySection.tsx",
    );
    const card = read("components/portfolioHistory/PortfolioHistoryNavCard.tsx");
    const holdingsRow = read("components/dashboard/HoldingsTodayRow.tsx");

    expect(dashboard).toContain("DashboardPortfolioHistorySection");
    expect(dashboard).not.toContain("DashboardContributionsCard");
    expect(history).toContain("CONTRIBUTIONS_RECORDED_LABEL");
    expect(history).toContain("CONTRIBUTIONS_INCOMPLETE_BASIS_COPY");
    expect(history).not.toContain("valueAboveContributions");
    expect(card).toContain("Recorded contributions");
    expect(card).toContain("How your portfolio developed");
    expect(holdingsRow).not.toContain("est.");
    expect(holdingsRow).toContain("holdingPriceTrustBadgeLabel");
  });

  it("keeps Q2 purple identity and the shared premium-blue Dashboard hero", () => {
    const visual = read("lib/services/fourQuestions/types.ts");
    const hero = read("components/dashboard/PortfolioValueCard.tsx");
    const surface = read("components/layout/appSurface.ts");

    expect(visual).toContain("what_matters_now");
    expect(visual).toContain("from-violet-100");
    expect(hero).toContain("appDashboardHeroShellClass");
    expect(surface).toContain("from-hero-premium-from");
    expect(surface).not.toContain("from-[#f4f9fd]");
  });
});
