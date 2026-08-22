import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  allocateDisplayPercents,
  buildPortfolioExposureAllocation,
  classifyHoldingExposure,
  EXPOSURE_GROUP_IDS,
  resolveGroupFromVerifiedExposureText,
} from "@/lib/services/classification";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function holding(
  overrides: Partial<StoredPortfolioHolding> &
    Pick<StoredPortfolioHolding, "symbol">,
): StoredPortfolioHolding {
  return {
    id: overrides.id ?? `${overrides.symbol}-id`,
    symbol: overrides.symbol,
    name: overrides.name ?? overrides.symbol,
    quantity: overrides.quantity ?? 10,
    purchasePrice: overrides.purchasePrice ?? 90,
    currentPrice: overrides.currentPrice ?? 100,
    currency: "EUR",
    assetType: overrides.assetType ?? "investment",
    providerSymbol: overrides.providerSymbol,
    changePercent: overrides.changePercent,
    previousClose: overrides.previousClose,
    change24hPercent: overrides.change24hPercent,
    marketPriceUpdatedAt: overrides.marketPriceUpdatedAt,
  };
}

describe("classifyHoldingExposure", () => {
  it("classifies cash via assetType", () => {
    const result = classifyHoldingExposure(
      holding({
        symbol: "EUR",
        assetType: "cash",
        currentPrice: 1,
        quantity: 500,
      }),
    );
    expect(result.normalizedGroupId).toBe("cash");
    expect(result.classificationSource).toBe("asset_type");
    expect(result.confidence).toBe("high");
  });

  it("classifies native crypto via assetType", () => {
    const result = classifyHoldingExposure(
      holding({
        symbol: "BTC",
        assetType: "crypto",
        providerSymbol: "BTC-EUR.CC",
      }),
    );
    expect(result.normalizedGroupId).toBe("crypto");
    expect(result.classificationSource).toBe("asset_type");
  });

  it("classifies verified crypto-linked ETP via research profile", () => {
    const result = classifyHoldingExposure(
      holding({
        symbol: "IB1T",
        providerSymbol: "IB1T.XETRA",
        name: "iShares Bitcoin ETP",
      }),
    );
    expect(result.normalizedGroupId).toBe("crypto");
    expect(result.classificationSource).toBe("research_profile");
    expect(result.displayLabel).toBe("Crypto");
  });

  it("maps broad equity profile to Diversified equity", () => {
    const result = classifyHoldingExposure(
      holding({ symbol: "VWCE", providerSymbol: "VWCE.XETRA" }),
    );
    expect(result.normalizedGroupId).toBe("diversified_equity");
  });

  it("maps verified technology profile to Technology & communication", () => {
    const result = classifyHoldingExposure(
      holding({ symbol: "AIFS", providerSymbol: "AIFS.XETRA" }),
    );
    expect(result.normalizedGroupId).toBe("technology_communication");
    expect(result.displayLabel).toBe("Technology & communication");
  });

  it("maps uranium and copper profiles to Industrials & resources", () => {
    expect(
      classifyHoldingExposure(
        holding({ symbol: "NUKL", providerSymbol: "NUKL.XETRA" }),
      ).normalizedGroupId,
    ).toBe("industrials_resources");
    expect(
      classifyHoldingExposure(
        holding({ symbol: "4COP", providerSymbol: "4COP.XETRA" }),
      ).normalizedGroupId,
    ).toBe("industrials_resources");
  });

  it("maps healthcare and consumer verified exposure text to their own groups", () => {
    expect(resolveGroupFromVerifiedExposureText("Healthcare")).toBe(
      "healthcare",
    );
    expect(
      resolveGroupFromVerifiedExposureText("Consumer Defensive · Staples"),
    ).toBe("consumer");
    expect(resolveGroupFromVerifiedExposureText("Financial Services")).toBe(
      "financials_real_estate",
    );
    expect(resolveGroupFromVerifiedExposureText("Real Estate")).toBe(
      "financials_real_estate",
    );
    expect(resolveGroupFromVerifiedExposureText("Communication Services")).toBe(
      "technology_communication",
    );
  });

  it("does not treat income as a sector group; STRC stays Other / Unclassified", () => {
    const result = classifyHoldingExposure(
      holding({ symbol: "STRC", providerSymbol: "STRC.AS" }),
    );
    expect(result.normalizedGroupId).toBe("other_unclassified");
    expect(result.reason).toMatch(/ambiguous/i);
    expect(EXPOSURE_GROUP_IDS).not.toContain("income_strategies");
  });

  it("classifies unknown holdings as Other without ticker-only guesses", () => {
    const result = classifyHoldingExposure(
      holding({
        symbol: "TECH",
        name: "Technology Growth Fund Bitcoin Uranium",
        providerSymbol: "TECH.US",
      }),
    );
    expect(result.normalizedGroupId).toBe("other_unclassified");
    expect(result.classificationSource).toBe("unclassified");
  });
});

