/**
 * First-run experience helpers and Dashboard discoverability contracts.
 */

import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  dismissExampleFirstRunCue,
  isExamplePrepComplete,
  markExamplePrepComplete,
  resolveExamplePrepStage,
  shouldShowExampleFirstRunCue,
} from "@/lib/client/exampleFirstRun";
import { formatExampleBannerLabel } from "@/lib/services/examplePortfolio/types";

function read(relativePath: string) {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("example first-run markers", () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => {
          store.set(key, value);
        },
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("marks preparation complete idempotently and skips cue after dismiss", () => {
    const userSub = "user-example-1";
    expect(isExamplePrepComplete(userSub)).toBe(false);
    markExamplePrepComplete(userSub);
    expect(isExamplePrepComplete(userSub)).toBe(true);
    markExamplePrepComplete(userSub);
    expect(isExamplePrepComplete(userSub)).toBe(true);

    expect(shouldShowExampleFirstRunCue(userSub)).toBe(true);
    dismissExampleFirstRunCue(userSub);
    expect(shouldShowExampleFirstRunCue(userSub)).toBe(false);
  });

  it("advances prep stages without fake percentages", () => {
    expect(resolveExamplePrepStage(0, false)).toBe("holdings");
    expect(resolveExamplePrepStage(900, false)).toBe("prices");
    expect(resolveExamplePrepStage(1800, true)).toBe("scores");
    expect(resolveExamplePrepStage(2300, true)).toBe("insights");
    expect(resolveExamplePrepStage(2600, true)).toBe("done");
  });
});

describe("example banner labels for remaining days", () => {
  it("uses Expires tomorrow and multi-day remaining labels", () => {
    expect(
      formatExampleBannerLabel(
        "2026-08-10T10:00:00.000Z",
        new Date("2026-08-03T10:00:00.000Z"),
      ),
    ).toBe("Example portfolio · 7 days remaining");
    expect(
      formatExampleBannerLabel(
        "2026-08-06T10:00:00.000Z",
        new Date("2026-08-03T10:00:00.000Z"),
      ),
    ).toBe("Example portfolio · 3 days remaining");
  });
});

describe("first-run dashboard wiring", () => {
  it("mounts preparation, first-run cue, and explore tools on Dashboard", () => {
    const dashboard = read("app/dashboard/page.tsx");
    expect(dashboard).toContain("ExamplePortfolioPreparation");
    expect(dashboard).toContain("DashboardFirstRunCue");
    expect(dashboard).toContain("DashboardExploreTools");
    expect(dashboard).toContain("useExampleActiveStatus");
  });

  it("keeps high-value explore routes on Dashboard and in the profile menu", () => {
    const tools = read("components/dashboard/DashboardExploreTools.tsx");
    const routes = read("lib/navigation/appRoutes.ts");
    const menu = read("components/auth/UserMenu.tsx");
    expect(routes).toContain('PORTFOLIO_HEALTH_PATH = "/portfolio-health"');
    expect(routes).toContain('ANALYSIS_PATH = "/analysis"');
    expect(routes).toContain('GOALS_PATH = "/goals"');
    expect(tools).toContain("PORTFOLIO_HEALTH_PATH");
    expect(tools).toContain("ANALYSIS_PATH");
    expect(tools).toContain("GOALS_PATH");
    expect(tools).toContain("/market-pulse");
    expect(tools).toContain("/perspectives");
    expect(tools).toContain("Explore Tobailey");
    expect(tools).toContain(
      "Understand the structure and resilience of your portfolio.",
    );
    expect(tools).toContain("Track progress toward your financial targets.");
    expect(menu).toContain('title="Portfolio"');
    expect(menu).toContain('title="Intelligence"');
    expect(menu).toContain('title="Account"');
    expect(menu).toContain('title="Support"');
    expect(menu).toContain("/portfolio-health");
    expect(menu).toContain("/analysis");
    expect(menu).toContain("Log out");
    expect(menu).toContain("profile-menu-footer");
  });

  it("styles the example banner as premium brand soft, not an error warning", () => {
    const banner = read(
      "components/examplePortfolio/ExamplePortfolioBanner.tsx",
    );
    expect(banner).toContain("bg-brand-soft/95");
    expect(banner).toContain("Keep my portfolio");
    expect(banner).toContain('cache: "no-store"');
    expect(banner).not.toContain("bg-amber-50");
  });

  it("keeps shared tinted surfaces and denser hero tokens", () => {
    const surface = read("components/layout/appSurface.ts");
    const hero = read("components/dashboard/PortfolioValueCard.tsx");
    expect(surface).toContain("appTintedPanelClass");
    expect(surface).toContain("navy-hero-lift");
    expect(hero).toContain("HeroTrendMicroVisual");
    expect(hero).toContain("MoversSection");
  });
});
