import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { DASHBOARD_DEEP_LINKS } from "@/lib/navigation/deepLinks";
import { NEWS_MARKETS_TODAY_HREF } from "@/lib/navigation/discoverDestinations";
import {
  NEWS_EXPLORE_DESTINATIONS,
  resolveNewsDetailId,
} from "@/lib/services/newsGlance";
import { NEWS_EXPLORE_ITEM_HREFS } from "@/components/news/glance/newsExploreCatalog";

function read(relativePath: string): string {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("News glance architecture", () => {
  const page = read("app/news/page.tsx");
  const explore = read("components/news/glance/NewsExploreNav.tsx");
  const detail = read("components/news/glance/NewsDetailView.tsx");
  const holdings = read("components/news/glance/NewsHoldingsBlock.tsx");
  const thumbnail = read("components/news/NewsMediaThumbnail.tsx");
  const fallback = read("components/news/newsMediaFallback.ts");
  const glance = read("lib/services/newsGlance/buildNewsGlance.ts");
  const deepLink = read("lib/client/useSectionDeepLink.ts");

  it("keeps primary News to holdings, bigger picture, optional synthesis, then Explore", () => {
    const intro = page.indexOf("<NewsIntro");
    const primary = page.indexOf('data-testid="news-primary"');
    const holdingsIdx = page.indexOf("<NewsHoldingsBlock");
    const bigger = page.indexOf("<NewsBiggerPictureBlock");
    const synthesis = page.indexOf("<NewsSynthesisBlock");
    const exploreIdx = page.indexOf("<NewsExploreNav");

    expect(intro).toBeGreaterThan(-1);
    expect(primary).toBeGreaterThan(intro);
    expect(holdingsIdx).toBeGreaterThan(primary);
    expect(bigger).toBeGreaterThan(holdingsIdx);
    expect(synthesis).toBeGreaterThan(bigger);
    expect(exploreIdx).toBeGreaterThan(synthesis);
    expect(page).toContain("glance.synthesis ?");
    expect(page).not.toContain("<PageHero");
    expect(page).not.toContain("AuthenticatedFourQuestionsNav");
    expect(page).toContain('canvas="news"');
  });

  it("does not render the full hub in the primary flow", () => {
    const primary = page.slice(
      page.indexOf('data-testid="news-primary"'),
      page.indexOf("<NewsExploreNav"),
    );
    expect(primary).not.toContain("NewsHubContent");
    expect(primary).not.toContain("NewsBriefingIntelligence");
    expect(primary).not.toContain("NewsMarketBriefSection");
    expect(primary).not.toContain("NewsForPortfolioSection");
    expect(primary).not.toContain("NewsMarketsTodaySection");
  });

  it("preserves existing News destinations behind Explore and detail hashes", () => {
    expect(detail).toContain("NewsHubContent");
    expect(explore).toContain("NEWS_EXPLORE_DESTINATIONS.holdings");
    expect(explore).toContain("NEWS_EXPLORE_DESTINATIONS.marketsToday");
    expect(explore).toContain("NEWS_EXPLORE_DESTINATIONS.search");
    expect(explore).toContain("NEWS_EXPLORE_DESTINATIONS.macro");
    expect(explore).toContain("NEWS_EXPLORE_DESTINATIONS.perspectives");
    expect(NEWS_EXPLORE_DESTINATIONS.marketsToday).toBe(NEWS_MARKETS_TODAY_HREF);
    expect(NEWS_EXPLORE_DESTINATIONS.marketBrief).toBe(
      DASHBOARD_DEEP_LINKS.marketBriefing,
    );
    expect(NEWS_EXPLORE_DESTINATIONS.holdings).toBe(
      DASHBOARD_DEEP_LINKS.portfolioNews,
    );
    expect(NEWS_EXPLORE_ITEM_HREFS).toContain(NEWS_EXPLORE_DESTINATIONS.events);
    expect(resolveNewsDetailId("markets-today")).toBe("markets-today");
    expect(resolveNewsDetailId("news-market-brief")).toBe("news-market-brief");
    expect(resolveNewsDetailId("portfolio-news")).toBe("portfolio-news");
    expect(resolveNewsDetailId("news-search")).toBe("news-search");
    expect(resolveNewsDetailId("news-macro")).toBe("news-macro");
    expect(resolveNewsDetailId("news-videos")).toBe("news-videos");
  });

  it("opens original articles via canonical URLs and designed fallback media", () => {
    expect(holdings).toContain("row.canonicalUrl");
    expect(holdings).toContain('target="_blank"');
    expect(holdings).toContain('rel="noopener noreferrer"');
    expect(holdings).toContain('surface="onDark"');
    expect(holdings).toContain("allowProviderStoredUrl");
    expect(thumbnail).toContain('data-news-media={showImage ? "thumbnail" : "fallback"}');
    expect(fallback).toContain("NEWS_MEDIA_FALLBACK_TONE_STYLES_ON_DARK");
  });

  it("does not change portfolio writes, pricing, or sync from News UI", () => {
    expect(page).not.toContain("saveHoldings");
    expect(page).not.toContain("useLivePortfolioPriceRefresh");
    expect(page).not.toContain("sync_version");
    expect(glance).not.toContain("saveHoldings");
    expect(glance).not.toContain("fetch(");
    expect(deepLink).not.toContain("saveHoldings");
  });
});
