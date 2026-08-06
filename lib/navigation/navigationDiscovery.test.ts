import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { isBottomNavItemActive } from "@/components/home/bottomNavActive";
import {
  DISCOVER_DESTINATIONS,
  isDiscoverHrefActive,
  isMoreNavPathActive,
  MARKET_PULSE_PATH,
  NEWS_MARKETS_TODAY_HREF,
  PERSPECTIVES_PATH,
  SUPPORTED_INSTRUMENTS_PATH,
} from "@/lib/navigation/discoverDestinations";
import { PORTFOLIO_HISTORY_PATH } from "@/lib/navigation/appRoutes";
import { MARKETS_TODAY_REGION_ORDER } from "@/lib/services/news/marketsTodayRegionalClassification";
import { buildMarketsTodayRegions } from "@/lib/services/news/newsMarketsToday";

function read(relativePath: string) {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("navigation discovery", () => {
  it("desktop Discover menu renders the expected destinations once", () => {
    const menu = read("components/auth/UserMenu.tsx");
    const config = read("lib/navigation/discoverDestinations.ts");

    expect(menu).toContain("desktop-discover-trigger");
    expect(menu).toContain("desktop-discover-menu");
    expect(menu).toContain("desktop-primary-nav");
    expect(menu).toContain("DISCOVER_DESTINATIONS");
    expect(menu).toContain("Dashboard");
    expect(menu).toContain("Portfolio");
    expect(menu).toContain("Analysis");
    expect(menu).toContain('label: "News"');
    expect(menu).toContain("Goals");

    const hrefs = DISCOVER_DESTINATIONS.map((item) => item.href);
    expect(hrefs).toContain(NEWS_MARKETS_TODAY_HREF);
    expect(hrefs).toContain(MARKET_PULSE_PATH);
    expect(hrefs).toContain(PERSPECTIVES_PATH);
    expect(hrefs).toContain(PORTFOLIO_HISTORY_PATH);
    expect(hrefs).toContain(SUPPORTED_INSTRUMENTS_PATH);
    expect(new Set(hrefs).size).toBe(hrefs.length);
    expect(config).toContain("Global market briefing");
  });

  it("mobile More menu groups Discover destinations without dropping primary access", () => {
    const bottom = read("components/home/BottomNav.tsx");

    expect(bottom).toContain("bottom-nav-more-trigger");
    expect(bottom).toContain("bottom-nav-more-panel");
    expect(bottom).toContain("DISCOVER_DESTINATIONS");
    expect(bottom).toContain("grid-cols-5");
    expect(bottom).toContain('label: "News"');
    expect(bottom).toContain("Dashboard");
    expect(bottom).toContain("Portfolio");
    expect(bottom).toContain("Analysis");
    expect(bottom).toContain("More");
    expect(bottom).toContain("Discover");
    expect(bottom).toContain("Workspace");
    expect(bottom).toContain(GOALS_IN_MORE);
  });

  it("indicates active routes for primary, discover and more destinations", () => {
    expect(isBottomNavItemActive("/dashboard", "/dashboard")).toBe(true);
    expect(isBottomNavItemActive("/news", "/news")).toBe(true);
    expect(isDiscoverHrefActive("/market-pulse", MARKET_PULSE_PATH)).toBe(true);
    expect(isDiscoverHrefActive("/news", NEWS_MARKETS_TODAY_HREF)).toBe(true);
    expect(isMoreNavPathActive("/goals")).toBe(true);
    expect(isMoreNavPathActive("/portfolio-history")).toBe(true);
    expect(isMoreNavPathActive("/news")).toBe(false);
    expect(isMoreNavPathActive("/dashboard")).toBe(false);
  });

  it("keeps guest explore destinations separate from authenticated primary nav", () => {
    const menu = read("components/auth/UserMenu.tsx");
    const bottom = read("components/home/BottomNav.tsx");

    expect(menu).toContain("guestExploreLinks");
    expect(menu).toContain('href: "/explore"');
    expect(bottom).toContain("guestItems");
    expect(bottom).toContain('href: "/perspectives"');
    expect(bottom).toContain('href: "/login"');
    expect(bottom).toContain("grid-cols-4");
  });

  it("does not hide demo/trial controls inside navigation menus", () => {
    const banner = read("components/examplePortfolio/ExamplePortfolioBanner.tsx");
    const menu = read("components/auth/UserMenu.tsx");
    const bottom = read("components/home/BottomNav.tsx");

    expect(banner).toContain("example-portfolio-banner");
    expect(banner).toContain("Upgrade");
    expect(banner).toContain("TRIAL_UPGRADE_HREF");
    expect(menu).not.toContain("example-portfolio-banner");
    expect(bottom).not.toContain("example-portfolio-banner");
  });

  it("wires contextual discovery links to existing routes", () => {
    const tools = read("components/dashboard/DashboardExploreTools.tsx");
    const pulse = read("components/dashboard/DashboardMarketPulseCard.tsx");
    const perspectives = read(
      "components/perspectives/DashboardPerspectivesCard.tsx",
    );
    const newsLinks = read("components/news/NewsBriefingIntelligence.tsx");
    const marketsToday = read("components/news/NewsMarketsTodaySection.tsx");

    expect(tools).toContain("NEWS_MARKETS_TODAY_HREF");
    expect(tools).toContain("Markets Today");
    expect(tools).toContain("SUPPORTED_INSTRUMENTS_PATH");
    expect(tools).toContain("Portfolio History");
    expect(pulse).toContain('href="/market-pulse"');
    expect(perspectives).toContain('href="/perspectives"');
    expect(newsLinks).toContain('href="/perspectives"');
    expect(newsLinks).toContain('href="/discover"');
    expect(marketsToday).toContain('id="markets-today"');
  });

  it("keeps Markets Today regional order and avoids duplicate discover hrefs", () => {
    const regions = buildMarketsTodayRegions({ items: [] });
    expect(regions.map((region) => region.id)).toEqual([
      ...MARKETS_TODAY_REGION_ORDER,
    ]);
    expect(regions.map((region) => region.label)).toEqual([
      "Global",
      "Europe",
      "United States",
      "Asia",
      "Crypto",
    ]);

    const hrefs = DISCOVER_DESTINATIONS.map((item) => item.href);
    expect(hrefs.filter((href) => href === MARKET_PULSE_PATH)).toHaveLength(1);
    expect(hrefs.filter((href) => href === PERSPECTIVES_PATH)).toHaveLength(1);
  });
});

const GOALS_IN_MORE = 'href: GOALS_PATH';
