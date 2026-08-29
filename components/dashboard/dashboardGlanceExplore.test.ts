import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relativePath: string): string {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("Dashboard glance → explore polish", () => {
  const dashboard = read("app/dashboard/page.tsx");
  const hero = read("components/dashboard/PortfolioValueCard.tsx");
  const sparkline = read("components/dashboard/HeroPerformanceSparkline.tsx");
  const periods = read("components/dashboard/heroTrendPeriods.ts");
  const holdings = read("components/dashboard/HoldingsToday.tsx");
  const row = read("components/dashboard/HoldingsTodayRow.tsx");
  const intelligence = read(
    "components/dashboard/DashboardPersonalIntelligence.tsx",
  );
  const explore = read("components/dashboard/DashboardSecondaryNav.tsx");
  const pulse = read("components/dashboard/HeroPortfolioPulse.tsx");
  const conversion = read(
    "components/currency/ConversionDetailsDisclosure.tsx",
  );

  it("keeps the primary Dashboard as hero, holdings, one intelligence block, then Explore", () => {
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
    expect(dashboard).not.toContain("<FourQuestionsSection");
    expect(dashboard).not.toContain("pulse={portfolioPulse}");
    expect(hero).not.toContain("HeroPortfolioPulse");
    expect(hero).not.toContain("DailyPortfolioBriefing");
    expect(hero).not.toContain("hero-zone-snapshot");
  });

  it("keeps 1M as the hero default and does not restore 1D", () => {
    expect(periods).toContain('["1W", "1M"]');
    expect(periods).toContain('= "1M"');
    expect(sparkline).not.toContain('"1D"');
    expect(sparkline).toContain("HERO_TREND_DEFAULT_PERIOD");
  });

  it("makes conversion details a quiet secondary control", () => {
    expect(hero).toContain("presentDashboardValuationCoverageMessage");
    expect(hero).toContain("quietTrigger");
    expect(conversion).toContain("quietTrigger");
    expect(conversion).toContain("text-[12px]");
    expect(conversion).toContain("text-white/70");
  });

  it("does not aggressively truncate holding names and tones delayed freshness quietly", () => {
    expect(row).toContain("line-clamp-2");
    expect(row).not.toContain('truncate text-[15px] font-semibold text-white');
    expect(row).toContain("formatHoldingQuoteTrustLine");
    expect(row).toContain('source === "live"');
    expect(row).toContain('source === "delayed"');
    expect(row).toContain("text-white/40");
    expect(row).toContain("text-white/50");
    expect(row).toContain("text-amber-300");
    expect(row).toContain("holdings-today-no-news");
    expect(holdings).toContain("density=\"compact\"");
  });

  it("keeps one compact personal intelligence block", () => {
    expect(intelligence).toContain('data-testid="dashboard-personal-intelligence"');
    expect(intelligence).toContain("#explore-tobailey");
    expect(intelligence).not.toContain("WHAT_HAPPENED_HUB_PATH");
  });

  it("exposes existing destinations in Explore Tobailey, including Scorecard", () => {
    expect(explore).toContain("Explore Tobailey");
    expect(explore).toContain("max-w-[calc(100%-3.25rem)]");
    expect(explore).toContain("ANALYSIS_PATH");
    expect(explore).toContain("NEWS_PATH");
    expect(explore).toContain("GOALS_PATH");
    expect(explore).toContain("PORTFOLIO_HISTORY_PATH");
    expect(explore).toContain("REVIEW_PATH");
    expect(explore).toContain("WHAT_HAPPENED_HUB_PATH");
    expect(explore).toContain("WHAT_MATTERS_HUB_PATH");
    expect(explore).toContain("ON_TRACK_HUB_PATH");
    expect(explore).toContain("WHATS_AHEAD_HUB_PATH");
    expect(explore).toContain("DASHBOARD_DEEP_LINKS.scorecard");
    expect(explore).toContain("PERSPECTIVES_PATH");
    expect(explore).toContain("DASHBOARD_DEEP_LINKS.cashIntelligence");
    expect(explore).toContain("MARKET_PULSE_PATH");
    expect(explore).toContain("grid-cols-2");
    expect(pulse).toContain("Portfolio Pulse");
    expect(pulse).toContain("DASHBOARD_DEEP_LINKS.scorecard");
  });
});
