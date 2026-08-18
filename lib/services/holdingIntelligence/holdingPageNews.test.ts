import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  NEWS_HUB_NO_CATALYST,
  HOLDING_PAGE_DIRECT_NEWS_LABEL,
  HOLDING_PAGE_SECTOR_NEWS_LABEL,
  partitionHoldingPageNews,
  selectHoldingPageComponentNews,
  selectHoldingPageNewsItems,
} from "@/lib/services/holdingIntelligence";
import {
  CONTEXTUAL_PORTFOLIO_MATCH_SCORE,
  STRONG_PORTFOLIO_MATCH_SCORE,
} from "@/lib/services/news/relevanceMatching";
import type { NewsContentItem } from "@/lib/types/newsContent";
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
    purchasePrice: overrides.purchasePrice ?? 100,
    currentPrice: overrides.currentPrice ?? 100,
    currency: "EUR",
    assetType: overrides.assetType ?? "investment",
    providerSymbol: overrides.providerSymbol,
    instrumentName: overrides.instrumentName,
    providerInstrumentType: overrides.providerInstrumentType,
    previousClose: overrides.previousClose,
    changePercent: overrides.changePercent,
    change24hPercent: overrides.change24hPercent,
  };
}

function newsItem(
  overrides: Partial<NewsContentItem> &
    Pick<NewsContentItem, "id" | "title" | "matchedSymbols">,
): NewsContentItem {
  return {
    sourceName: overrides.sourceName ?? "Test Wire",
    sourceType: "news",
    canonicalUrl: overrides.canonicalUrl ?? `https://example.test/${overrides.id}`,
    thumbnailUrl: null,
    publishedAt: overrides.publishedAt ?? "2026-08-18T10:00:00.000Z",
    description: overrides.description ?? overrides.title,
    summary: overrides.title,
    interpretation: "",
    impactLevel: "Medium Impact",
    matchedHoldingIds: overrides.matchedHoldingIds ?? [],
    matchedSymbols: overrides.matchedSymbols,
    matchedHoldings: overrides.matchedHoldings ?? [],
    relevanceLabel: null,
    category: "markets",
    marketCategory: "general",
    contentTypeLabel: "News",
    fetchedAt: "2026-08-18T12:00:00.000Z",
    relevanceScore: overrides.relevanceScore ?? 0,
    ...overrides,
  };
}

const nukl = holding({
  symbol: "NUKL",
  name: "VanEck Uranium and Nuclear Technologies UCITS ETF",
  providerSymbol: "NUKL.XETRA",
  providerInstrumentType: "ETF",
  quantity: 20,
  currentPrice: 50,
  previousClose: 40,
});

const CAUSAL = /caused by|due to|because of/i;

