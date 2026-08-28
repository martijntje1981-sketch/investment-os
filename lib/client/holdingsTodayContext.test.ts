import { describe, expect, it } from "vitest";

import { buildDashboardPortfolioSnapshot } from "@/lib/client/dashboardPortfolioSnapshot";
import {
  HOLDINGS_TODAY_COLLAPSE_AFTER,
  HOLDINGS_TODAY_NO_NEWS,
  buildHoldingsTodayNewsById,
} from "@/lib/client/holdingsTodayContext";
import { NEWS_HUB_HOLDING_LIMIT } from "@/lib/services/holdingIntelligence/newsHubRows";
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
    currentPrice: overrides.currentPrice ?? 110,
    currency: "EUR",
    assetType: overrides.assetType ?? "investment",
    previousClose: overrides.previousClose ?? 100,
    ...overrides,
  };
}

function newsItem(
  overrides: Partial<NewsContentItem> &
    Pick<NewsContentItem, "id" | "title" | "matchedHoldingIds">,
): NewsContentItem {
  return {
    sourceName: "Test Wire",
    sourceType: "news",
    canonicalUrl: `https://example.test/${overrides.id}`,
    thumbnailUrl: null,
    publishedAt: "2026-08-18T10:00:00.000Z",
    description: overrides.title,
    summary: overrides.title,
    interpretation: "",
    impactLevel: "Medium Impact",
    matchedSymbols: [],
    matchedHoldings: [],
    relevanceLabel: null,
    category: "markets",
    marketCategory: "general",
    contentTypeLabel: "News",
    fetchedAt: "2026-08-18T12:00:00.000Z",
    relevanceScore: 24,
    ...overrides,
  };
}

describe("holdings today news pairing", () => {
  it("covers every snapshot holding, including those beyond the news-hub cap", () => {
    const holdings = Array.from({ length: NEWS_HUB_HOLDING_LIMIT + 3 }, (_, index) =>
      holding({
        symbol: `H${index}`,
        quantity: 1 + index,
        currentPrice: 20,
        previousClose: 19,
      }),
    );
    holdings.push(
      holding({
        symbol: "CASH",
        assetType: "cash",
        quantity: 500,
        currentPrice: 1,
        purchasePrice: 1,
        previousClose: undefined,
      }),
    );

    const snapshot = buildDashboardPortfolioSnapshot(holdings, null, false);
    const newsById = buildHoldingsTodayNewsById(
      snapshot.marketHoldings,
      holdings,
      [],
    );

    expect(snapshot.marketHoldings.length).toBeGreaterThan(NEWS_HUB_HOLDING_LIMIT);
    expect(newsById.size).toBe(snapshot.marketHoldings.length);
    expect(HOLDINGS_TODAY_COLLAPSE_AFTER).toBeGreaterThan(NEWS_HUB_HOLDING_LIMIT);

    for (const row of snapshot.marketHoldings) {
      const context = newsById.get(row.id);
      expect(context).toBeDefined();
      if (row.assetType === "cash") {
        expect(context?.isCash).toBe(true);
        expect(context?.href).toBeNull();
        expect(context?.emptyLabel).toBeNull();
      } else {
        expect(context?.emptyLabel).toBe(HOLDINGS_TODAY_NO_NEWS);
        expect(context?.href).toBeNull();
      }
    }
  });

  it("links direct holding news to the original article and does not invent a headline", () => {
    const aifs = holding({
      symbol: "AIFS",
      name: "WisdomTree AI Infrastructure",
      currentPrice: 12,
      previousClose: 10,
    });
    const nukl = holding({
      symbol: "NUKL",
      name: "VanEck Uranium",
      currentPrice: 9,
      previousClose: 10,
    });
    const holdings = [aifs, nukl];
    const snapshot = buildDashboardPortfolioSnapshot(holdings, null, false);
    const newsById = buildHoldingsTodayNewsById(snapshot.marketHoldings, holdings, [
      newsItem({
        id: "aifs-story",
        title: "AI infrastructure stocks rise after data-centre demand",
        matchedHoldingIds: [aifs.id],
        matchedSymbols: ["AIFS"],
      }),
    ]);

    const aifsNews = newsById.get(aifs.id);
    expect(aifsNews?.headline).toBe(
      "AI infrastructure stocks rise after data-centre demand",
    );
    expect(aifsNews?.href).toBe("https://example.test/aifs-story");
    expect(aifsNews?.sourceName).toBe("Test Wire");

    const nuklNews = newsById.get(nukl.id);
    expect(nuklNews?.headline).toBeNull();
    expect(nuklNews?.href).toBeNull();
    expect(nuklNews?.emptyLabel).toBe(HOLDINGS_TODAY_NO_NEWS);
  });
});
