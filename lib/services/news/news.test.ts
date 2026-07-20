import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

import { deduplicateCrossSourceNews } from "@/lib/services/news/deduplicateNews";
import { parseYouTubeAtomFeed } from "@/lib/services/news/providers/youtubeRssProvider";
import {
  deduplicateNewsItems,
  isStrongPortfolioMatch,
  partitionNewsHub,
  scoreNewsItemRelevance,
  sortNewsItems,
  buildHoldingMatchProfiles,
} from "@/lib/services/news/relevanceMatching";
import { generateNewsSummary, enrichNewsItem } from "@/lib/services/news/newsSummary";
import {
  deriveNewsImpactLevel,
  generateInterpretation,
} from "@/lib/services/news/newsImpact";
import { buildTodaysMarketBrief } from "@/lib/services/news/marketBrief";
import {
  filterFinancialNewsItems,
  isFinancialMarketContent,
  isSportsContent,
} from "@/lib/services/news/financialContentFilter";
import {
  sanitizeNewsText,
  sanitizeNewsUrl,
} from "@/lib/services/news/sanitizeNewsUrl";
import type { NewsContentItem } from "@/lib/types/newsContent";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

const SAMPLE_FEED = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns:media="http://search.yahoo.com/mrss/">
  <title>Sample Channel</title>
  <entry>
    <yt:videoId>abc123</yt:videoId>
    <title>Bitcoin outlook for long-term investors</title>
    <link rel="alternate" href="https://www.youtube.com/watch?v=abc123"/>
    <published>2026-07-18T10:00:00+00:00</published>
    <media:group>
      <media:description>BTC and crypto market commentary.</media:description>
      <media:thumbnail url="https://i.ytimg.com/vi/abc123/hqdefault.jpg"/>
    </media:group>
  </entry>
  <entry>
    <yt:videoId>def456</yt:videoId>
    <title>Global markets weekly wrap</title>
    <link rel="alternate" href="https://www.youtube.com/watch?v=def456"/>
    <published>2026-07-17T09:00:00+00:00</published>
    <media:group>
      <media:description>World equities and macro update.</media:description>
      <media:thumbnail url="https://i.ytimg.com/vi/def456/hqdefault.jpg"/>
    </media:group>
  </entry>