function read(relativePath: string): string {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("Phase 11I holding page news", () => {
  it("shows up to four strong NUKL items and prefers direct holding news", () => {
    const items = [
      newsItem({
        id: "weak",
        title: "Markets mixed as investors wait",
        matchedSymbols: ["NUKL"],
        matchedHoldingIds: ["NUKL-id"],
        relevanceScore: 2,
      }),
      newsItem({
        id: "sector",
        title: "Uranium miners rally on supply tightness",
        matchedSymbols: ["NUKL"],
        matchedHoldingIds: ["NUKL-id"],
        relevanceScore: CONTEXTUAL_PORTFOLIO_MATCH_SCORE,
        publishedAt: "2026-08-18T08:00:00.000Z",
      }),
      newsItem({
        id: "direct",
        title: "NUKL extends gain as nuclear names outperform",
        matchedSymbols: ["NUKL"],
        matchedHoldingIds: ["NUKL-id"],
        relevanceScore: STRONG_PORTFOLIO_MATCH_SCORE + 8,
        publishedAt: "2026-08-18T09:00:00.000Z",
      }),
      newsItem({
        id: "alias",
        title: "VanEck nuclear ETF sees fresh inflows",
        matchedSymbols: ["NUKL"],
        matchedHoldingIds: ["NUKL-id"],
        relevanceScore: STRONG_PORTFOLIO_MATCH_SCORE,
        publishedAt: "2026-08-18T07:00:00.000Z",
      }),
      newsItem({
        id: "direct-2",
        title: "NUKL holdings update from the issuer",
        matchedSymbols: ["NUKL"],
        matchedHoldingIds: ["NUKL-id"],
        relevanceScore: STRONG_PORTFOLIO_MATCH_SCORE + 6,
        publishedAt: "2026-08-18T06:00:00.000Z",
      }),
      newsItem({
        id: "direct-3",
        title: "Analysts reiterate NUKL as uranium proxy",
        matchedSymbols: ["NUKL"],
        matchedHoldingIds: ["NUKL-id"],
        relevanceScore: STRONG_PORTFOLIO_MATCH_SCORE + 5,
        publishedAt: "2026-08-18T05:00:00.000Z",
      }),
    ];

    const selected = selectHoldingPageNewsItems(items, nukl);
    expect(selected).toHaveLength(4);
    expect(selected[0]?.item.id).toBe("direct");
    expect(selected[0]?.matchRole).toBe("direct");
    expect(selected.map((row) => row.item.id)).not.toContain("weak");
    expect(selected.map((row) => row.matchRole)).toEqual([
      "direct",
      "alias",
      "alias",
      "alias",
    ]);
  });

  it("uses an honest empty state when no reliable news exists", () => {
    expect(selectHoldingPageNewsItems([], nukl)).toEqual([]);
    const card = read("components/holding/HoldingMoveContextCard.tsx");
    expect(card).toContain("NEWS_HUB_NO_CATALYST");
    expect(card).toContain('data-testid="holding-page-news-empty"');
    expect(card).not.toMatch(CAUSAL);
    expect(NEWS_HUB_NO_CATALYST).toBe("No clear holding-specific catalyst found.");
    expect(card.match(/data-testid="holding-page-news-empty"/g)?.length).toBe(1);
  });

  it("labels sector/theme NUKL context as context, not cause", () => {
    const items = [
      newsItem({
        id: "uranium-theme",
        title: "Uranium sector outlook improves",
        matchedSymbols: ["NUKL"],
        matchedHoldingIds: ["NUKL-id"],
        relevanceScore: CONTEXTUAL_PORTFOLIO_MATCH_SCORE,
      }),
    ];
    const selected = selectHoldingPageNewsItems(items, nukl);
    expect(selected).toHaveLength(1);
    expect(selected[0]?.matchRole).toBe("sector_context");
    expect(selected[0]?.item.title).toBe("Uranium sector outlook improves");

    const card = read("components/holding/HoldingMoveContextCard.tsx");
    expect(card).toContain("HOLDING_PAGE_SECTOR_NEWS_LABEL");
    expect(card).toContain("Sector context, not a proven cause.");
    expect(card).not.toMatch(CAUSAL);
  });

  it("labels ETF direct news separately from sector context", () => {
    const items = [
      newsItem({
        id: "direct",
        title: "NUKL extends gain as nuclear names outperform",
        matchedSymbols: ["NUKL"],
        matchedHoldingIds: ["NUKL-id"],
        relevanceScore: STRONG_PORTFOLIO_MATCH_SCORE + 8,
      }),
      newsItem({
        id: "sector",
        title: "Uranium miners rally on supply tightness",
        matchedSymbols: ["NUKL"],
        matchedHoldingIds: ["NUKL-id"],
        relevanceScore: CONTEXTUAL_PORTFOLIO_MATCH_SCORE,
      }),
    ];
    const selected = selectHoldingPageNewsItems(items, nukl);
    const groups = partitionHoldingPageNews(selected);
    expect(groups.direct[0]?.matchRole).toBe("direct");
    expect(groups.sector[0]?.matchRole).toBe("sector_context");
    expect(HOLDING_PAGE_DIRECT_NEWS_LABEL).toBe("Direct ETF news");
    expect(HOLDING_PAGE_SECTOR_NEWS_LABEL).toBe("Sector / theme context");
    const card = read("components/holding/HoldingMoveContextCard.tsx");
    expect(card).toContain("HOLDING_PAGE_DIRECT_NEWS_LABEL");
    expect(card).toContain("HOLDING_PAGE_SECTOR_NEWS_LABEL");
  });

  it("never shows guessed constituents or a component-news section", () => {
    expect(selectHoldingPageComponentNews()).toEqual([]);
    const pageNews = read("lib/services/holdingIntelligence/holdingPageNews.ts");
    const card = read("components/holding/HoldingMoveContextCard.tsx");
    for (const source of [pageNews, card]) {
      expect(source).not.toMatch(/Cameco|NexGen|CCJ|NXE/i);
      expect(source).not.toMatch(/Underlying company/i);
      expect(source).not.toMatch(/executeEodhdApiCall|ETF_Data/);
    }
  });

  it("deduplicates repeated headlines in the cached pool", () => {
    const selected = selectHoldingPageNewsItems(
      [
        newsItem({
          id: "a",
          title: "NUKL uranium update",
          canonicalUrl: "https://example.test/same-story",
          matchedSymbols: ["NUKL"],
          matchedHoldingIds: ["NUKL-id"],
          relevanceScore: STRONG_PORTFOLIO_MATCH_SCORE + 8,
        }),
        newsItem({
          id: "b",
          title: "NUKL uranium update",
          canonicalUrl: "https://example.test/same-story",
          matchedSymbols: ["NUKL"],
          matchedHoldingIds: ["NUKL-id"],
          relevanceScore: STRONG_PORTFOLIO_MATCH_SCORE + 7,
        }),
      ],
      nukl,
    );
    expect(selected).toHaveLength(1);
  });

  it("does not fill Bitcoin pages with generic crypto stories", () => {
    const selected = selectHoldingPageNewsItems(
      [
        newsItem({
          id: "crypto-only",
          title: "Crypto markets rally as altcoins recover",
          matchedSymbols: ["BTC"],
          matchedHoldingIds: ["BTC-id"],
          relevanceScore: CONTEXTUAL_PORTFOLIO_MATCH_SCORE,
        }),
      ],
      holding({
        symbol: "BTC",
        name: "Bitcoin",
        assetType: "crypto",
      }),
      { isBitcoin: true },
    );
    expect(selected).toEqual([]);
  });
});

describe("Phase 11J holding discoverability", () => {
  it("links holdings from Dashboard, Portfolio, and News", () => {
    const dashboard = read("components/dashboard/HoldingsTodayRow.tsx");
    const portfolio = read("app/portfolio/page.tsx");
    const news = read("components/news/NewsForPortfolioSection.tsx");
    const holdingPage = read("app/holding/[ticker]/page.tsx");

    expect(dashboard).toContain("holdingDetailPath");
    expect(dashboard).toContain("ViewHoldingCue");
    expect(portfolio).toContain("holdingDetailPath");
    expect(portfolio).toContain("View holding →");
    expect(news).toContain("holdingDetailPath");
    expect(news).toContain("ViewHoldingCue");
    expect(holdingPage).toContain("selectHoldingPageNewsItems");
    expect(holdingPage).toContain("HoldingMoveContextCard");
    expect(holdingPage).toContain("relatedNews");
    expect(holdingPage.indexOf("HoldingMoveContextCard")).toBeLessThan(
      holdingPage.indexOf("Position Summary"),
    );
  });

  it("adds no extra fetch, EODHD, OpenAI, cron, or polling path", () => {
    const files = [
      "lib/services/holdingIntelligence/holdingPageNews.ts",
      "components/holding/HoldingMoveContextCard.tsx",
      "components/holding/ViewHoldingCue.tsx",
      "app/holding/[ticker]/page.tsx",
      "components/dashboard/HoldingsTodayRow.tsx",
      "components/news/NewsForPortfolioSection.tsx",
    ];
    for (const file of files) {
      const source = read(file);
      expect(source).not.toMatch(/executeEodhdApiCall/);
      expect(source).not.toMatch(/ETF_Data/);
      expect(source).not.toMatch(/openai/i);
      expect(source).not.toMatch(/setInterval\s*\(/);
      expect(source).not.toMatch(/\bfetch\s*\(/);
    }
  });
});
