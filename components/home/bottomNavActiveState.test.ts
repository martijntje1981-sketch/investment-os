import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

import { isBottomNavItemActive } from "@/components/home/bottomNavActive";
import { isMoreNavPathActive } from "@/lib/navigation/discoverDestinations";

describe("bottom navigation active state", () => {
  const source = readFileSync(
    path.resolve(process.cwd(), "components/home/BottomNav.tsx"),
    "utf8",
  );

  it("keeps authenticated primary workflow destinations and guest explore destinations", () => {
    expect(source).toContain("authenticatedItems");
    expect(source).toContain("DASHBOARD_PATH");
    expect(source).toContain("PORTFOLIO_PATH");
    expect(source).toContain("ANALYSIS_PATH");
    expect(source).toContain('label: "News"');
    expect(source).toContain("bottom-nav-more-trigger");
    expect(source).toContain("href: PORTFOLIO_PATH");
    expect(source).toContain("guestItems");
    expect(source).toContain('href: "/perspectives"');
    expect(source).toContain('href: "/news"');
    expect(source).toContain('href: "/supported-instruments"');
    expect(source).toContain('href: "/login"');
    expect(source).toContain("moreWorkspaceLinks");
    expect(source).toContain("DISCOVER_DESTINATIONS");
    expect(source).toContain("grid-cols-5");
    expect(source).toContain("grid-cols-4");
  });

  it("highlights only the matching main route", () => {
    expect(isBottomNavItemActive("/dashboard", "/dashboard")).toBe(true);
    expect(isBottomNavItemActive("/news", "/dashboard")).toBe(false);
    expect(isBottomNavItemActive("/portfolio", "/portfolio")).toBe(true);
    expect(isBottomNavItemActive("/portfolio/vwce", "/portfolio")).toBe(true);
    expect(isBottomNavItemActive("/analysis", "/analysis")).toBe(true);
    expect(isBottomNavItemActive("/news", "/news")).toBe(true);
    expect(isMoreNavPathActive("/goals")).toBe(true);
    expect(isMoreNavPathActive("/news")).toBe(false);
  });

  it("uses shared active styling tokens", () => {
    expect(source).toContain('aria-current={active ? "page" : undefined}');
    expect(source).toContain("bg-brand-soft text-brand-navy");
    expect(source).toContain(
      "text-slate-600 hover:bg-slate-50 hover:text-brand-navy",
    );
  });
});
