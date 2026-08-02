import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const authenticatedPagesWithBackLink = [
  "app/portfolio/page.tsx",
  "app/news/page.tsx",
  "components/analysis/PortfolioAnalysisPage.tsx",
  "app/goals/page.tsx",
  "app/discover/page.tsx",
  "app/settings/page.tsx",
  "app/upload/page.tsx",
];

const secondaryPagesWithSharedBack = [
  "components/marketPulse/MarketPulsePage.tsx",
  "components/portfolioHealth/PortfolioHealthPage.tsx",
  "app/supported-instruments/page.tsx",
];

const authenticatedPages = [
  "app/dashboard/page.tsx",
  ...authenticatedPagesWithBackLink,
];

describe("authenticated page layout", () => {
  it("uses shared PageContainer across main authenticated pages", () => {
    for (const relativePath of authenticatedPages) {
      const source = readFileSync(
        path.resolve(process.cwd(), relativePath),
        "utf8",
      );

      expect(source, relativePath).toContain("PageContainer");
    }
  });

  it("uses PageHero on authenticated pages except the dashboard portfolio hero", () => {
    const dashboardSource = readFileSync(
      path.resolve(process.cwd(), "app/dashboard/page.tsx"),
      "utf8",
    );
    expect(dashboardSource).not.toContain("PageHero");
    expect(dashboardSource).toContain("DashboardSummary");

    for (const relativePath of authenticatedPagesWithBackLink) {
      const source = readFileSync(
        path.resolve(process.cwd(), relativePath),
        "utf8",
      );

      expect(source, relativePath).toContain("PageHero");
    }
  });

  it("standardizes width through PageContainer instead of page-level max-w-* wrappers", () => {
    const containerSource = readFileSync(
      path.resolve(process.cwd(), "components/layout/PageContainer.tsx"),
      "utf8",
    );
    const surfaceSource = readFileSync(
      path.resolve(process.cwd(), "components/layout/appSurface.ts"),
      "utf8",
    );

    expect(containerSource).toContain("appPageStackClass");
    expect(surfaceSource).toContain("max-w-6xl");

    for (const relativePath of authenticatedPages) {
      const source = readFileSync(
        path.resolve(process.cwd(), relativePath),
        "utf8",
      );

      expect(source, relativePath).not.toMatch(/<main className="[^"]*max-w-/);
      expect(source, relativePath).not.toMatch(
        /mx-auto w-full min-w-0 max-w-(3xl|4xl|5xl|7xl)/,
      );
    }
  });

  it("uses shared hero typography tokens in PageHero", () => {
    const heroSource = readFileSync(
      path.resolve(process.cwd(), "components/layout/PageHero.tsx"),
      "utf8",
    );
    const surfaceSource = readFileSync(
      path.resolve(process.cwd(), "components/layout/appSurface.ts"),
      "utf8",
    );

    expect(heroSource).toContain("appPageHeroTitleClass");
    expect(heroSource).toContain("appPageHeroSubtitleClass");
    expect(surfaceSource).toContain("appPageHeroTitleClass");
    expect(surfaceSource).toContain("break-words");
  });

  it("adds Back to dashboard on authenticated pages except dashboard", () => {
    const dashboardSource = readFileSync(
      path.resolve(process.cwd(), "app/dashboard/page.tsx"),
      "utf8",
    );

    expect(dashboardSource).not.toContain("backToDashboard");

    for (const relativePath of authenticatedPagesWithBackLink) {
      const source = readFileSync(
        path.resolve(process.cwd(), relativePath),
        "utf8",
      );

      expect(source, relativePath).toContain("backToDashboard");
    }
  });

  it("uses the shared BackButton on secondary standalone pages", () => {
    const backButtonSource = readFileSync(
      path.resolve(process.cwd(), "components/layout/BackButton.tsx"),
      "utf8",
    );
    expect(backButtonSource).toContain("router.back");
    expect(backButtonSource).toContain('fallbackHref = "/dashboard"');

    for (const relativePath of secondaryPagesWithSharedBack) {
      const source = readFileSync(
        path.resolve(process.cwd(), relativePath),
        "utf8",
      );
      expect(source, relativePath).toContain("BackButton");
    }
  });

  it("does not add Back to dashboard on public marketing pages", () => {
    const homeSource = readFileSync(
      path.resolve(process.cwd(), "app/page.tsx"),
      "utf8",
    );
    const faqSource = readFileSync(
      path.resolve(process.cwd(), "app/faq/page.tsx"),
      "utf8",
    );

    expect(homeSource).not.toContain("backToDashboard");
    expect(faqSource).not.toContain("backToDashboard");
  });
});
