import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { HoldingMoveContextCard } from "@/components/holding/HoldingMoveContextCard";
import { VIEW_HOLDING_CUE } from "@/components/holding/ViewHoldingCue";
import {
  NEWS_HUB_NO_CATALYST,
  buildHoldingIntelligenceCandidates,
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
      "direct",
      "direct",
      "alias",
    ]);

    const [candidate] = buildHoldingIntelligenceCandidates({
      holdings: [nukl],
      newsItems: items,
    });
    const html = renderToStaticMarkup(
      <HoldingMoveContextCard
        candidate={candidate!}
        relatedNews={selected}
      />,
    );
    expect(html).toContain("NUKL extends gain as nuclear names outperform");
    expect(html).toContain("Test Wire");
    expect(html).toContain('data-testid="holding-page-news-item"');
    expect(html).not.toMatch(CAUSAL);
    expect(html).toContain("Related context, not a proven cause.");
    expect(html).not.toContain("Markets mixed as investors wait");
  });

  it("uses an honest empty state when no reliable news exists", () => {
    const selected = selectHoldingPageNewsItems([], nukl);
    expect(selected).toEqual([]);

    const [candidate] = buildHoldingIntelligenceCandidates({
      holdings: [nukl],
      newsItems: [],
    });
    const html = renderToStaticMarkup(
      <HoldingMoveContextCard candidate={candidate!} relatedNews={selected} />,
    );
    expect(html).toContain(NEWS_HUB_NO_CATALYST);
    expect(html).toContain('data-testid="holding-page-news-empty"');
    expect(html).not.toMatch(CAUSAL);
    expect(html).not.toContain("holding-page-news-item");
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

    const [candidate] = buildHoldingIntelligenceCandidates({
      holdings: [nukl],
      newsItems: items,
    });
    const html = renderToStaticMarkup(
      <HoldingMoveContextCard
        candidate={candidate!}
        relatedNews={selected}
      />,
    );
    expect(html).toContain("Sector context");
    expect(html).toContain("Uranium sector outlook improves");
    expect(html).toContain("not a proven cause");
    expect(html).not.toMatch(CAUSAL);
    expect(candidate?.explanationNote).not.toMatch(CAUSAL);
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
    const files = {
      dashboard: readFileSync(
        path.resolve(
          process.cwd(),
          "components/dashboard/HoldingsTodayRow.tsx",
        ),
        "utf8",
      ),
      portfolio: readFileSync(
        path.resolve(process.cwd(), "app/portfolio/page.tsx"),
        "utf8",
      ),
      news: readFileSync(
        path.resolve(
          process.cwd(),
          "components/news/NewsForPortfolioSection.tsx",
        ),
        "utf8",
      ),
      holdingPage: readFileSync(
        path.resolve(process.cwd(), "app/holding/[ticker]/page.tsx"),
        "utf8",
      ),
    };

    expect(files.dashboard).toContain("holdingDetailPath");
    expect(files.dashboard).toContain("ViewHoldingCue");
    expect(files.portfolio).toContain("holdingDetailPath");
    expect(files.portfolio).toContain(VIEW_HOLDING_CUE);
    expect(files.news).toContain("holdingDetailPath");
    expect(files.news).toContain("ViewHoldingCue");
    expect(files.holdingPage).toContain("selectHoldingPageNewsItems");
    expect(files.holdingPage).toContain("HoldingMoveContextCard");
    expect(files.holdingPage).toContain("relatedNews");
    expect(files.holdingPage.indexOf("HoldingMoveContextCard")).toBeLessThan(
      files.holdingPage.indexOf("Position Summary"),
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
      const source = readFileSync(path.resolve(process.cwd(), file), "utf8");
      expect(source).not.toMatch(/executeEodhdApiCall/);
      expect(source).not.toMatch(/ETF_Data/);
      expect(source).not.toMatch(/openai/i);
      expect(source).not.toMatch(/setInterval\s*\(/);
      expect(source).not.toMatch(/\bfetch\s*\(/);
    }
  });
});
