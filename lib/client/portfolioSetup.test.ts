import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  DEMO_PORTFOLIO_ENABLED,
  needsPortfolioSetup,
  PORTFOLIO_SETUP_COPY,
  PORTFOLIO_SETUP_ROUTES,
  SUPPORTED_PORTFOLIO_INPUT_METHODS,
  markPortfolioSetupCompleted,
  readPortfolioSetupCompleted,
  resolvePortfolioSetupVariant,
  portfolioSetupCompletedKey,
} from "@/lib/client/portfolioSetup";

function readProjectFile(relativePath: string): string {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("needsPortfolioSetup", () => {
  it("shows onboarding for authenticated users with zero holdings when ready", () => {
    expect(
      needsPortfolioSetup({
        authenticated: true,
        holdingsCount: 0,
        portfolioReady: true,
        syncLoading: false,
      }),
    ).toBe(true);
  });

  it("hides onboarding when the user has holdings", () => {
    expect(
      needsPortfolioSetup({
        authenticated: true,
        holdingsCount: 3,
        portfolioReady: true,
      }),
    ).toBe(false);
  });

  it("waits while portfolio or sync is still loading", () => {
    expect(
      needsPortfolioSetup({
        authenticated: true,
        holdingsCount: 0,
        portfolioReady: false,
      }),
    ).toBe(false);
    expect(
      needsPortfolioSetup({
        authenticated: true,
        holdingsCount: 0,
        portfolioReady: true,
        syncLoading: true,
      }),
    ).toBe(false);
  });

  it("never shows onboarding for unauthenticated visitors", () => {
    expect(
      needsPortfolioSetup({
        authenticated: false,
        holdingsCount: 0,
        portfolioReady: true,
      }),
    ).toBe(false);
  });
});

describe("portfolio setup completion marker", () => {
  const userSub = "user-setup-test";

  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("marks setup complete and switches to returning-empty variant", () => {
    expect(readPortfolioSetupCompleted(userSub)).toBe(false);
    expect(resolvePortfolioSetupVariant(userSub)).toBe("first-time");

    markPortfolioSetupCompleted(userSub);

    expect(readPortfolioSetupCompleted(userSub)).toBe(true);
    expect(resolvePortfolioSetupVariant(userSub)).toBe("returning-empty");
    expect(localStorage.getItem(portfolioSetupCompletedKey(userSub))).toBe("1");
  });
});

describe("supported portfolio input messaging", () => {
  it("only lists verified import methods from the live upload flow", () => {
    const labels = SUPPORTED_PORTFOLIO_INPUT_METHODS.map((method) => method.label);
    expect(labels).toEqual(["CSV or Excel", "Manual entry", "Cash positions"]);

    const picker = readProjectFile("components/import/ImportMethodPicker.tsx");
    const parser = readProjectFile("lib/services/import/spreadsheetParser.ts");
    const onboarding = readProjectFile(
      "components/onboarding/PortfolioSetupOnboarding.tsx",
    );
    const setup = readProjectFile("lib/client/portfolioSetup.ts");

    expect(picker).toMatch(/Excel or CSV|Manual entry|Cash entry/);
    expect(parser).toMatch(/xlsx|xls|csv/);
    expect(setup).toContain("CSV or Excel");
    expect(setup).toContain("Manual entry");
    expect(setup).toContain("Cash positions");
    expect(onboarding).toContain("SUPPORTED_PORTFOLIO_INPUT_METHODS.map");
    expect(onboarding).not.toMatch(/screenshot upload|broker login|DEGIRO|Interactive Brokers/i);
    expect(setup).not.toMatch(/screenshot upload|DEGIRO|Interactive Brokers/i);
  });

  it("keeps demo portfolio feature-flagged off", () => {
    expect(DEMO_PORTFOLIO_ENABLED).toBe(false);
    const onboarding = readProjectFile(
      "components/onboarding/PortfolioSetupOnboarding.tsx",
    );
    expect(onboarding).toContain("DEMO_PORTFOLIO_ENABLED");
    expect(onboarding).not.toMatch(/href=.*demo/i);
  });

  it("routes primary actions to import and manual-add flows", () => {
    expect(PORTFOLIO_SETUP_ROUTES.import).toBe("/upload");
    expect(PORTFOLIO_SETUP_ROUTES.manualAdd).toBe("/portfolio?add=investment");
    expect(PORTFOLIO_SETUP_COPY.importPrimary).toBe("Import portfolio");
    expect(PORTFOLIO_SETUP_COPY.manualSecondary).toBe("Add holdings manually");

    const onboarding = readProjectFile(
      "components/onboarding/PortfolioSetupOnboarding.tsx",
    );
    expect(onboarding).toContain("PORTFOLIO_SETUP_ROUTES.import");
    expect(onboarding).toContain("PORTFOLIO_SETUP_ROUTES.manualAdd");
    expect(onboarding).toContain("PORTFOLIO_SETUP_COPY.importPrimary");
    expect(onboarding).toContain("PORTFOLIO_SETUP_COPY.manualSecondary");
  });
});

describe("empty portfolio surfaces", () => {
  it("uses shared onboarding on the dashboard empty state", () => {
    const empty = readProjectFile("components/dashboard/DashboardEmptyState.tsx");
    expect(empty).toContain("PortfolioSetupOnboarding");
    expect(empty).toContain("resolvePortfolioSetupVariant");
  });

  it("uses EmptyPortfolioGuide on analysis, portfolio, goals and health", () => {
    const analysis = readProjectFile(
      "components/analysis/PortfolioAnalysisPage.tsx",
    );
    const portfolio = readProjectFile("app/portfolio/page.tsx");
    const goals = readProjectFile("app/goals/page.tsx");
    const health = readProjectFile(
      "components/portfolioHealth/PortfolioHealthPage.tsx",
    );

    expect(analysis).toContain("EmptyPortfolioGuide");
    expect(portfolio).toContain("EmptyPortfolioGuide");
    expect(goals).toContain("EmptyPortfolioGuide");
    expect(health).toContain("EmptyPortfolioGuide");
    expect(analysis).not.toMatch(/totalValue|allocation.*0%|concentration.*0/i);
  });

  it("keeps Import holdings in the profile Explore menu", () => {
    const menu = readProjectFile("components/auth/UserMenu.tsx");
    expect(menu).toMatch(/Import holdings/);
    expect(menu).toMatch(/href:\s*"\/upload"/);
  });

  it("keeps mobile-friendly CTA sizing on the onboarding screen", () => {
    const onboarding = readProjectFile(
      "components/onboarding/PortfolioSetupOnboarding.tsx",
    );
    expect(onboarding).toContain("min-h-[48px]");
    expect(onboarding).toContain("focus-visible:ring-2");
    expect(onboarding).toContain('aria-labelledby="portfolio-setup-heading"');
  });
});
