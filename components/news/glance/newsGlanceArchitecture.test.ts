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
  const aroundMarkets = read("components/news/glance/NewsAroundTheMarkets.tsx");
  const biggerBlock = read("components/news/glance/NewsBiggerPictureBlock.tsx");
  const deepLink = read("lib/client/useSectionDeepLink.ts");

  it("keeps primary News to holdings, around the markets, then conditional intelligence and Explore", () => {
    const intro = page.indexOf("<NewsIntro");
    const primary = page.indexOf('data-testid="news-primary"');
    const holdingsIdx = page.indexOf("<NewsHoldingsBlock");
    const around = page.indexOf("<NewsAroundTheMarkets");
    const bigger = page.indexOf("<NewsBiggerPictureBlock");
    const synthesis = page.indexOf("<NewsSynthesisBlock");
    const exploreIdx = page.indexOf("<NewsExploreNav");

    expect(intro).toBeGreaterThan(-1);
    expect(primary).toBeGreaterThan(intro);
    expect(holdingsIdx).toBeGreaterThan(primary);
    expect(around).toBeGreaterThan(holdingsIdx);
    expect(bigger).toBeGreaterThan(around);
    expect(synthesis).toBeGreaterThan(bigger);
    expect(exploreIdx).toBeGreaterThan(synthesis);
    expect(page).toContain("glance.biggerPicture.length > 0");
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

  it("caps the mobile holdings glance and keeps View all holding news", () => {
    expect(holdings).toContain("NEWS_GLANCE_HOLDING_LIMIT_MOBILE");
    expect(holdings).toContain("data-mobile-limit={NEWS_GLANCE_HOLDING_LIMIT_MOBILE}");
    expect(holdings).toContain("View all holding news →");
    expect(holdings).toContain("news-holdings-view-all");
    expect(holdings).toContain("NEWS_EXPLORE_DESTINATIONS.holdings");
    expect(holdings).toContain("hidden lg:list-item");
  });

  it("reuses Markets Today for Around the Markets and never invents a percent", () => {
    expect(glance).toContain("briefing.marketsToday");
    expect(glance).toContain("clampMarketsTodayText");
    expect(glance).toContain("NEWS_MARKETS_TODAY_HREF");
    expect(glance).not.toContain("fetch(");
    expect(aroundMarkets).toContain("overflow-x-auto");
    expect(aroundMarkets).toContain("overflow-x-clip");
    expect(aroundMarkets).toContain("data-region={tile.id}");
    expect(aroundMarkets).toContain("tile.href");
  });

  it("omits empty Bigger Picture instead of rendering a placeholder card", () => {
    expect(biggerBlock).toContain("if (items.length === 0) return null");
    expect(biggerBlock).not.toContain("No meaningful broader context");
    expect(page).not.toContain("No meaningful broader context");
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
