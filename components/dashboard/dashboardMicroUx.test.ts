/**
 * Dashboard hero trend period selector + WATCH exact-story navigation.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { HERO_INTRADAY_HISTORY_AVAILABLE } from "@/components/dashboard/heroTrendPeriods";
import { DASHBOARD_DEEP_LINKS } from "@/lib/navigation/deepLinks";
import { summarizeDailyPerformance } from "@/lib/client/dailyPerformance";
import { buildValuedPositions } from "@/lib/client/portfolioAnalysis";
import { buildPersonalActionPlan } from "@/lib/services/personalIntelligence/buildPersonalActionPlan";
import { buildPersonalIntelligenceToday } from "@/lib/services/personalIntelligence";
import type { InvestmentIntelligence } from "@/lib/services/news/investmentIntelligence";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function read(relativePath: string) {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

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
    changePercent: overrides.changePercent,
    previousClose: overrides.previousClose,
    change24hPercent: overrides.change24hPercent,
  };
}

function quietIntelligence(
  overrides: Partial<InvestmentIntelligence> = {},
): InvestmentIntelligence {
  return {
    portfolioStatus: "Stable",
    portfolioSummary: "No material developments were detected.",
    todayMatters: [],
    holdingInsights: { positive: [], neutral: [], negative: [] },
    macroHighlights: [],
    mustWatch: null,
    keyRisks: [],
    opportunities: [],
    quietMarket: true,
    generatedAt: "2026-08-16T10:00:00.000Z",
    ...overrides,
  };
}

describe("Dashboard micro-UX — WATCH exact story", () => {
  it("routes WATCH to the verified canonicalUrl when navigable", () => {
    const holdings = [
      holding({
        symbol: "BTC",
        assetType: "crypto",
        quantity: 1,
        currentPrice: 50_000,
        change24hPercent: 1,
      }),
    ];
    const daily = summarizeDailyPerformance(holdings);
    const { valuedPositions } = buildValuedPositions(holdings);
    const pi = buildPersonalIntelligenceToday({
      daily,
      holdingsWeights: valuedPositions.map((position) => ({
        symbol: position.holding.symbol,
        name: position.holding.name,
        weightPercent: position.weightPercent,
      })),
      intelligence: quietIntelligence({
        quietMarket: false,
        portfolioStatus: "Elevated",
        mustWatch: {
          type: "article",
          itemId: "story-42",
          title: "Schiff: Saylor Will Have to Sell 'A Lot More' Bitcoin (BTC)",
          sourceName: "Decrypt",
          canonicalUrl: "https://decrypt.co/example-story",
          reason: "Mentions BTC.",
        },
        holdingInsights: {
          positive: [],
          neutral: [],
          negative: ["BTC"],
        },
      }),
      now: new Date("2026-08-16T12:00:00.000Z"),
    });

    const watch = buildPersonalActionPlan(pi).items.find(
      (item) => item.category === "watch",
    );
    expect(watch?.href).toBe("https://decrypt.co/example-story");
    expect(watch?.hrefExternal).toBe(true);
    expect(watch?.storyId).toBe("story-42");
    expect(watch?.headline).toMatch(/Schiff|Saylor|Bitcoin/i);
  });

  it("falls back to portfolio-news without inventing a URL", () => {
    const holdings = [
      holding({
        symbol: "BTC",
        assetType: "crypto",
        quantity: 1,
        currentPrice: 50_000,
        change24hPercent: 0.2,
      }),
    ];
    const daily = summarizeDailyPerformance(holdings);
    const pi = buildPersonalIntelligenceToday({
      daily,
      holdingsWeights: [{ symbol: "BTC", name: "Bitcoin", weightPercent: 100 }],
      intelligence: quietIntelligence({
        quietMarket: false,
        mustWatch: {
          type: "article",
          itemId: "n-missing",
          title: "Portfolio development without a usable link",
          sourceName: "Example",
          canonicalUrl: "",
          reason: "Mentions BTC.",
        },
        holdingInsights: {
          positive: [],
          neutral: [],
          negative: ["BTC"],
        },
      }),
      now: new Date("2026-08-16T12:00:00.000Z"),
    });

    const watch = buildPersonalActionPlan(pi).items.find(
      (item) => item.category === "watch",
    );
    expect(watch?.href).toBe(DASHBOARD_DEEP_LINKS.portfolioNews);
    expect(watch?.hrefExternal).toBe(false);
  });

  it("keeps buy/sell/hold news titles from crashing Action Plan", () => {
    const holdings = [
      holding({
        symbol: "BTC",
        assetType: "crypto",
        quantity: 1,
        currentPrice: 50_000,
        change24hPercent: 0.2,
      }),
    ];
    const daily = summarizeDailyPerformance(holdings);
    const pi = buildPersonalIntelligenceToday({
      daily,
      holdingsWeights: [{ symbol: "BTC", name: "Bitcoin", weightPercent: 100 }],
      intelligence: quietIntelligence({
        quietMarket: false,
        mustWatch: {
          type: "article",
          itemId: "n-sell",
          title: "Schiff: Saylor Will Have to Sell 'A Lot More' Bitcoin (BTC)",
          sourceName: "Decrypt",
          canonicalUrl: "https://decrypt.co/sell-story",
          reason: "Mentions BTC.",
        },
        holdingInsights: {
          positive: [],
          neutral: [],
          negative: ["BTC"],
        },
      }),
      now: new Date("2026-08-16T12:00:00.000Z"),
    });

    expect(() => buildPersonalActionPlan(pi)).not.toThrow();
  });

  it("opens external WATCH destinations from the Action Plan row", () => {
    const source = read("components/dashboard/PortfolioThirtySeconds.tsx");
    expect(source).toContain("hrefExternal");
    expect(source).toContain('target="_blank"');
    expect(source).toContain('rel="noopener noreferrer"');
    expect(source).toContain("action-plan-external-link");
  });
});

describe("Dashboard micro-UX — hero 1D/1W/1M", () => {
  it("does not claim genuine intraday history is available", () => {
    expect(HERO_INTRADAY_HISTORY_AVAILABLE).toBe(false);
  });

  it("wires week and month series into the hero sparkline selector", () => {
    const sparkline = read("components/dashboard/HeroPerformanceSparkline.tsx");
    const hero = read("components/dashboard/PortfolioValueCard.tsx");
    const page = read("app/dashboard/page.tsx");

    expect(sparkline).toContain("hero-trend-period-selector");
    expect(sparkline).toContain('data-testid={`hero-trend-period-${option}`}');
    expect(sparkline).toContain("Verified intraday portfolio history is not available yet");
    expect(sparkline).toContain("over ${period}");
    expect(sparkline).toContain('"1W trend"');
    expect(sparkline).toContain('"1M trend"');
    expect(sparkline).toContain('useState<"1W" | "1M">("1M")');
    expect(hero).toContain("weekPoints=");
    expect(hero).toContain("monthPoints=");
    expect(page).toContain("weekPerformancePoints=");
    expect(page).toContain("monthPerformancePoints=");
    expect(page).not.toMatch(
      /performancePoints=\{\s*monthHistory\.data\?\.chartPoints\s*\?\?/,
    );
  });

  it("keeps compact mobile touch targets without horizontal scroll", () => {
    const sparkline = read("components/dashboard/HeroPerformanceSparkline.tsx");
    expect(sparkline).toContain("min-h-8");
    expect(sparkline).toContain("min-w-8");
    expect(sparkline).not.toContain("overflow-x-auto");
  });
});
