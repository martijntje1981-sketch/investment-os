import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { NewsAroundTheMarkets } from "@/components/news/glance/NewsAroundTheMarkets";
import { NewsBiggerPictureBlock } from "@/components/news/glance/NewsBiggerPictureBlock";
import { NewsHoldingsBlock } from "@/components/news/glance/NewsHoldingsBlock";
import { NEWS_GLANCE_FAMILY_ACCENT } from "@/components/news/glance/newsGlanceVisuals";
import { NEWS_EXPLORE_MOBILE_COMPACT_TITLES } from "@/components/news/glance/newsExploreCatalog";
import { NEWS_MARKETS_TODAY_HREF } from "@/lib/navigation/discoverDestinations";
import {
  NEWS_EXPLORE_DESTINATIONS,
  NEWS_GLANCE_HOLDING_LIMIT_MOBILE,
  type NewsGlanceBiggerPictureItem,
  type NewsGlanceHoldingRow,
  type NewsGlanceMarketTile,
} from "@/lib/services/newsGlance";
import type { NewsContentItem } from "@/lib/types/newsContent";

function sourceItem(id: string): NewsContentItem {
  return {
    id,
    title: `Headline ${id}`,
    sourceName: "Test Wire",
    sourceType: "news",
    canonicalUrl: `https://example.test/${id}`,
    thumbnailUrl: null,
    publishedAt: "2026-08-18T10:00:00.000Z",
    description: `Headline ${id}`,
    summary: `Headline ${id}`,
    interpretation: "",
    impactLevel: "Medium Impact",
    matchedHoldingIds: [],
    matchedSymbols: [],
    matchedHoldings: [],
    relevanceLabel: null,
    category: "markets",
    marketCategory: "general",
    contentTypeLabel: "News",
    fetchedAt: "2026-08-18T12:00:00.000Z",
    relevanceScore: 22,
  };
}

function row(
  overrides: Partial<NewsGlanceHoldingRow> & Pick<NewsGlanceHoldingRow, "holdingId" | "symbol">,
): NewsGlanceHoldingRow {
  return {
    name: overrides.name ?? overrides.symbol,
    exposureLabel: overrides.exposureLabel ?? "Equity",
    weightPercent: 10,
    changePercent: 1.2,
    moveLabel: "+1.20%",
    moveDirection: "up",
    headline: `Headline for ${overrides.symbol}`,
    sourceName: "Test Wire",
    publishedAt: "2026-08-18T10:00:00.000Z",
    canonicalUrl: `https://example.test/${overrides.symbol}`,
    thumbnailUrl: null,
    hasThumbnail: false,
    matchRole: "sector_context",
    matchKind: "sector",
    classificationLabel: "Context",
    emptyCopy: null,
    visualFamily: "holding",
    fallbackCategory: "portfolio",
    sourceItem: sourceItem(overrides.symbol),
    ...overrides,
  };
}