describe("buildPortfolioExposureAllocation", () => {
  it("allocates whole-instrument values and totals 100% for mixed portfolios", () => {
    const allocation = buildPortfolioExposureAllocation([
      holding({
        symbol: "VWCE",
        providerSymbol: "VWCE.XETRA",
        quantity: 10,
        currentPrice: 100,
      }),
      holding({
        symbol: "BTC",
        assetType: "crypto",
        quantity: 1,
        currentPrice: 200,
      }),
      holding({
        symbol: "EUR",
        assetType: "cash",
        quantity: 100,
        currentPrice: 1,
      }),
    ]);

    expect(allocation.hasAnyValue).toBe(true);
    expect(allocation.totalValue).toBe(1300);
    const percentSum = allocation.groups.reduce(
      (sum, group) => sum + group.displayPercent,
      0,
    );
    expect(percentSum).toBe(100);
    expect(allocation.groups.map((group) => group.groupId)).toEqual([
      "diversified_equity",
      "crypto",
      "cash",
    ]);
    expect(allocation.groups[0]?.holdings.map((row) => row.symbol)).toEqual([
      "VWCE",
    ]);
    expect(allocation.groups[1]?.holdings[0]?.symbol).toBe("BTC");
    expect(allocation.groups[2]?.holdings[0]?.assetType).toBe("cash");
  });

  it("keeps Other / Unclassified in the denominator", () => {
    const allocation = buildPortfolioExposureAllocation([
      holding({
        symbol: "VWCE",
        providerSymbol: "VWCE.XETRA",
        quantity: 1,
        currentPrice: 70,
      }),
      holding({
        symbol: "STRC",
        providerSymbol: "STRC.AS",
        quantity: 1,
        currentPrice: 30,
      }),
    ]);

    const other = allocation.groups.find(
      (group) => group.groupId === "other_unclassified",
    );
    expect(other).toBeTruthy();
    expect(other?.displayPercent).toBe(30);
    expect(
      allocation.groups.reduce((sum, group) => sum + group.displayPercent, 0),
    ).toBe(100);
  });

  it("excludes invalid values and counts them", () => {
    const allocation = buildPortfolioExposureAllocation([
      holding({
        symbol: "VWCE",
        providerSymbol: "VWCE.XETRA",
        quantity: 1,
        currentPrice: 100,
      }),
      holding({
        symbol: "BAD",
        providerSymbol: "BAD.US",
        quantity: 1,
        currentPrice: 0,
        purchasePrice: 0,
      }),
    ]);

    expect(allocation.excludedHoldingCount).toBe(1);
    expect(allocation.includedHoldingCount).toBe(1);
    expect(allocation.coverageLabel).toMatch(/excluded/i);
    expect(allocation.groups[0]?.holdings).toHaveLength(1);
    expect(allocation.groups[0]?.holdings[0]?.symbol).toBe("VWCE");
  });

  it("lists multiple contributing holdings under the same category", () => {
    const allocation = buildPortfolioExposureAllocation([
      holding({
        id: "a",
        symbol: "AAA",
        name: "Alpha",
        providerSymbol: "AAA.US",
        quantity: 1,
        currentPrice: 60,
      }),
      holding({
        id: "b",
        symbol: "BBB",
        name: "Beta",
        providerSymbol: "BBB.US",
        quantity: 1,
        currentPrice: 40,
      }),
    ]);

    const other = allocation.groups.find(
      (group) => group.groupId === "other_unclassified",
    );
    expect(other?.holdingCount).toBe(2);
    expect(other?.holdings.map((row) => row.symbol)).toEqual(["AAA", "BBB"]);
    expect(other?.holdings[0]?.value).toBe(60);
  });

  it("handles empty, crypto-only and cash-only portfolios", () => {
    expect(buildPortfolioExposureAllocation([]).hasAnyValue).toBe(false);

    const cryptoOnly = buildPortfolioExposureAllocation([
      holding({
        symbol: "ETH",
        assetType: "crypto",
        quantity: 2,
        currentPrice: 50,
      }),
    ]);
    expect(cryptoOnly.groups).toHaveLength(1);
    expect(cryptoOnly.groups[0]?.groupId).toBe("crypto");
    expect(cryptoOnly.groups[0]?.displayPercent).toBe(100);

    const cashOnly = buildPortfolioExposureAllocation([
      holding({
        symbol: "EUR",
        assetType: "cash",
        quantity: 250,
        currentPrice: 1,
      }),
    ]);
    expect(cashOnly.groups[0]?.groupId).toBe("cash");
    expect(cashOnly.groups[0]?.displayPercent).toBe(100);
  });

  it("uses largest-remainder rounding to total exactly 100", () => {
    expect(allocateDisplayPercents([1, 1, 1]).reduce((a, b) => a + b, 0)).toBe(
      100,
    );
    expect(
      allocateDisplayPercents([33.4, 33.3, 33.3]).reduce((a, b) => a + b, 0),
    ).toBe(100);
  });
});

