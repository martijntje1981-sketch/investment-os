import { describe, expect, it } from "vitest";

import {
  buildAnalystActionsFromNewsItems,
  dedupeAnalystNews,
  detectAnalystEvent,
  filterPortfolioAnalystNews,
  isAnalystRelatedNews,
  shouldShowAnalystDashboardCard,
} from "@/lib/services/news/analystNews";
import type { NewsContentItem } from "@/lib/types/newsContent";

function item(title: string, symbol = "AAPL", id = crypto.randomUUID()): NewsContentItem {
  return {
    id,
    title,
    sourceName: "Test Source",
    sourceType: "news",
    canonicalUrl: "https://example.com",
    thumbnailUrl: null,
    publishedAt: "2026-07-20T08:00:00.000Z",
    description: title,
    aiSummary: title,
    whyThisMatters: "Test",
    impactLevel: "Medium Impact",
    matchedHoldingIds: ["1"],
    matchedSymbols: [symbol],
    relevanceLabel: null,
    category: "equities",
    contentTypeLabel: "News",
    fetchedAt: "2026-07-20T08:00:00.000Z",
    relevanceScore: 10,
  };
}

describe("analystNews", () => {
  it("detects analyst event labels", () => {
    expect(detectAnalystEvent("Goldman upgrades AAPL to Buy")).toEqual({
      actionType: "upgrade",
      label: "Upgrade",
    });
    expect(detectAnalystEvent("Analyst cuts price target on AAPL")).toEqual({
      actionType: "target_decrease",
      label: "Price target decrease",
    });
  });

  it("filters and deduplicates analyst stories", () => {
    const filtered = filterPortfolioAnalystNews([
      item("Goldman upgrades AAPL to Buy from Hold"),
      item("Goldman upgrades AAPL to Buy from Hold"),
      item("Macro inflation report published", "VWCE"),
    ]);

    expect(filtered).toHaveLength(1);
    expect(isAnalystRelatedNews(filtered[0]!)).toBe(true);
  });

  it("dedupes repeated analyst actions", () => {
    const deduped = dedupeAnalystNews([
      item("Same upgrade headline", "AAPL", "a"),
      item("Same upgrade headline", "AAPL", "b"),
      item("Different downgrade headline", "AAPL", "c"),
    ]);

    expect(deduped).toHaveLength(2);
  });

  it("builds normalized analyst actions from news items", () => {
    const actions = buildAnalystActionsFromNewsItems(
      [
        item("Morgan Stanley raises price target on AAPL from 180 to 210"),
      ],
      [{ symbol: "AAPL", name: "Apple" }],
    );

    expect(actions).toHaveLength(1);
    expect(actions[0]?.actionType).toBe("target_increase");
    expect(actions[0]?.symbol).toBe("AAPL");
    expect(actions[0]?.whyItMatters).toContain("AAPL");
  });

  it("controls dashboard card visibility", () => {
    expect(shouldShowAnalystDashboardCard({ hasMeaningfulCoverage: true })).toBe(
      true,
    );
    expect(shouldShowAnalystDashboardCard({ hasMeaningfulCoverage: false })).toBe(
      false,
    );
  });
});