describe("News glance polish UI", () => {
  it("shows at most 3 holding rows on the mobile glance and keeps View all", () => {
    const rows = ["AAA", "BBB", "CCC", "DDD", "EEE"].map((symbol) =>
      row({ holdingId: `${symbol}-id`, symbol }),
    );
    const html = renderToStaticMarkup(<NewsHoldingsBlock rows={rows} />);
    const rowCount = html.match(/data-testid="news-glance-holding-row"/g)?.length ?? 0;
    expect(rowCount).toBe(4);
    expect(html).toContain(`data-mobile-limit="${NEWS_GLANCE_HOLDING_LIMIT_MOBILE}"`);
    expect(html).toContain("hidden lg:list-item");
    expect(html).toContain("View all holding news →");
    expect(html).toContain('data-testid="news-holdings-view-all"');
    expect(html).toContain(NEWS_EXPLORE_DESTINATIONS.holdings);
    expect(html).toContain('data-testid="news-glance-article-link"');
    expect(html).toContain("https://example.test/AAA");
    expect(html).toContain('data-news-media="fallback"');
  });

  it("renders compact Around the Markets tiles with Markets Today deep links", () => {
    const tiles: NewsGlanceMarketTile[] = [
      {
        id: "us",
        label: "US",
        href: NEWS_MARKETS_TODAY_HREF,
        sentiment: "Positive",
        statusLabel: "Higher",
        signal: "Federal Reserve holds",
        available: true,
        visualFamily: "macro",
      },
      {
        id: "europe",
        label: "Europe",
        href: NEWS_MARKETS_TODAY_HREF,
        sentiment: "Negative",
        statusLabel: "Lower",
        signal: null,
        available: true,
        visualFamily: "macro",
      },
      {
        id: "asia",
        label: "Asia",
        href: NEWS_MARKETS_TODAY_HREF,
        sentiment: "unavailable",
        statusLabel: "Unavailable",
        signal: null,
        available: false,
        visualFamily: "macro",
      },
      {
        id: "crypto",
        label: "Crypto",
        href: NEWS_MARKETS_TODAY_HREF,
        sentiment: "Neutral",
        statusLabel: "Mixed",
        signal: "Bitcoin funds see inflows",
        available: true,
        visualFamily: "crypto",
      },
    ];
    const html = renderToStaticMarkup(<NewsAroundTheMarkets tiles={tiles} />);
    expect(html).toContain("Around the markets");
    expect(html).toContain('data-region="us"');
    expect(html).toContain('data-region="europe"');
    expect(html).toContain('data-region="asia"');
    expect(html).toContain('data-region="crypto"');
    expect(html).toContain('data-available="false"');
    expect(html.match(new RegExp(NEWS_MARKETS_TODAY_HREF, "g"))?.length).toBe(4);
    expect(html).not.toMatch(/[+-]\d+(\.\d+)?%/);
  });

  it("omits Bigger Picture when empty and still renders meaningful items", () => {
    expect(renderToStaticMarkup(<NewsBiggerPictureBlock items={[]} />)).toBe("");

    const item: NewsGlanceBiggerPictureItem = {
      id: "rates-1",
      themeLabel: "Rates",
      headline: "Official rates remain restrictive",
      sourceName: "Test Wire",
      publishedAt: "2026-08-18T10:00:00.000Z",
      canonicalUrl: "https://example.test/rates-1",
      thumbnailUrl: null,
      hasThumbnail: false,
      relevanceCue: "Relevant to 12% of portfolio value",
      matchKind: "macro",
      visualFamily: "macro",
      fallbackCategory: "macro",
      sourceItem: sourceItem("rates-1"),
    };
    const html = renderToStaticMarkup(<NewsBiggerPictureBlock items={[item]} />);
    expect(html).toContain('data-testid="news-bigger-picture"');
    expect(html).toContain("Official rates remain restrictive");
    expect(html).toContain("https://example.test/rates-1");
    expect(html).not.toContain("No meaningful broader context");
  });

  it("keeps compact Explore choices and complete destinations", () => {
    expect([...NEWS_EXPLORE_MOBILE_COMPACT_TITLES]).toEqual([
      "Holdings news",
      "Markets Today",
      "Perspectives",
      "Search",
    ]);
    expect(NEWS_EXPLORE_DESTINATIONS.marketsToday).toBe(NEWS_MARKETS_TODAY_HREF);
    expect(NEWS_EXPLORE_DESTINATIONS.holdings).toContain("#portfolio-news");
    expect(NEWS_EXPLORE_DESTINATIONS.search).toContain("#news-search");
    expect(NEWS_EXPLORE_DESTINATIONS.macro).toContain("#news-macro");
    expect(NEWS_EXPLORE_DESTINATIONS.videos).toContain("#news-videos");
    expect(NEWS_EXPLORE_DESTINATIONS.perspectives).toContain("perspectives");
    expect(NEWS_EXPLORE_DESTINATIONS.events).toBe("/events");
  });

  it("keeps accent families deterministic", () => {
    expect(Object.keys(NEWS_GLANCE_FAMILY_ACCENT).sort()).toEqual([
      "commodities",
      "crypto",
      "holding",
      "macro",
    ]);
    expect(NEWS_GLANCE_FAMILY_ACCENT.holding.bar).toContain("sky");
    expect(NEWS_GLANCE_FAMILY_ACCENT.macro.bar).toContain("violet");
    expect(NEWS_GLANCE_FAMILY_ACCENT.crypto.bar).toContain("amber");
    expect(NEWS_GLANCE_FAMILY_ACCENT.commodities.bar).toContain("yellow");
  });
});
