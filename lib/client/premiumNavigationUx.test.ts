/**
 * Premium navigation / discoverability contracts for the focused UX phase.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

function read(relativePath: string) {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("premium navigation and visual discovery", () => {
  it("keeps mobile menu scroll isolation and a fixed logout footer", () => {
    const menu = read("components/auth/UserMenu.tsx");
    const dismissible = read("lib/client/useDismissibleMenu.ts");

    expect(dismissible).toContain('body.style.position = "fixed"');
    expect(dismissible).toContain(
      'documentElement.style.overscrollBehavior = "none"',
    );
    expect(menu).toContain("createPortal");
    expect(menu).toContain("profile-menu-footer");
    expect(menu).toContain("Signed in as");
    expect(menu).toContain("Log out");
    expect(menu).toContain("overscroll-contain");
    expect(menu).toContain("var(--bottom-nav-height)");
    expect(menu).toContain("z-[80]");
    const scrollIdx = menu.indexOf('data-testid="profile-menu-scroll"');
    const footerIdx = menu.indexOf('data-testid="profile-menu-footer"');
    const logoutIdx = menu.indexOf("Log out");
    expect(scrollIdx).toBeGreaterThan(-1);
    expect(footerIdx).toBeGreaterThan(scrollIdx);
    expect(logoutIdx).toBeGreaterThan(footerIdx);
  });

  it("surfaces Understand destinations on the Dashboard", () => {
    const tools = read("components/dashboard/DashboardExploreTools.tsx");
    const dashboard = read("app/dashboard/page.tsx");

    expect(dashboard).toContain("DashboardExploreTools");
    expect(tools).toContain("Understand your portfolio");
    expect(tools).toContain("Analysis");
    expect(tools).toContain("Goals");
    expect(tools).toContain("Portfolio Scorecard");
    expect(tools).toContain("GOALS_PATH");
    expect(tools).toContain("ANALYSIS_PATH");
    expect(tools).toContain("PORTFOLIO_HEALTH_PATH");
    expect(tools).toContain("min-[390px]:grid-cols-3");
  });

  it("keeps lighter navy hero tokens and tinted shared surfaces", () => {
    const globals = read("app/globals.css");
    const surface = read("components/layout/appSurface.ts");
    const pageHero = read("components/layout/PageHero.tsx");

    expect(globals).toContain("--navy-hero-lift:");
    expect(globals).toContain("--background: #eef3f8");
    expect(surface).toContain("appTintedPanelClass");
    expect(surface).toContain("bg-navy-hero");
    expect(pageHero).toContain("appHeroShellClass");
    expect(pageHero).toContain("py-4");
  });
});
