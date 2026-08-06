import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  MARKETS_TODAY_IMPACT_STYLES,
  MARKETS_TODAY_SENTIMENT_STYLES,
} from "@/components/news/marketsTodayVisuals";
import {
  buildMarketsTodayPulse,
  buildMarketsTodayRegions,
  MARKETS_TODAY_EMPTY_STATE_COPY,
  MARKETS_TODAY_PULSE_TITLE,
} from "@/lib/services/news/newsMarketsToday";
import type { NewsContentItem } from "@/lib/types/newsContent";

function item(
  overrides: Partial<NewsContentItem> & Pick<NewsContentItem, "id" | "title">,
): NewsContentItem {
  return {
    sourceName: "Reuters",
    sourceType: "news",
    canonicalUrl: `https://example.com/${overrides.id}`,
    thumbnailUrl: null,
    publishedAt: "2026-07-20T08:00:00.000Z",
    description: "Coverage",
    summary: "Coverage summary for markets.",
    interpretation: "Why this could matter for risk assets.",
    impactLevel: "Medium Impact",
    matchedHoldingIds: [],
    matchedSymbols: [],
    matchedHoldings: [],
    relevanceLabel: null,
    category: "markets",
    marketCategory: "macro",
    contentTypeLabel: "News",
    fetchedAt: "2026-07-20T08:00:00.000Z",
    relevanceScore: 0,
    ...overrides,
  };
}

function read(relativePath: string) {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("Markets Today 2.0", () => {
  it("renders regions in flagship order with distinguishable titles", () => {
    const regions = buildMarketsTodayRegions({ items: [] });
    expect(regions.map((region) => `${region.emoji} ${region.label}`)).toEqual([
      "🌍 Global",
      "🇪🇺 Europe",
      "🇺🇸 United States",
      "🌏 Asia",
      "₿ Crypto",
    ]);
  });

  it("keeps empty states professional instead of broken-looking", () => {
    const regions = buildMarketsTodayRegions({ items: [] });
    expect(MARKETS_TODAY_EMPTY_STATE_COPY).toBe(
      "No major market-moving developments.",
    );
    expect(regions.every((region) => region.stories.length === 0)).toBe(true);
    expect(read("components/news/NewsMarketsTodaySection.tsx")).toContain(
      "MARKETS_TODAY_EMPTY_STATE_COPY",
    );
  });

  it("renders sentiment and summary fields for populated regions", () => {
    const regions = buildMarketsTodayRegions({
      items: [
        item({
          id: "btc-a",
          title: "Bitcoin ETF inflows accelerate",
          impactLevel: "High Impact",
          marketCategory: "crypto",
          category: "crypto",
          summary: "Spot bitcoin ETFs attract fresh capital.",
        }),
        item({
          id: "btc-b",
          title: "Crypto risk appetite improves after ETF news",
          impactLevel: "High Impact",
          marketCategory: "crypto",
          category: "crypto",
          summary: "Digital assets rebound with stronger flows.",
          description: "Bitcoin climbs as ETF demand rises sharply.",
        }),
      ],
    });

    const crypto = regions.find((region) => region.id === "crypto");
    expect(crypto?.summary).toBeTruthy();
    expect(crypto?.highestImpactStory?.impactLevel).toBe("High Impact");
    expect(
      MARKETS_TODAY_SENTIMENT_STYLES[crypto?.sentiment ?? "unavailable"].label,
    ).toBeTruthy();
  });

  it("surfaces the global pulse card above regional sections", () => {
    const section = read("components/news/NewsMarketsTodaySection.tsx");
    expect(section.indexOf("MarketsTodayPulseCard")).toBeLessThan(
      section.indexOf("regions.map"),
    );
    expect(section).toContain("MARKETS_TODAY_PULSE_TITLE");
    expect(MARKETS_TODAY_PULSE_TITLE).toBe("Today's Global Market Pulse");
    expect(buildMarketsTodayPulse(buildMarketsTodayRegions({ items: [] })).summary)
      .toContain("No major market-moving");
  });

  it("keeps loading skeletons sized to final Markets Today cards", () => {
    const skeleton = read("components/news/NewsMarketsTodaySkeleton.tsx");
    const hub = read("components/news/NewsHubContent.tsx");
    expect(skeleton).toContain("NewsMarketsTodaySkeleton");
    expect(skeleton).toContain("min-h-[132px]");
    expect(skeleton).toContain("min-h-[196px]");
    expect(skeleton).toContain("xl:grid-cols-6");
    expect(hub).toContain("NewsMarketsTodaySkeleton");
    expect(hub.indexOf("NewsMarketsTodaySkeleton")).toBeLessThan(
      hub.indexOf("<NewsMarketsTodaySection"),
    );
  });

  it("visually prioritises high-impact stories", () => {
    expect(MARKETS_TODAY_IMPACT_STYLES["High Impact"].badgeClass).toContain(
      "rose",
    );
    expect(MARKETS_TODAY_IMPACT_STYLES["Medium Impact"].badgeClass).toContain(
      "amber",
    );
    expect(MARKETS_TODAY_IMPACT_STYLES["Low Impact"].badgeClass).toContain(
      "slate",
    );
    expect(read("components/news/NewsMarketsTodaySection.tsx")).toContain(
      "Highest impact",
    );
  });
});
