import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

import { selectDashboardMarketPulseItems } from "@/lib/client/selectDashboardMarketPulseItems";
import type {
  MarketPulseAsset,
  MarketPulseSnapshot,
} from "@/lib/services/marketPulse/types";

function read(relativePath: string): string {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

function asset(
  overrides: Partial<MarketPulseAsset> &
    Pick<MarketPulseAsset, "id" | "name" | "symbol">,
): MarketPulseAsset {
  return {
    category: "crypto",
    sourceType: "test",
    providerSymbol: `${overrides.symbol}.TEST`,
    price: 100,
    previousClose: 99,
    changeAmount: 1,
    unit: null,
    currency: "USD",
    quoteChangePercent: 1.2,
    quoteChangePeriod: "24h",
    quoteUpdatedAt: "2026-08-02T08:00:00.000Z",
    priceSource: "realtime",
    quoteRefreshMode: "realtime",
    chartPeriodChangePercent: null,
    chartPeriod: null,
    momentumChangePercent: null,
    changePercent: 1.2,
    changePeriod: "24h",
    change7dPercent: null,
    history: [],
    periodHigh: null,
    periodLow: null,
    dataFrequency: "Realtime",
    delayed: false,
    marketStatus: "Live",
    updatedAt: "2026-08-02T08:00:00.000Z",
    provider: "test",
    availability: "available",
    portfolioLinks: [],
    isProxy: false,
    tradingPair: null,
    displayCurrency: "USD",
    displayPrice: 100,
    conversionApplied: false,
    accent: "bitcoin",
    portfolioWeightPercent: null,
    relevanceWhy: null,
    ...overrides,
  };
}

function snapshot(partial: Partial<MarketPulseSnapshot>): MarketPulseSnapshot {
  return {
    generatedAt: "2026-08-02T08:00:00.000Z",
    leadInsight: "Linked markets are mixed.",
    heroDriver: {
      kind: "unavailable",
      marketId: null,
      name: null,
      changePercent: null,
      changePeriod: null,
      portfolioWeightPercent: null,
      summary: "Unavailable",
      usesTodayWording: false,
    },
    filter: "portfolio",
    momentumPeriod: "1M",
    featuredMarketId: null,
    linkedMarkets: [],
    commodities: [],
    crypto: [],
    momentum: [],
    momentumStrongest: null,
    momentumWeakest: null,
    sessionStatus: [],
    insights: [],
    excludedMomentumIds: [],
    dataNotes: [],
    cryptoRankingMode: "configured_majors",
    ...partial,
  };
}

describe("Dashboard UX polish phase", () => {
  const dashboard = read("app/dashboard/page.tsx");
  const holdings = read("components/dashboard/HoldingsToday.tsx");
  const heroVisual = read("components/dashboard/DashboardHeroIntelligence.tsx");
  const hero = read("components/dashboard/PortfolioValueCard.tsx");
  const cash = read("components/dashboard/DashboardCashIntelligenceCard.tsx");
  const health = read("components/dashboard/DashboardPortfolioHealthCard.tsx");
  const pulse = read("components/dashboard/DashboardMarketPulseCard.tsx");
  const insight = read("components/dashboard/DashboardInsightCard.tsx");

  it("places Cash Intelligence after Market Pulse without duplicating Health", () => {
    expect(dashboard).not.toContain("DashboardTopStoryCard");
    expect(dashboard).toContain("DashboardCashIntelligenceCard");
    expect(dashboard).toContain("pulse={portfolioPulse}");
    expect(dashboard).not.toContain("DashboardPortfolioScorecard");
    expect(dashboard).not.toContain("DashboardPortfolioHealthCard");
    const pulseIdx = dashboard.indexOf("pulse={portfolioPulse}");
    const marketPulseIdx = dashboard.indexOf("<DashboardMarketPulseCard");
    const cashIdx = dashboard.indexOf(
      "<DashboardCashIntelligenceCard holdings={holdings} />",
    );
    expect(pulseIdx).toBeGreaterThan(-1);
    expect(marketPulseIdx).toBeGreaterThan(pulseIdx);
    expect(cashIdx).toBeGreaterThan(marketPulseIdx);
  });

  it("keeps holdings compact by default with accessible expand controls", () => {
    expect(holdings).toContain("useCollapsedListLimit");
    expect(holdings).toContain("aria-expanded={expanded}");
    expect(holdings).toContain("aria-controls={listId}");
    expect(holdings).toContain("Show less");
    expect(holdings).toContain("Show ${hiddenCount} more");
    expect(holdings).toContain("showToggle");
    expect(holdings).toContain("View all holdings");
    expect(holdings).toContain("slice(0, visibleLimit)");
  });

  it("does not invent sparkline history for the hero trend mark", () => {
    expect(heroVisual).toContain("no invented sparkline points");
    expect(heroVisual).not.toMatch(/Math\.random|fakeHistory|interpolate/i);
    expect(heroVisual).toContain('role="img"');
    expect(hero).toContain("HeroPerformanceSparkline");
    expect(hero).toContain("overflow-hidden");
  });

  it("renders Market Pulse with real strip items and non-color direction cues", () => {
    expect(pulse).toContain("selectDashboardMarketPulseItems");
    expect(pulse).toContain("useDashboardMarketPulsePreview");
    expect(pulse).toContain("TrendingUp");
    expect(pulse).toContain("TrendingDown");
    expect(pulse).toContain("quoteChangePercent");
    expect(pulse).toContain("Open Market Pulse");
    expect(pulse).not.toMatch(/setInterval|poll/i);
  });

  it("presents Portfolio Scorecard with a real structural score, not volatility intensity", () => {
    expect(health).toContain("ScoreRing");
    expect(health).toContain("scoreResult.score");
    expect(health).toContain("scoreResult.band.label");
    expect(health).toContain("scoreResult.confidence.label");
    expect(health).not.toContain("expected volatility intensity");
    expect(health).not.toContain("VolatilityRing");
    expect(health).not.toContain("buildHeroHealthPreview");
    expect(health).toContain("DASHBOARD_DEEP_LINKS.portfolioHealth");
  });

  it("keeps Portfolio Insight card implementation available without rendering it on Dashboard", () => {
    expect(insight).toContain("Today’s portfolio insight");
    expect(insight).toContain("insight.headline");
    expect(insight).toContain("insight.scoreLines");
    expect(insight).toContain("DASHBOARD_DEEP_LINKS.portfolioHealth");
    expect(insight).toContain("DASHBOARD_DEEP_LINKS.goalScore");
    expect(dashboard).not.toContain("usePortfolioInsight");
    expect(dashboard).not.toContain("DashboardInsightCard");
    expect(dashboard).toContain("buildPortfolioPulse");
    expect(dashboard).toContain("pulse={portfolioPulse}");
  });

  it("keeps Cash Intelligence metrics and Analysis deep link", () => {
    expect(cash).toContain("portfolioCashWeightPercent");
    expect(cash).toContain("totalCashInBase");
    expect(cash).toContain("totalIndicativeAnnualYieldInEur");
    expect(cash).toContain("DASHBOARD_DEEP_LINKS.cashIntelligence");
    expect(cash).toContain("Cash held");
    expect(cash).toContain("Allocation");
  });

  it("orders hero, holdings, market briefing, pulse, then cash", () => {
    const summaryIdx = dashboard.indexOf("<DashboardSummary");
    const pulseIdx = dashboard.indexOf("pulse={portfolioPulse}");
    const holdingsIdx = dashboard.indexOf("<HoldingsToday");
    const briefingIdx = dashboard.indexOf("<DashboardTodaysMarketBriefing");
    const marketPulseIdx = dashboard.indexOf(
      "<DashboardMarketPulseCard",
      holdingsIdx,
    );
    const cashIdx = dashboard.indexOf("<DashboardCashIntelligenceCard");
    expect(summaryIdx).toBeLessThan(pulseIdx);
    expect(pulseIdx).toBeLessThan(holdingsIdx);
    expect(holdingsIdx).toBeLessThan(briefingIdx);
    expect(briefingIdx).toBeLessThan(marketPulseIdx);
    expect(marketPulseIdx).toBeLessThan(cashIdx);
  });
});

describe("selectDashboardMarketPulseItems", () => {
  it("prefers linked markets then broad fallbacks without fabricating prices", () => {
    const items = selectDashboardMarketPulseItems(
      snapshot({
        linkedMarkets: [
          asset({
            id: "bitcoin",
            name: "Bitcoin",
            symbol: "BTC",
            portfolioWeightPercent: 40,
            quoteChangePercent: 2.4,
          }),
        ],
        commodities: [
          asset({
            id: "gold",
            name: "Gold",
            symbol: "XAUUSD",
            category: "commodity",
            quoteChangePercent: -0.4,
            displayPrice: 2400,
          }),
        ],
        crypto: [
          asset({
            id: "ethereum",
            name: "Ethereum",
            symbol: "ETH",
            quoteChangePercent: 1.1,
          }),
        ],
      }),
      3,
    );

    expect(items).toHaveLength(3);
    expect(items[0]?.id).toBe("bitcoin");
    expect(items.map((item) => item.id)).toEqual(
      expect.arrayContaining(["bitcoin", "gold", "ethereum"]),
    );
    expect(
      items.every((item) => item.displayPrice != null || item.price != null),
    ).toBe(true);
  });

  it("skips unavailable assets", () => {
    const items = selectDashboardMarketPulseItems(
      snapshot({
        crypto: [
          asset({
            id: "bitcoin",
            name: "Bitcoin",
            symbol: "BTC",
            availability: "unavailable",
            displayPrice: null,
            price: null,
          }),
          asset({
            id: "ethereum",
            name: "Ethereum",
            symbol: "ETH",
            quoteChangePercent: 0.5,
          }),
        ],
      }),
      3,
    );

    expect(items.map((item) => item.id)).toEqual(["ethereum"]);
  });
});
