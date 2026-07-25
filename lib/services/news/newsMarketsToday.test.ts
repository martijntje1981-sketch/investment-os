import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  dedupeMarketsTodayItems,
  normalizeMarketsTodayTitle,
  normalizeMarketsTodayUrl,
} from "@/lib/services/news/marketsTodayDedup";
import {
  classifyMarketsTodayRegion,
  classifyMarketsTodayRegionId,
  MARKETS_TODAY_REGION_ORDER,
} from "@/lib/services/news/marketsTodayRegionalClassification";
import {
  aggregateMarketsTodaySentiment,
  buildMarketsTodayRegions,
  MARKETS_TODAY_EMPTY_STATE_COPY,
  MARKETS_TODAY_STORIES_LABEL,
} from "@/lib/services/news/newsMarketsToday";
import type { NewsContentItem } from "@/lib/types/newsContent";

function newsItem(
  overrides: Partial<NewsContentItem> & Pick<NewsContentItem, "id" | "title">,
): NewsContentItem {
  return {
    sourceName: "Wire Source",
    sourceType: "news",
    canonicalUrl: `https://example.com/news/${overrides.id}`,
    thumbnailUrl: null,
    publishedAt: "2026-07-18T10:00:00.000Z",
    description: null,
    summary: "",
    interpretation: "",
    impactLevel: "Medium Impact",
    matchedHoldingIds: [],
    matchedSymbols: [],
    matchedHoldings: [],
    relevanceLabel: null,
    category: "markets",
    marketCategory: "general",
    contentTypeLabel: "News",
    fetchedAt: "2026-07-19T08:00:00.000Z",
    relevanceScore: 1,
    ...overrides,
  };
}

