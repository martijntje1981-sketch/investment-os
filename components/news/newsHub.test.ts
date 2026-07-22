import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("news hub UI structure", () => {
  it("uses a premium briefing hierarchy with compact sections", () => {
    const hubSource = readFileSync(
      path.resolve(process.cwd(), "components/news/NewsHubContent.tsx"),
      "utf8",
    );
    const newsPage = readFileSync(
      path.resolve(process.cwd(), "app/news/page.tsx"),
      "utf8",
    );

    const sectionSource = readFileSync(
      path.resolve(process.cwd(), "components/news/NewsBriefingSection.tsx"),
      "utf8",
    );

    expect(hubSource).toContain("NewsBriefingIntelligence");
    expect(hubSource).toContain("NewsBriefingSection");
    expect(hubSource).toContain("NewsCompactVideoRow");
    expect(hubSource).toContain("NewsHoldingGroups");
    expect(sectionSource).toContain("Show more");
    expect(hubSource).not.toContain("PortfolioIntelligencePanel");
    expect(hubSource).not.toContain("NewsHubTabs");
    expect(hubSource).not.toContain("matchMedia");
    expect(hubSource).not.toContain("PortfolioNewsPreview");
    expect(newsPage).not.toContain("BottomNavigation");
    expect(newsPage).toContain("max-w-3xl");
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
  });

  it("uses compact video rows instead of large aspect-video cards in the hub", () => {
    const videoRow = readFileSync(
      path.resolve(process.cwd(), "components/news/NewsCompactVideoRow.tsx"),
      "utf8",
    );

    expect(videoRow).toContain("h-14 w-20");
    expect(videoRow).not.toContain("aspect-video");
  });

  it("redirects legacy /briefing to /news", () => {
    const source = readFileSync(
      path.resolve(process.cwd(), "app/briefing/page.tsx"),
      "utf8",
    );

    expect(source).toContain("redirect(");
    expect(source).toContain("resolveLegacyBriefingRedirect");
  });

  it("routes bottom navigation news item to /news", () => {
    const source = readFileSync(
      path.resolve(process.cwd(), "components/home/BottomNav.tsx"),
      "utf8",
    );

    expect(source).toContain('href: "/news"');
    expect(source).toContain('label: "News"');
  });
});

describe("news safety boundaries", () => {
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
