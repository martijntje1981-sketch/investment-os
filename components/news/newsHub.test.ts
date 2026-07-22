import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { NEWS_HUB_TABS } from "@/lib/navigation/newsHubRoutes";

describe("news hub UI structure", () => {
  it("keeps portfolio always visible and tabs focused on market/events", () => {
    expect(NEWS_HUB_TABS.map((tab) => tab.label)).toEqual([
      "Market News",
      "Upcoming Events",
    ]);
  });

  it("uses a compact mobile portfolio preview without full-card duplication", () => {
    const hubSource = readFileSync(
      path.resolve(process.cwd(), "components/news/NewsHubContent.tsx"),
      "utf8",
    );
    const previewSource = readFileSync(
      path.resolve(process.cwd(), "components/news/PortfolioNewsPreview.tsx"),
      "utf8",
    );

    expect(hubSource).toContain("PortfolioNewsPreview");
    expect(hubSource).toContain('showMobilePreview ? "hidden lg:block" : ""');
    expect(previewSource).toContain("View all portfolio news");
    expect(previewSource).not.toContain("NewsArticleCard");
  });

  it("renders ranked mixed feed instead of a bottom-only video section", () => {
    const hubSource = readFileSync(
      path.resolve(process.cwd(), "components/news/NewsHubContent.tsx"),
      "utf8",
    );

    expect(hubSource).toContain("Latest relevant news");
    expect(hubSource).toContain("NewsFeedItem");
    expect(hubSource).not.toContain("CollapsibleMarketVideos");
  });

  it("redirects legacy /briefing to /news", () => {
    const source = readFileSync(
      path.resolve(process.cwd(), "app/briefing/page.tsx"),
      "utf8",
    );

    expect(source).toContain("redirect(");
    expect(source).toContain("resolveLegacyBriefingRedirect");
    expect(source).not.toContain('redirect("/briefing")');
  });

  it("preserves portfolio analysis on /analysis", () => {
    const source = readFileSync(
      path.resolve(process.cwd(), "app/analysis/page.tsx"),
      "utf8",
    );

    expect(source).toContain("PortfolioAnalysisPage");
  });

  it("always renders the news hub shell even while data is unavailable", () => {
    const newsPage = readFileSync(
      path.resolve(process.cwd(), "app/news/page.tsx"),
      "utf8",
    );

    expect(newsPage).toContain("NewsHubContent");
    expect(newsPage).not.toContain("News could not be loaded.");
  });

  it("routes bottom navigation news item to /news", () => {
    const source = readFileSync(
      path.resolve(process.cwd(), "components/home/BottomNav.tsx"),
      "utf8",
    );

    expect(source).toContain('href: "/news"');
    expect(source).toContain('label: "News"');
  });

  it("keeps quota-safe news search client-side without provider calls", () => {
    const hubSource = readFileSync(
      path.resolve(process.cwd(), "components/news/NewsHubContent.tsx"),
      "utf8",
    );
    const searchSource = readFileSync(
      path.resolve(process.cwd(), "components/news/NewsSearchBar.tsx"),
      "utf8",
    );

    expect(hubSource).toContain("NewsSearchBar");
    expect(hubSource).toContain("filterNewsItems");
    expect(hubSource).not.toContain("fetch(\"/api/news\"");
    expect(searchSource).toContain("NEWS_SEARCH_PLACEHOLDER");
    expect(searchSource).toContain("Escape");
  });

  it("uses compact mobile-friendly search layout without widening the page", () => {
    const searchSource = readFileSync(
      path.resolve(process.cwd(), "components/news/NewsSearchBar.tsx"),
      "utf8",
    );

    expect(searchSource).toContain("min-w-0");
    expect(searchSource).toContain("flex-wrap");
    expect(searchSource).not.toContain("overflow-x-auto");
  });
});

describe("news safety boundaries after phase 3", () => {
  it("keeps portfolio analysis separate from the news hub route", () => {
    const newsPage = readFileSync(
      path.resolve(process.cwd(), "app/news/page.tsx"),
      "utf8",
    );
    const analysisPage = readFileSync(
      path.resolve(process.cwd(), "components/analysis/PortfolioAnalysisPage.tsx"),
      "utf8",
    );

    expect(newsPage).toContain("NewsHubContent");
    expect(newsPage).not.toContain("Portfolio Analysis");
    expect(analysisPage).toContain("Portfolio Analysis");
  });
});
