import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

function read(relativePath: string): string {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("Phase 1 dashboard UI refinement", () => {
  const dashboard = read("app/dashboard/page.tsx");
  const hero = read("components/dashboard/PortfolioValueCard.tsx");
  const briefing = read(
    "components/dashboard/DashboardTodaysMarketBriefing.tsx",
  );
  const decision = read("components/dashboard/DashboardTodaysDecision.tsx");
  const health = read("components/dashboard/DashboardPortfolioHealthCard.tsx");
  const cash = read("components/dashboard/DashboardCashIntelligenceCard.tsx");
  const refresh = read("components/portfolio/RefreshPricesButton.tsx");
  const globals = read("app/globals.css");
  const surface = read("components/layout/appSurface.ts");

  it("keeps Portfolio Pulse and Cash Intelligence outside the portfolio hero", () => {
    expect(hero).not.toContain("HeroHealthRing");
    expect(hero).not.toContain("HeroTopStoryPreviewCard");
    expect(hero).not.toContain("buildHeroHealthPreview");
    expect(hero).not.toContain("buildHeroTopStoryPreview");
    expect(dashboard).toContain("pulse={portfolioPulse}");
    expect(dashboard).not.toContain("DashboardPortfolioScorecard");
    expect(dashboard).not.toContain("DashboardPortfolioHealthCard");
    expect(dashboard).toContain("DashboardCashIntelligenceCard");
    expect(dashboard).not.toContain("DashboardTopStoryCard");
    expect(dashboard.indexOf("<DashboardSummary")).toBeLessThan(
      dashboard.indexOf("pulse={portfolioPulse}"),
    );
    expect(dashboard.indexOf("<DashboardSummary")).toBeLessThan(
      dashboard.indexOf("<DashboardCashIntelligenceCard"),
    );
  });

  it("merges Today’s Decision and Market Briefing into one card", () => {
    expect(dashboard).toContain("<DashboardTodaysMarketBriefing");
    expect(dashboard).not.toContain("<DashboardTodaysDecision");
    expect(dashboard).not.toContain("<DashboardIntelligencePreview");
    expect(briefing).toContain("Markets today");
    expect(briefing).toContain("buildTodaysDecision");
    expect(decision).toContain("appDashboardLightCardClass");
    expect(briefing).toContain("border-l-violet-500");
    expect(cash).toContain("Cash intelligence");
    expect(health).toContain("View full analysis");
  });

  it("uses a quiet icon refresh control with accessible naming", () => {
    expect(hero).toContain('variant="icon"');
    expect(refresh).toContain('variant?: "hero" | "compact" | "icon"');
    expect(refresh).toContain("aria-label={statusLabel}");
    expect(refresh).toContain('variant === "icon"');
  });

  it("centralizes midnight-navy and canvas tokens", () => {
    expect(globals).toContain("--navy-hero:");
    expect(globals).toContain("--navy-card:");
    expect(globals).toContain("--color-navy-hero:");
    expect(globals).toContain("--color-navy-card:");
    expect(surface).toContain("appHeroShellClass");
    expect(surface).toContain("appDarkCardClass");
    expect(surface).toContain("appPageCanvasClass");
    expect(surface).toContain("bg-navy-hero");
  });

  it("keeps non-color indicators for portfolio moves", () => {
    expect(hero).toContain("TrendingUp");
    expect(hero).toContain("TrendingDown");
    expect(hero).toContain("signedPercent");
    expect(hero).toContain("HeroPerformanceSparkline");
  });

  it("keeps progressive disclosure controls keyboard-accessible", () => {
    const conversion = read(
      "components/currency/ConversionDetailsDisclosure.tsx",
    );
    expect(conversion).toContain("aria-expanded={open}");
    expect(hero).toContain("ConversionDetailsDisclosure");
  });
});
