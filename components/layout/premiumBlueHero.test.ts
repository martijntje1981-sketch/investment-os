import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

function read(relativePath: string) {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("Phase 16.6 / 20 shared Q1 cyan page heroes", () => {
  const globals = read("app/globals.css");
  const surface = read("components/layout/appSurface.ts");
  const pageHero = read("components/layout/PageHero.tsx");
  const dashboardHero = read("components/dashboard/PortfolioValueCard.tsx");
  const analysis = read("components/analysis/PortfolioAnalysisPage.tsx");
  const news = read("app/news/page.tsx");
  const goals = read("app/goals/page.tsx");
  const holding = read("app/holding/[ticker]/page.tsx");
  const holdingAlt = read("app/portfolio/[symbol]/page.tsx");
  const fourQuestions = read("lib/services/fourQuestions/types.ts");
  const historyCard = read(
    "components/portfolioHistory/PortfolioHistoryNavCard.tsx",
  );

  it("defines one shared Q1 cyan hero token family without recoloring CTA black", () => {
    expect(globals).toContain("--hero-premium-from: #083344");
    expect(globals).toContain("--hero-premium-via: #164e63");
    expect(globals).toContain("--hero-premium-to: #155e75");
    expect(globals).toContain("--color-hero-premium-from:");
    expect(globals).toContain("--navy-hero: #0a0a0a");
    expect(globals).toContain("--navy-card: #121212");
    expect(globals).toContain("rgba(8, 145, 178, 0.38)");
    expect(surface).toContain("appIntelligenceAccentCardClass");
    expect(surface).toMatch(
      /export const appHeroShellClass =\s*"[^"]*from-hero-premium-from[^"]*"/,
    );
    expect(surface).toContain("bg-gradient-to-br");
    expect(surface).toContain("appDashboardHeroShellClass = appHeroShellClass");
    expect(surface).toContain("bg-navy-hero");
    expect(surface).toContain("appSolidButtonClass");
  });

  it("wires Dashboard, PageHero, and holding identity heroes to the shared shell", () => {
    expect(pageHero).toContain("appHeroShellClass");
    expect(dashboardHero).toContain("appDashboardHeroShellClass");
    expect(dashboardHero).toContain('appearance="onDark"');
    expect(dashboardHero).toContain('tone="dark"');
    expect(dashboardHero).not.toContain("from-[#f4f9fd]");
    expect(analysis).toContain("<PageHero");
    expect(news).toContain("<PageHero");
    expect(goals).toContain("<PageHero");
    expect(read("app/portfolio/page.tsx")).toContain("<PageHero");
    expect(read("components/portfolioHistory/PortfolioHistoryPage.tsx")).toContain(
      "<PageHero",
    );
    expect(read("components/companion/CompanionReviewPage.tsx")).toContain(
      "<PageHero",
    );
    expect(holding).toContain("appHeroShellClass");
    expect(holding).not.toContain("rounded-3xl bg-slate-950");
    expect(holdingAlt).toContain("appHeroShellClass");
    expect(holdingAlt).toContain("holdingPriceStatusUserLabel");
  });

  it("keeps Four Questions and Portfolio History card outside the hero recolor", () => {
    expect(fourQuestions).toContain("from-violet-100");
    expect(fourQuestions).toContain("from-cyan-100");
    expect(historyCard).toContain("from-cyan");
    expect(historyCard).not.toContain("appHeroShellClass");
  });

  it("keeps Dashboard hero content contracts and readable on-dark type", () => {
    expect(dashboardHero).toContain("Portfolio value");
    expect(dashboardHero).toContain("Latest move");
    expect(dashboardHero).toContain("HeroPerformanceSparkline");
    expect(dashboardHero).toContain("HeroPortfolioPulse");
    expect(dashboardHero).toContain("DailyPortfolioBriefing");
    expect(dashboardHero).toContain("ConversionDetailsDisclosure");
    expect(dashboardHero).toContain("RefreshPricesButton");
    expect(surface).toContain('text-white/90');
    expect(surface).toContain("appDashboardHeroMetaClass");
    expect(dashboardHero).toContain("appHeroPaddingCompactClass");
    expect(dashboardHero).toContain("min-h-[56px]");
  });
});
