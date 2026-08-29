import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relativePath: string): string {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("Dashboard premium visual pass", () => {
  const dashboard = read("app/dashboard/page.tsx");
  const hero = read("components/dashboard/PortfolioValueCard.tsx");
  const sparkline = read("components/dashboard/HeroPerformanceSparkline.tsx");
  const periods = read("components/dashboard/heroTrendPeriods.ts");
  const holdings = read("components/dashboard/HoldingsToday.tsx");
  const row = read("components/dashboard/HoldingsTodayRow.tsx");
  const intelligence = read(
    "components/dashboard/DashboardPersonalIntelligence.tsx",
  );
  const context = read("lib/client/holdingsTodayContext.ts");
  const thumbnail = read("lib/services/news/newsThumbnail.ts");
  const eodhd = read("lib/services/news/providers/eodhdNewsProvider.ts");
  const surface = read("components/layout/appSurface.ts");
  const header = read("components/auth/UserMenu.tsx");
  const nav = read("components/home/BottomNav.tsx");

  it("keeps Calm Core order and a single personal intelligence block", () => {
    const order = [
      "<DashboardSummary",
      "<HoldingsToday",
      "<DashboardPersonalIntelligence",
      "<DashboardSecondaryNav",
    ].map((token) => dashboard.indexOf(token));
    for (let i = 0; i < order.length; i += 1) {
      expect(order[i]).toBeGreaterThan(-1);
      if (i > 0) expect(order[i]).toBeGreaterThan(order[i - 1]!);
    }
    expect(intelligence).toContain('data-testid="dashboard-personal-intelligence"');
    expect(dashboard).not.toContain("<FourQuestionsSection");
  });

  it("uses a Dashboard-only dark canvas and navy hero without restyling other page heroes", () => {
    expect(dashboard).toContain('canvas="dashboard"');
    expect(surface).toContain("appDashboardPageCanvasClass");
    expect(surface).toContain("bg-navy-hero-deep");
    expect(surface).toContain("from-navy-hero-lift to-navy-hero");
    expect(surface).toMatch(
      /export const appHeroShellClass =\s*"[^"]*from-hero-premium-from[^"]*"/,
    );
    expect(hero).toContain("appDashboardHeroShellClass");
    expect(hero).toContain('appearance="onDark"');
  });

  it("removes the 1D hero period and defaults to 1M", () => {
    expect(periods).toContain('["1W", "1M"]');
    expect(periods).toContain('= "1M"');
    expect(sparkline).not.toContain('"1D"');
    expect(sparkline).toContain("HERO_TREND_DEFAULT_PERIOD");
  });

  it("turns holdings into compact news rows with stored thumbnails only", () => {
    expect(holdings).not.toContain("<table");
    expect(row).toContain("NewsMediaThumbnail");
    expect(row).toContain("allowProviderStoredUrl");
    expect(row).toContain("holdings-today-news-link");
    expect(row).toContain("HOLDINGS_TODAY_NO_NEWS");
    expect(row).toContain("holdingDetailPath");
    expect(context).toContain("selectStoredNewsThumbnail");
    expect(thumbnail).toContain("selectStoredNewsThumbnail");
    expect(eodhd).toContain("selectStoredNewsThumbnail");
    expect(eodhd).not.toContain("selectTrustedNewsThumbnailFromUrl");
  });

  it("makes header and bottom navigation dark and compact", () => {
    expect(header).toContain("bg-navy-hero/95");
    expect(header).toContain("h-12");
    expect(header).toContain("pt-[env(safe-area-inset-top,0px)]");
    expect(header).toContain("onDark");
    expect(nav).toContain("bg-navy-hero/95");
    expect(nav).toContain("pb-[env(safe-area-inset-bottom)]");
  });
});