</feed>`;

const MALFORMED_FEED = `<html><body>Not a feed</body></html>`;

function item(
  overrides: Partial<NewsContentItem> & Pick<NewsContentItem, "id" | "title" | "canonicalUrl">,
): NewsContentItem {
  return {
    sourceName: "Sample Source",
    sourceType: "youtube",
    thumbnailUrl: null,
    publishedAt: "2026-07-18T10:00:00.000Z",
    description: null,
    summary: "",
    interpretation: "",
    impactLevel: "Low Impact",
    matchedHoldingIds: [],
    matchedSymbols: [],
    matchedHoldings: [],
    relevanceLabel: null,
    category: "markets",
    marketCategory: "general",
    contentTypeLabel: "Video",
    fetchedAt: "2026-07-19T08:00:00.000Z",
    relevanceScore: 0,
    ...overrides,
  };
}

function holding(
  overrides: Partial<StoredPortfolioHolding> & Pick<StoredPortfolioHolding, "symbol" | "name">,
): StoredPortfolioHolding {
  return {
    id: overrides.id ?? `${overrides.symbol}-id`,
    symbol: overrides.symbol,
    name: overrides.name,
    quantity: 1,
    purchasePrice: 100,
    currentPrice: 100,
    currency: "EUR",
    assetType: "investment",
  };
}

describe("news feed normalization", () => {
  it("normalizes YouTube Atom entries into content items", () => {
    const parsed = parseYouTubeAtomFeed(SAMPLE_FEED);

    expect(parsed).toHaveLength(2);
    expect(parsed[0]).toMatchObject({
      videoId: "abc123",
      title: "Bitcoin outlook for long-term investors",
      url: "https://www.youtube.com/watch?v=abc123",
      thumbnailUrl: "https://i.ytimg.com/vi/abc123/hqdefault.jpg",
    });
  });

  it("isolates malformed feeds without throwing", () => {
    expect(parseYouTubeAtomFeed(MALFORMED_FEED)).toEqual([]);
    expect(parseYouTubeAtomFeed("")).toEqual([]);
  });
});

describe("news URL and text sanitization", () => {
  it("accepts safe https URLs and rejects unsafe protocols", () => {
    expect(sanitizeNewsUrl("https://www.youtube.com/watch?v=abc123")).toBe(
      "https://www.youtube.com/watch?v=abc123",
    );
    expect(sanitizeNewsUrl("javascript:alert(1)")).toBeNull();
    expect(sanitizeNewsUrl("ftp://example.com/video")).toBeNull();
  });

  it("strips HTML and truncates descriptions", () => {
    expect(sanitizeNewsText("<b>Bitcoin</b> update", 20)).toBe("Bitcoin update");
  });
});

describe("news relevance matching", () => {
  it("matches holdings deterministically and labels relevance", () => {
    const news = item({
      id: "1",
      title: "Uranium and nuclear energy sector update",
      canonicalUrl: "https://www.youtube.com/watch?v=nuke1",
      description: "Nuclear power demand rises",
    });

    const profiles = buildHoldingMatchProfiles([
      holding({ symbol: "NUKL", name: "Uranium and Nuclear ETF" }),
    ]);
    const scored = scoreNewsItemRelevance(news, profiles);

    expect(scored.relevanceLabel).toBe("Relevant to NUKL");
    expect(scored.matchedSymbols).toEqual(["NUKL"]);
    expect(scored.relevanceScore).toBeGreaterThan(0);
  });

  it("does not weak-match VWCE from generic global market language", () => {
    const profiles = buildHoldingMatchProfiles([
      holding({ symbol: "VWCE", name: "Vanguard FTSE All-World UCITS ETF" }),
    ]);
    const haystack = "Global markets weekly wrap for world equities";

    expect(isStrongPortfolioMatch(haystack, profiles[0]!)).toBe(false);

    const scored = scoreNewsItemRelevance(
      item({
        id: "vwce-general",
        title: "Global markets weekly wrap",
        canonicalUrl: "https://www.youtube.com/watch?v=markets1",
        description: "World equities and macro update",
      }),
      profiles,
    );

    expect(scored.relevanceScore).toBe(0);
    expect(scored.relevanceLabel).toBeNull();
  });

  it("prevents short-ticker false positives", () => {
    const news = item({
      id: "2",
      title: "AI chips and data centre demand",
      canonicalUrl: "https://www.youtube.com/watch?v=ai1",
    });

    const scored = scoreNewsItemRelevance(
      news,
      buildHoldingMatchProfiles([
        holding({ symbol: "AI", name: "Generic AI Fund" }),
      ]),
    );

    expect(scored.relevanceScore).toBe(0);
    expect(scored.relevanceLabel).toBeNull();
  });

  it("deduplicates by canonical URL and near-identical titles", () => {
    const deduped = deduplicateNewsItems([
      item({
        id: "a",
        title: "Fed outlook and inflation update",
        canonicalUrl: "https://www.youtube.com/watch?v=same",
      }),
      item({
        id: "b",
        title: "Fed outlook and inflation update",
        canonicalUrl: "https://www.youtube.com/watch?v=other",
      }),
    ]);

    expect(deduped).toHaveLength(1);
  });

  it("sorts by relevance first, then recency", () => {
    const sorted = sortNewsItems([
      item({
        id: "old-relevant",
        title: "Old relevant",
        canonicalUrl: "https://www.youtube.com/watch?v=1",
        publishedAt: "2026-07-10T10:00:00.000Z",
        relevanceScore: 15,
      }),
      item({
        id: "new-general",
        title: "New general",
        canonicalUrl: "https://www.youtube.com/watch?v=2",
        publishedAt: "2026-07-19T10:00:00.000Z",
        relevanceScore: 0,
      }),
      item({
        id: "new-relevant",
        title: "New relevant",
        canonicalUrl: "https://www.youtube.com/watch?v=3",
        publishedAt: "2026-07-18T10:00:00.000Z",
        relevanceScore: 15,
      }),
    ]);

    expect(sorted.map((entry) => entry.id)).toEqual([
      "new-relevant",
      "old-relevant",
      "new-general",
    ]);
  });

  it("sorts portfolio news by relevance then recency", () => {
    const sections = partitionNewsHub([
      item({
        id: "older-strong",
        title: "Bitcoin outlook for long-term investors",
        canonicalUrl: "https://www.youtube.com/watch?v=btc-old",
        publishedAt: "2026-07-10T10:00:00.000Z",
        relevanceScore: 20,
      }),
      item({
        id: "newer-strong",
        title: "VWCE and global ETF flows update",
        canonicalUrl: "https://www.youtube.com/watch?v=vwce-new",
        publishedAt: "2026-07-19T10:00:00.000Z",
        relevanceScore: 15,
      }),
    ]);

    expect(sections.portfolioNews.map((entry) => entry.id)).toEqual([
      "older-strong",
      "newer-strong",
    ]);
  });
});

describe("cross-source deduplication", () => {
  it("prefers wire articles over duplicate YouTube titles", () => {
    const deduped = deduplicateCrossSourceNews([
      item({
        id: "yt",
        title: "Fed outlook and inflation update",
        canonicalUrl: "https://www.youtube.com/watch?v=macro1",
        sourceType: "youtube",
      }),
      item({
        id: "wire",
        title: "Fed outlook and inflation update",
        canonicalUrl: "https://example.com/fed-outlook",
        sourceType: "news",
        sourceName: "EODHD News",
      }),
    ]);

    expect(deduped).toHaveLength(1);
    expect(deduped[0]?.sourceType).toBe("news");
  });
});

describe("financial news filtering", () => {
  it("excludes observed sports examples from financial content", () => {
    const sportsExamples = [
      "BetMGM CEO: Most-Bet FIFA World Cup in Our History",
      "FIFA Integrity Debate Shadows World Cup",
    ];

    for (const title of sportsExamples) {
      expect(isSportsContent(title)).toBe(true);
      expect(
        isFinancialMarketContent(
          item({
            id: title,
            title,
            canonicalUrl: "https://www.youtube.com/watch?v=sports1",
            category: "markets",
          }),
        ),
      ).toBe(false);
    }
  });

  it("keeps financial market videos in fallback sections", () => {
    const filtered = filterFinancialNewsItems([
      item({
        id: "markets",
        title: "Fed outlook and inflation update",
        canonicalUrl: "https://www.youtube.com/watch?v=macro1",
        category: "markets",
      }),
      item({
        id: "sports",
        title: "BetMGM CEO: Most-Bet FIFA World Cup in Our History",
        canonicalUrl: "https://www.youtube.com/watch?v=sports1",
        category: "markets",
      }),
    ]);

    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.title).toContain("Fed outlook");
  });
});

describe("news summaries and interpretation", () => {
  it("creates readable factual summaries from descriptions and titles", () => {
    const fromDescription = generateNewsSummary({
      title: "Bitcoin outlook for long-term investors",
      description:
        "BTC remains volatile. Institutional demand continues to build across global markets.",
      sourceName: "Bloomberg Television",
      publishedAt: "2026-07-18T10:00:00.000Z",
    });

    expect(fromDescription).toContain("BTC remains volatile");

    const fromTitle = generateNewsSummary({
      title: "Fed outlook and inflation update",
      description: null,
      sourceName: "CNBC Television",
      publishedAt: "2026-07-18T10:00:00.000Z",
    });

    expect(fromTitle).toContain("CNBC Television");
    expect(fromTitle.length).toBeGreaterThan(20);
  });

  it("adds impact badges and interpretation copy to enriched items", () => {
    const enriched = enrichNewsItem(
      item({
        id: "portfolio-hit",
        title: "Bitcoin outlook for long-term investors",
        canonicalUrl: "https://www.youtube.com/watch?v=btc1",
        relevanceScore: 15,
        matchedSymbols: ["IB1T"],
        matchedHoldings: [
          {
            id: "ib1t-id",
            symbol: "IB1T",
            name: "Bitcoin ETP",
            providerSymbol: "IB1T.XETRA",
          },
        ],
      }),
    );

    expect(enriched.impactLevel).toBe("High Impact");
    expect(enriched.interpretation).toContain("IB1T");
    expect(enriched.summary.length).toBeGreaterThan(0);
  });
});

describe("today's market brief", () => {
  it("builds a brief with facts, interpretation, and verified watch items", () => {
    const brief = buildTodaysMarketBrief(
      [
        item({
          id: "portfolio",
          title: "Bitcoin outlook for long-term investors",
          canonicalUrl: "https://www.youtube.com/watch?v=btc1",
          relevanceScore: 15,
          matchedSymbols: ["IB1T"],
          matchedHoldings: [
            {
              id: "ib1t-id",
              symbol: "IB1T",
              name: "Bitcoin ETP",
              providerSymbol: "IB1T.XETRA",
            },
          ],
          summary: "BTC demand remains constructive.",
          interpretation: "Crypto coverage may affect IB1T exposure.",
        }),
      ],
      [
        item({
          id: "macro",
          title: "Fed outlook and inflation update",
          canonicalUrl: "https://www.youtube.com/watch?v=macro1",
          category: "macro",
          marketCategory: "macro",
          summary: "Rates remain in focus.",
          interpretation: "Macro development could influence rate expectations.",
        }),
      ],
      [
        {
          id: "cpi",
          title: "US Consumer Price Index",
          category: "cpi",
          date: "2026-07-22",
          timeLabel: "Tue 22 Jul",
          country: "United States",
          description: "Inflation data release",
          impact: "High",
          source: "EODHD Economic Calendar",
        },
      ],
      "2026-07-20T08:00:00.000Z",
    );

    expect(brief.title).toBe("Today's Market Brief");
    expect(brief.keyInsights.length).toBeGreaterThanOrEqual(4);
    expect(brief.biggestMacroDevelopment).toContain("Rates remain in focus");
    expect(brief.biggestPortfolioDevelopment).toContain("BTC demand remains constructive");
    expect(brief.whatToWatchToday).toContain("US Consumer Price Index");
    expect(brief.hasVerifiedContent).toBe(true);
  });
});

describe("news impact levels", () => {
  it("classifies portfolio matches and macro headlines", () => {
    expect(
      deriveNewsImpactLevel(
        item({
          id: "high",
          title: "Bitcoin outlook",
          canonicalUrl: "https://example.com/1",
          relevanceScore: 15,
        }),
      ),
    ).toBe("High Impact");

    expect(
      deriveNewsImpactLevel(
        item({
          id: "macro",
          title: "Fed outlook and inflation update",
          canonicalUrl: "https://example.com/2",
          category: "macro",
        }),
      ),
    ).toBe("High Impact");

    expect(
      generateInterpretation({
        title: "Fed outlook and inflation update",
        matchedSymbols: [],
        matchedHoldings: [],
        category: "macro",
        marketCategory: "macro",
        impactLevel: "High Impact",
      }),
    ).toContain("macro development");
  });
});

describe("upcoming market events", () => {
  it("does not expose fabricated fallback catalysts in production helpers", async () => {
    const { buildFallbackUpcomingEvents } = await import(
      "@/lib/services/news/upcomingEvents"
    );

    expect(buildFallbackUpcomingEvents(new Date("2026-07-20T10:00:00.000Z"))).toEqual(
      [],
    );
  });
});

describe("news safety boundaries", () => {
  it("does not expose legacy mock home briefing data as live news", () => {
    const homeDataPath = path.resolve(process.cwd(), "lib/home-data.ts");
    const source = readFileSync(homeDataPath, "utf8");

    expect(source).toContain("briefing:");
    expect(source).not.toMatch(/export\s+function\s+fetchNews/);
  });

  it("keeps the Analysis page separate from the News route", () => {
    const analysisPagePath = path.resolve(process.cwd(), "app/briefing/page.tsx");
    const source = readFileSync(analysisPagePath, "utf8");

    expect(source).toContain("Portfolio Analysis");
    expect(source).not.toContain("/api/news");
    expect(source).not.toContain("NewsPage");
  });

  it("handles provider failures without throwing during feed parsing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Network unavailable")),
    );

    const { YouTubeRssProvider } = await import(
      "@/lib/services/news/providers/youtubeRssProvider"
    );
    const provider = new YouTubeRssProvider({
      id: "test-source",
      sourceName: "Test Source",
      channelId: "UCtest",
      feedUrl: "https://www.youtube.com/feeds/videos.xml?channel_id=UCtest",
      category: "markets",
    });

    const result = await provider.fetchItems({
      fetchedAt: new Date().toISOString(),
      timeoutMs: 1000,
    });

    expect(result.items).toEqual([]);
    expect(result.error).toBeTruthy();
  });
});
