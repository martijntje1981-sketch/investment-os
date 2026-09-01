import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  AUTH_REQUIRED_PREFIXES,
  PUBLIC_APP_PREFIXES,
  isAuthRequiredPath,
  isPublicAppPath,
  resolveAudienceState,
  safeAuthRedirectPath,
} from "@/lib/auth/routeAccess";

function readProjectFile(relativePath: string): string {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("route access matrix", () => {
  it("keeps private portfolio surfaces authenticated", () => {
    for (const route of [
      "/dashboard",
      "/portfolio",
      "/analysis",
      "/upload",
      "/goals",
      "/holding/AAPL",
      "/portfolio-health",
      "/portfolio-history",
      "/events",
      "/settings",
    ]) {
      expect(isAuthRequiredPath(route)).toBe(true);
    }
  });

  it("allows guests on public intelligence routes", () => {
    for (const route of PUBLIC_APP_PREFIXES) {
      expect(isPublicAppPath(route)).toBe(true);
      expect(isAuthRequiredPath(route)).toBe(false);
    }
    expect(isPublicAppPath("/explore")).toBe(true);
  });

  it("does not overlap auth-required and public app prefixes", () => {
    for (const route of PUBLIC_APP_PREFIXES) {
      expect(AUTH_REQUIRED_PREFIXES).not.toContain(route);
    }
  });

  it("sanitizes post-login redirects to avoid loops and open redirects", () => {
    expect(safeAuthRedirectPath("/perspectives")).toBe("/perspectives");
    expect(safeAuthRedirectPath("/login")).toBe("/dashboard");
    expect(safeAuthRedirectPath("/signup?x=1")).toBe("/dashboard");
    expect(safeAuthRedirectPath("//evil.com")).toBe("/dashboard");
    expect(safeAuthRedirectPath("https://evil.com")).toBe("/dashboard");
    expect(safeAuthRedirectPath(null)).toBe("/dashboard");
  });

  it("resolves audience states for guest, empty and holdings users", () => {
    expect(resolveAudienceState({ authenticated: false, holdingsCount: 0 })).toBe(
      "guest",
    );
    expect(resolveAudienceState({ authenticated: true, holdingsCount: 0 })).toBe(
      "authenticated_empty",
    );
    expect(resolveAudienceState({ authenticated: true, holdingsCount: 2 })).toBe(
      "authenticated_holdings",
    );
  });
});

describe("middleware and private API wiring", () => {
  it("middleware uses the shared auth-required helper", () => {
    const source = readProjectFile("lib/supabase/middleware.ts");
    expect(source).toContain("isAuthRequiredPath");
    expect(source).toContain("safeAuthRedirectPath");
    expect(source).toContain("shouldBlockExpiredExampleUser");
    expect(source).not.toContain('"/perspectives"');
    expect(source).not.toContain('"/news"');
  });

  it("keeps portfolio API authenticated", () => {
    const source = readProjectFile("app/api/portfolio/route.ts");
    expect(source).toContain("getUser");
    expect(source).toContain("assertExamplePortfolioApiAccess");
    expect(source).toContain("accessGuard");
    const navSnapshot = readProjectFile(
      "app/api/portfolio/nav-snapshot/route.ts",
    );
    expect(navSnapshot).toContain("getUser");
    expect(navSnapshot).toContain("assertExamplePortfolioApiAccess");
  });

  it("login honors next redirect destination", () => {
    const source = readProjectFile("app/auth/actions.ts");
    expect(source).toContain("safeAuthRedirectPath");
    expect(source).toContain('formData.get("next")');
  });

  it("dashboard zero-holdings path uses portfolio setup onboarding", () => {
    const source = readProjectFile("app/dashboard/page.tsx");
    expect(source).toContain("DashboardEmptyState");
    expect(source).toContain("needsPortfolioSetup");
  });

  it("holdings-required empty guide points users to add holdings and explore", () => {
    const source = readProjectFile("components/onboarding/EmptyPortfolioGuide.tsx");
    expect(source).toContain("holdingsRequiredBody");
    expect(source).toContain("PORTFOLIO_SETUP_ROUTES.import");
    expect(source).toContain("Add manually");
  });

  it("exposes guest chrome on public routes without duplicating guest pages", () => {
    const bottomNav = readProjectFile("components/home/BottomNav.tsx");
    const userMenu = readProjectFile("components/auth/UserMenu.tsx");
    const perspectives = readProjectFile("components/perspectives/PerspectivesPage.tsx");
    const news = readProjectFile("app/news/page.tsx");
    const pulse = readProjectFile("components/marketPulse/MarketPulsePage.tsx");
    const explore = readProjectFile("app/explore/page.tsx");
    const marketingHeader = readProjectFile("components/marketing/MarketingHeader.tsx");
    const landing = readProjectFile("app/page.tsx");

    expect(bottomNav).toContain("guestItems");
    expect(bottomNav).toContain('href: "/perspectives"');
    expect(bottomNav).toContain("NEWS_PATH");
    expect(bottomNav).toContain('href: "/supported-instruments"');
    expect(bottomNav).toContain('href: "/login"');
    expect(bottomNav).not.toMatch(/guestItems[\s\S]*href: "\/dashboard"/);
    expect(userMenu).toContain("GuestHeader");
    expect(userMenu).toContain("Get started");
    expect(perspectives).toContain("MakeTobaileyYoursCard");
    expect(news).toContain("MakeTobaileyYoursCard");
    expect(pulse).toContain("MakeTobaileyYoursCard");
    expect(explore).toContain("startExamplePortfolio");
    expect(explore).toContain("PUBLIC_EXPLORE_DESTINATIONS");
    expect(explore).toContain("Demo Portfolio");
    expect(explore).toContain("Create your own portfolio");
    expect(explore).toContain("/signup?intent=trial");
    expect(marketingHeader).toContain("Explore");
    expect(marketingHeader).toContain("PUBLIC_EXPLORE_DESTINATIONS");
    expect(marketingHeader).toContain("Start with Complete");
    expect(landing).toContain("Start with 14 days of Complete");
    expect(landing).toContain("Explore Demo Portfolio");
    expect(landing).toContain('href="/explore"');
    expect(landing).not.toContain("Explore the dashboard");
  });

  it("does not request private portfolio APIs from guest-safe news helpers", () => {
    const portfolioNews = readProjectFile("lib/client/portfolioNews.ts");
    const usePortfolio = readProjectFile("lib/client/useUserPortfolio.ts");

    expect(portfolioNews).toContain("if (!userSub)");
    expect(portfolioNews).toContain('fetch("/api/news"');
    expect(portfolioNews).not.toContain("/api/portfolio");
    expect(usePortfolio).toContain("if (!userSub)");
    expect(usePortfolio).toContain("setPortfolioReady(true)");
  });

  it("conversion card hides for personalized holdings users", () => {
    const card = readProjectFile("components/conversion/MakeTobaileyYoursCard.tsx");
    const copy = readProjectFile("lib/client/conversionCopy.ts");
    expect(card).toContain('if (audience === "authenticated_holdings") return null');
    expect(copy).toContain('headline: "Make Tobailey yours"');
  });
});