describe("Markets Today regional foundation", () => {
  it("always renders all five regions in the required order", () => {
    const regions = buildMarketsTodayRegions({ items: [] });

    expect(regions).toHaveLength(5);
    expect(regions.map((region) => region.id)).toEqual([
      "global",
      "europe",
      "us",
      "asia",
      "crypto",
    ]);
    expect(regions.map((region) => region.label)).toEqual([
      "Global",
      "Europe",
      "US",
      "Asia",
      "Crypto",
    ]);
  });

  it("keeps empty regions visible with the honest empty-state copy", () => {
    const regions = buildMarketsTodayRegions({ items: [] });
    expect(regions.every((region) => region.stories.length === 0)).toBe(true);
    expect(MARKETS_TODAY_EMPTY_STATE_COPY).toBe(
      "No major verified developments available.",
    );
  });

  it("classifies representative global, europe, us, asia and crypto stories", () => {
    expect(
      classifyMarketsTodayRegionId(
        newsItem({
          id: "g1",
          title: "Worldwide growth outlook shifts as several regions slow",
        }),
      ),
    ).toBe("global");

    expect(
      classifyMarketsTodayRegionId(
        newsItem({ id: "e1", title: "ECB keeps rates unchanged in Frankfurt" }),
      ),
    ).toBe("europe");

    expect(
      classifyMarketsTodayRegionId(
        newsItem({ id: "u1", title: "Federal Reserve signals next policy move" }),
      ),
    ).toBe("us");

    expect(
      classifyMarketsTodayRegionId(
        newsItem({ id: "a1", title: "China manufacturing data beats expectations" }),
      ),
    ).toBe("asia");

    expect(
      classifyMarketsTodayRegionId(
        newsItem({ id: "a2", title: "Japan inflation cools ahead of BOJ meeting" }),
      ),
    ).toBe("asia");

    expect(
      classifyMarketsTodayRegionId(
        newsItem({ id: "c1", title: "Bitcoin holds firm after ETF inflows" }),
      ),
    ).toBe("crypto");
  });

  it("prioritises crypto for US crypto regulation when crypto is the primary subject", () => {
    expect(
      classifyMarketsTodayRegionId(
        newsItem({
          id: "c2",
          title: "United States crypto regulation framework advances in Congress",
          description: "Digital asset exchanges face new compliance rules.",
        }),
      ),
    ).toBe("crypto");
  });

  it("keeps ECB stories in Europe even when global markets are mentioned", () => {
    expect(
      classifyMarketsTodayRegionId(
        newsItem({
          id: "e2",
          title: "ECB holds rates steady as global markets watch closely",
        }),
      ),
    ).toBe("europe");
  });

  it("leaves ambiguous stories unassigned instead of using Global as fallback", () => {
    expect(
      classifyMarketsTodayRegionId(
        newsItem({
          id: "x1",
          title: "Company appoints new chief operating officer",
        }),
      ),
    ).toBeNull();
  });

  it("classifies case-insensitively and avoids short-token false positives", () => {
    expect(
      classifyMarketsTodayRegionId(
        newsItem({ id: "c3", title: "BITCOIN rebounds after overnight sell-off" }),
      ),
    ).toBe("crypto");

    expect(
      classifyMarketsTodayRegionId(
        newsItem({ id: "x2", title: "Focus shifts to product roadmap update" }),
      ),
    ).toBeNull();
  });

  it("places each story in only one Markets Today card and dedupes exact URLs", () => {
    const regions = buildMarketsTodayRegions({
      items: [
        newsItem({
          id: "u-dup-1",
          title: "Nasdaq futures rise ahead of US inflation data",
          canonicalUrl: "https://example.com/us-story?utm_source=newsletter",
        }),
        newsItem({
          id: "u-dup-2",
          title: "Nasdaq futures rise ahead of US inflation data",
          canonicalUrl: "https://example.com/us-story?fbclid=123",
          sourceName: "Secondary Source",
        }),
        newsItem({
          id: "e-dup-1",
          title: "ECB officials warn on euro-area inflation",
        }),
      ],
    });

    const usStories = regions.find((region) => region.id === "us")?.stories ?? [];
    const allStoryIds = regions.flatMap((region) => region.stories.map((story) => story.id));

    expect(usStories).toHaveLength(1);
    expect(new Set(allStoryIds).size).toBe(allStoryIds.length);
    expect(
      regions.filter((region) =>
        region.stories.some(
          (story) => story.id === "u-dup-1" || story.id === "u-dup-2",
        ),
      ),
    ).toHaveLength(1);
  });

  it("recognises tracking-parameter URL variants and obvious title duplicates", () => {
    expect(
      normalizeMarketsTodayUrl("https://example.com/a?utm_source=x&fbclid=1"),
    ).toBe(normalizeMarketsTodayUrl("https://example.com/a"));

    const deduped = dedupeMarketsTodayItems([
      newsItem({
        id: "one",
        title: "Bitcoin climbs above key level | Market wrap",
        canonicalUrl: "https://example.com/bitcoin-a",
        description: "Detailed verified summary.",
      }),
      newsItem({
        id: "two",
        title: "Bitcoin climbs above key level",
        canonicalUrl: "https://example.com/bitcoin-b",
      }),
    ]);

    expect(deduped).toHaveLength(1);
    expect(deduped[0]?.id).toBe("one");
  });

  it("does not delete different reporting on the same broad topic", () => {
    const deduped = dedupeMarketsTodayItems([
      newsItem({
        id: "topic-a",
        title: "Oil prices rise after OPEC guidance",
      }),
      newsItem({
        id: "topic-b",
        title: "Energy stocks rally as crude prices jump",
      }),
    ]);

    expect(deduped).toHaveLength(2);
    expect(normalizeMarketsTodayTitle("Oil prices rise after OPEC guidance")).not.toBe(
      normalizeMarketsTodayTitle("Energy stocks rally as crude prices jump"),
    );
  });

  it("uses Key developments instead of Largest movers and avoids unsupported sentiment", () => {
    const sectionSource = readFileSync(
      path.resolve(process.cwd(), "components/news/NewsMarketsTodaySection.tsx"),
      "utf8",
    );

    expect(MARKETS_TODAY_STORIES_LABEL).toBe("Key developments");
    expect(sectionSource).toContain("MARKETS_TODAY_STORIES_LABEL");
    expect(sectionSource).not.toContain("Largest movers");
    expect(sectionSource).toContain("MARKETS_TODAY_SENTIMENT_STYLES");

    expect(
      aggregateMarketsTodaySentiment([
        newsItem({ id: "s1", title: "Nasdaq edges higher in mixed session" }),
      ]),
    ).toBe("unavailable");
  });

  it("exposes classification evidence internally", () => {
    const result = classifyMarketsTodayRegion(
      newsItem({ id: "e3", title: "ECB preview: euro-area inflation in focus" }),
    );

    expect(result?.region).toBe("europe");
    expect(result?.reason).toMatch(/ECB/i);
    expect(result?.scores.europe).toBeGreaterThan(0);
  });

  it("matches the canonical region order constant", () => {
    expect([...MARKETS_TODAY_REGION_ORDER]).toEqual([
      "global",
      "europe",
      "us",
      "asia",
      "crypto",
    ]);
  });
});