describe("dashboard portfolio exposure integration", () => {
  const dashboardSource = readFileSync(
    path.resolve(process.cwd(), "app/dashboard/page.tsx"),
    "utf8",
  );
  const cardSource = readFileSync(
    path.resolve(
      process.cwd(),
      "components/dashboard/DashboardPortfolioExposureCard.tsx",
    ),
    "utf8",
  );
  const classifySource = readFileSync(
    path.resolve(
      process.cwd(),
      "lib/services/classification/classifyHoldingExposure.ts",
    ),
    "utf8",
  );

  it("places Market Pulse, Cash, and Explore tools after Holdings without a large Exposure card", () => {
    const holdingsIdx = dashboardSource.indexOf("<HoldingsToday");
    const pulseIdx = dashboardSource.indexOf(
      "<DashboardMarketPulseCard",
      holdingsIdx,
    );
    const cashIdx = dashboardSource.indexOf("<DashboardCashIntelligenceCard");
    const exploreIdx = dashboardSource.indexOf("<DashboardExploreTools");
    expect(holdingsIdx).toBeGreaterThan(-1);
    expect(pulseIdx).toBeGreaterThan(holdingsIdx);
    expect(cashIdx).toBeGreaterThan(pulseIdx);
    expect(exploreIdx).toBeGreaterThan(cashIdx);
    expect(dashboardSource).not.toContain("DashboardPortfolioExposureCard");
    expect(dashboardSource).not.toContain("DashboardContributionsCard");
  });

  it("uses deep-link CTA with portfolio-exposure hash and keeps Phase 1/2 sections", () => {
    expect(cardSource).toContain("DASHBOARD_DEEP_LINKS.portfolioExposure");
    expect(cardSource).toContain("portfolioExposure");
    expect(cardSource).toContain("View allocation");
    expect(cardSource).toContain("Portfolio exposure");
    expect(cardSource).toContain("EXPOSURE_GROUP_BAR_CLASS");
    expect(cardSource).not.toContain("overflow-x-auto");
    expect(cardSource).not.toContain("overflow-x-scroll");
    expect(dashboardSource).toContain("DashboardSummary");
    expect(dashboardSource).toContain("FourQuestionsSection");
    expect(dashboardSource).not.toContain("<DashboardTodaysMarketBriefing");
    expect(dashboardSource).not.toContain("DashboardInsightCard");
    expect(dashboardSource).toContain("DashboardMarketStatus");
    expect(dashboardSource).not.toContain("DashboardMoverCard");
    expect(dashboardSource).not.toContain("groupBySector");
  });

  it("does not introduce provider/API/AI calls in the classifier", () => {
    expect(classifySource).not.toContain("fetch(");
    expect(classifySource).not.toContain("eodhd");
    expect(classifySource).not.toContain("openai");
    expect(classifySource).not.toContain("executeEodhdApiCall");
    expect(dashboardSource).toContain("buildPortfolioExposureAllocation");
  });
});
