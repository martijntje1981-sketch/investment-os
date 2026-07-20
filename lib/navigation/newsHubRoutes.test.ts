import { describe, expect, it } from "vitest";

import {
  ANALYSIS_PATH,
  LEGACY_BRIEFING_PATH,
  MARKET_NEWS_CATEGORY_FILTERS,
  NEWS_HUB_PATH,
  NEWS_HUB_TABS,
  resolveLegacyBriefingRedirect,
} from "@/lib/navigation/newsHubRoutes";

describe("newsHubRoutes", () => {
  it("redirects legacy briefing traffic to the news hub", () => {
    expect(resolveLegacyBriefingRedirect()).toBe(NEWS_HUB_PATH);
    expect(NEWS_HUB_PATH).toBe("/news");
  });

  it("does not create a redirect loop between briefing and news", () => {
    expect(resolveLegacyBriefingRedirect()).toBe("/news");
    expect(resolveLegacyBriefingRedirect()).not.toBe(LEGACY_BRIEFING_PATH);
    expect(ANALYSIS_PATH).not.toBe(NEWS_HUB_PATH);
  });

  it("keeps portfolio analysis on a dedicated route", () => {
    expect(ANALYSIS_PATH).toBe("/analysis");
    expect(LEGACY_BRIEFING_PATH).toBe("/briefing");
  });

  it("uses tabs only for market news and upcoming events", () => {
    expect(NEWS_HUB_TABS.map((tab) => tab.id)).toEqual(["market", "events"]);
  });

  it("defines market category filters", () => {
    expect(MARKET_NEWS_CATEGORY_FILTERS.map((filter) => filter.id)).toEqual([
      "all",
      "macro",
      "equities",
      "crypto",
      "commodities",
      "geopolitics",
    ]);
  });
});
