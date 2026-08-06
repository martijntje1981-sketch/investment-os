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
    expect(hubSource).toContain("NewsMarketBriefSection");
    expect(hubSource).toContain("NewsForPortfolioSection");
    expect(hubSource).toContain("NewsMacroGroupsSection");
    expect(hubSource).toContain("NewsMarketsTodaySection");
    expect(hubSource).toContain("NewsCompactVideoRow");
    expect(hubSource).not.toContain("NewsCompactEventRow");
    expect(hubSource).not.toContain("news-upcoming-events");
    expect(hubSource).not.toContain("Upcoming Events");
    expect(hubSource.indexOf("<NewsMarketsTodaySection")).toBeLessThan(
      hubSource.indexOf("<NewsBriefingDiscoverLink"),
    );
    expect(hubSource.indexOf("<NewsBriefingDiscoverLink")).toBeLessThan(
      hubSource.indexOf("<NewsMarketBriefSection"),
    );
    expect(sectionSource).toContain("Show more");
    expect(sectionSource).toContain("Show less");
    expect(sectionSource).toContain("aria-expanded");
    expect(sectionSource).toContain("aria-controls");
    expect(hubSource).not.toContain("PortfolioIntelligencePanel");
    expect(hubSource).not.toContain("NewsHubTabs");
    expect(hubSource).not.toContain("matchMedia");
    expect(hubSource).not.toContain("PortfolioNewsPreview");
    expect(newsPage).toContain("BottomNavigation");
    expect(newsPage).toContain("PageContainer");
    expect(newsPage).toContain("PageHero");
    expect(newsPage).toContain('title="News"');
  });

  it("uses a premium light portfolio intelligence card with readable headings", () => {
    const intelligenceSource = readFileSync(
      path.resolve(process.cwd(), "components/news/NewsBriefingIntelligence.tsx"),
      "utf8",
    );

    expect(intelligenceSource).toContain("border border-slate-200 bg-white");
    expect(intelligenceSource).toContain("Today&apos;s portfolio summary");
    expect(intelligenceSource).toContain("What matters for your portfolio");
    expect(intelligenceSource).toContain("Top story");
    expect(intelligenceSource).not.toContain("What Matters Today");
    expect(intelligenceSource).not.toContain("Must Watch");
    expect(intelligenceSource).toContain('variant="light"');
    expect(intelligenceSource).not.toContain('variant="dark"');
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

    expect(videoRow).toContain("NewsMediaThumbnail");
    expect(videoRow).toContain('size="small"');
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

  it("keeps News in authenticated primary nav and guest Markets nav", () => {
    const bottomNav = readFileSync(
      path.resolve(process.cwd(), "components/home/BottomNav.tsx"),
      "utf8",
    );
    const userMenu = readFileSync(
      path.resolve(process.cwd(), "components/auth/UserMenu.tsx"),
      "utf8",
    );

    expect(bottomNav).toContain("guestItems");
    expect(bottomNav).toContain("authenticatedItems");
    expect(bottomNav).toContain('href: "/news"');
    expect(bottomNav).toContain('label: "Markets"');
    expect(bottomNav).toContain('label: "News"');
    expect(userMenu).toContain('href: "/news"');
    expect(userMenu).toContain('label: "News"');
    expect(userMenu).toContain("desktop-primary-nav");
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
    expect(newsPage).not.toContain('title="Analysis"');
    expect(analysisPage).toContain('title="Analysis"');
  });
});
