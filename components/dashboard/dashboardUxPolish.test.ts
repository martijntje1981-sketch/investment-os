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

  it("removes Top Story from the Dashboard and places Cash Intelligence beside Health", () => {
    expect(dashboard).not.toContain("DashboardTopStoryCard");
    expect(dashboard).toContain("DashboardCashIntelligenceCard");
    expect(dashboard).toContain("DashboardPortfolioHealthCard");
    const healthIdx = dashboard.indexOf("<DashboardPortfolioHealthCard");
    const cashBesideHealth = dashboard.indexOf(
      "<DashboardCashIntelligenceCard holdings={holdings} />",
      healthIdx,
    );
    const pulseAfterCash = dashboard.indexOf(
      "<DashboardMarketPulseCard\n            holdings={holdings}",
      cashBesideHealth,
    );
    expect(healthIdx).toBeGreaterThan(-1);
    expect(cashBesideHealth).toBeGreaterThan(healthIdx);
    expect(pulseAfterCash).toBeGreaterThan(cashBesideHealth);
    expect(dashboard).toMatch(
      /lg:grid-cols-2[\s\S]*DashboardPortfolioHealthCard[\s\S]*DashboardCashIntelligenceCard/,
    );
  });

  it("keeps holdings compact by default with accessible expand controls", () => {
    expect(holdings).toContain("useCollapsedListLimit");
    expect(holdings).toContain("aria-expanded={expanded}");
    expect(holdings).toContain("aria-controls={listId}");
    expect(holdings).toContain("Show less");
    expect(holdings).toContain("Show ${hiddenCount} more");
    expect(holdings).toContain("showToggle");
    expect(holdings).toContain("Open portfolio");
    expect(holdings).toContain("View all holdings");
    expect(holdings).toContain("slice(0, collapsedLimit)");
  });

  it("does not invent sparkline history for the hero trend mark", () => {
    expect(heroVisual).toContain("no invented sparkline points");
    expect(heroVisual).not.toMatch(/Math\.random|fakeHistory|interpolate/i);
    expect(heroVisual).toContain('role="img"');
    expect(hero).toContain("HeroTrendMicroVisual");
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

  it("presents Portfolio Health visually without an invented numeric score", () => {
    expect(health).toContain("VolatilityRing");
    expect(health).toContain("buildHeroHealthPreview");
    expect(health).toContain("expected volatility intensity");
    expect(health).not.toContain("/100");
    expect(health).not.toMatch(/\b\d{2,3}\s*\/\s*100\b/);
    expect(health).toContain("DASHBOARD_DEEP_LINKS.portfolioHealth");
  });

  it("elevates AI insight presentation while preserving section content and routes", () => {
    expect(insight).toContain("Today’s portfolio insight");
    expect(insight).toContain("sections.recommendation");
    expect(insight).toContain("sections.mainRisk");
    expect(insight).toContain("sections.mainOpportunity");
    expect(insight).toContain("DASHBOARD_DEEP_LINKS.portfolioHealth");
    expect(insight).toContain("DASHBOARD_DEEP_LINKS.portfolioExposure");
    expect(dashboard.indexOf("<DashboardInsightCard")).toBeLessThan(
      dashboard.indexOf("<DashboardPortfolioHealthCard"),
    );
    expect(dashboard.indexOf("<DashboardInsightCard")).toBeLessThan(
      dashboard.indexOf("<HoldingsToday"),
    );
  });

  it("keeps Cash Intelligence metrics and Analysis deep link", () => {
    expect(cash).toContain("portfolioCashWeightPercent");
    expect(cash).toContain("totalCashInBase");
    expect(cash).toContain("totalIndicativeAnnualYieldInEur");
    expect(cash).toContain("DASHBOARD_DEEP_LINKS.cashIntelligence");
    expect(cash).toContain("Cash held");
    expect(cash).toContain("Allocation");
  });

  it("orders status first, intelligence next, holdings later", () => {
    const summaryIdx = dashboard.indexOf("<DashboardSummary");
    const decisionIdx = dashboard.indexOf("<DashboardTodaysDecision");
    const insightIdx = dashboard.indexOf("<DashboardInsightCard");
    const healthIdx = dashboard.indexOf("<DashboardPortfolioHealthCard");
    const holdingsIdx = dashboard.indexOf("<HoldingsToday");
    expect(summaryIdx).toBeLessThan(decisionIdx);
    expect(decisionIdx).toBeLessThan(insightIdx);
    expect(insightIdx).toBeLessThan(healthIdx);
    expect(healthIdx).toBeLessThan(holdingsIdx);
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
