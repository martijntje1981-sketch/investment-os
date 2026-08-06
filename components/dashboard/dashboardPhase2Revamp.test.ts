import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("dashboard phase 2 compact previews", () => {
  const dashboardSource = readFileSync(
    path.resolve(process.cwd(), "app/dashboard/page.tsx"),
    "utf8",
  );
  const summarySource = readFileSync(
    path.resolve(process.cwd(), "components/dashboard/DashboardSummary.tsx"),
    "utf8",
  );
  const decisionSource = readFileSync(
    path.resolve(
      process.cwd(),
      "components/dashboard/DashboardTodaysDecision.tsx",
    ),
    "utf8",
  );
  const decisionBlockSource = readFileSync(
    path.resolve(process.cwd(), "components/investor/TodaysDecisionBlock.tsx"),
    "utf8",
  );
  const briefingSource = readFileSync(
    path.resolve(
      process.cwd(),
      "components/dashboard/DashboardTodaysMarketBriefing.tsx",
    ),
    "utf8",
  );
  const goalProgressSource = readFileSync(
    path.resolve(
      process.cwd(),
      "components/dashboard/DashboardGoalProgressCard.tsx",
    ),
    "utf8",
  );
  const dividendSource = readFileSync(
    path.resolve(
      process.cwd(),
      "components/dashboard/DashboardDividendCard.tsx",
    ),
    "utf8",
  );
  const insightSource = readFileSync(
    path.resolve(
      process.cwd(),
      "components/dashboard/DashboardInsightCard.tsx",
    ),
    "utf8",
  );
  const marketStatusSource = readFileSync(
    path.resolve(
      process.cwd(),
      "components/dashboard/DashboardMarketStatus.tsx",
    ),
    "utf8",
  );

  it("keeps portfolio hero at the top; structural Scorecard is off Dashboard", () => {
    expect(summarySource).not.toContain("GoalProgressCard");
    expect(summarySource).toContain("PortfolioValueCard");
    expect(dashboardSource).toContain("DashboardSummary");
    expect(dashboardSource).toContain("pulse={portfolioPulse}");
    expect(dashboardSource).not.toContain("DashboardPortfolioScorecard");
    expect(dashboardSource).not.toContain("DashboardGoalProgressCard");
  });

  it("keeps Today’s Decision logic available for the merged briefing card", () => {
    expect(dashboardSource).toContain("DashboardTodaysMarketBriefing");
    expect(decisionSource).toContain("TodaysDecisionBlock");
    expect(decisionBlockSource).toContain("resolveDestination");
    expect(decisionBlockSource).toContain("INTERACTIVE_STYLES");
    expect(decisionBlockSource).toContain("destinationHref");
  });

  it("renders Today’s market briefing with lead insight and portfolio context", () => {
    expect(briefingSource).toContain("mustWatch");
    expect(briefingSource).toContain("buildIntelligenceDisplayMessage");
    expect(briefingSource).toContain("leadTitle");
    expect(briefingSource).toContain("DASHBOARD_DEEP_LINKS.marketBriefing");
    expect(briefingSource).toContain("Open Market Intelligence");
    expect(briefingSource).toContain("line-clamp-3");
    expect(briefingSource).toContain("mustWatch?.title");
    expect(briefingSource).toContain("Portfolio context");
    expect(briefingSource).not.toContain("DiscoverMissedTeaser");
    expect(briefingSource).not.toContain("Read featured story");
    expect(briefingSource).not.toContain("todayMatters.map");
    expect(briefingSource).not.toContain("macroHighlights");
  });

  it("places Portfolio Pulse above holdings and merged briefing below holdings", () => {
    const pulseIdx = dashboardSource.indexOf("pulse={portfolioPulse}");
    const holdingsIdx = dashboardSource.indexOf("<HoldingsToday");
    const briefingIdx = dashboardSource.indexOf(
      "<DashboardTodaysMarketBriefing",
    );
    expect(pulseIdx).toBeGreaterThan(-1);
    expect(holdingsIdx).toBeGreaterThan(pulseIdx);
    expect(briefingIdx).toBeGreaterThan(holdingsIdx);
    expect(dashboardSource).not.toContain("DashboardTodaysDecision");
    expect(dashboardSource).not.toContain("DashboardIntelligencePreview");
    expect(dashboardSource).not.toMatch(/overflow-x-auto|overflow-x-scroll/);
  });

  it("keeps compact Goal Progress preview fields and Goals CTA", () => {
    expect(goalProgressSource).toContain("currentValue");
    expect(goalProgressSource).toContain("targetValue");
    expect(goalProgressSource).toContain("currentProgressPercent");
    expect(goalProgressSource).toContain("progress.status");
    expect(goalProgressSource).toContain("DASHBOARD_DEEP_LINKS.goalProgress");
    expect(goalProgressSource).toContain("Open Goals");
    expect(goalProgressSource).toContain("Set your goal");
    expect(goalProgressSource).toContain('role="progressbar"');
    expect(goalProgressSource).not.toContain("estimatedCompletionLabel");
    expect(goalProgressSource).not.toContain("remainingAmount");
    expect(goalProgressSource).not.toContain("progress.summary");
  });

  it("handles no-goal state in compact Goal Progress", () => {
    expect(goalProgressSource).toContain("!progress.hasGoal");
    expect(goalProgressSource).toContain("Set a target to track progress");
  });

  it("keeps Dividend Intelligence primary metric, observation, and Analysis CTA", () => {
    expect(dividendSource).toContain("estimatedAnnualIncomeEur");
    expect(dividendSource).toContain("snapshot.insight");
    expect(dividendSource).toContain(
      "DASHBOARD_DEEP_LINKS.dividendIntelligence",
    );
    expect(dividendSource).toContain("View details");
    expect(dividendSource).toContain("passiveIncome.hasUsableEstimate");
    expect(dividendSource).toContain("includesUserEstimates");
    expect(dividendSource).not.toContain("portfolioYieldPercent");
    expect(dividendSource).not.toContain("payingHoldingsCount");
    expect(dividendSource).not.toContain("averageYieldPercent");
    expect(dividendSource).not.toContain("nextPayment");
    expect(dividendSource).not.toContain('href="/goals"');
  });

  it("keeps Trading Hours and insight module files; omits Dashboard insight card and duplicate movers", () => {
    expect(dashboardSource).not.toContain("DashboardInsightCard");
    expect(dashboardSource).toContain("DashboardMarketStatus");
    expect(insightSource.length).toBeGreaterThan(0);
    expect(marketStatusSource.length).toBeGreaterThan(0);
    expect(dashboardSource).not.toContain("DashboardMoverCard");
    expect(dashboardSource).not.toContain("Biggest winner");
    expect(dashboardSource).not.toContain("Biggest loser");
    expect(dashboardSource).not.toMatch(/[Ss]ector [Aa]llocation/);
    expect(dashboardSource).not.toContain("groupBySector");
  });

  it("places Dividend and Contributions below holdings without a separate Goal Progress card", () => {
    const holdingsIdx = dashboardSource.indexOf("<HoldingsToday");
    const dividendIdx = dashboardSource.indexOf("<DashboardDividendCard");
    const contributionsIdx = dashboardSource.indexOf(
      "<DashboardContributionsCard",
    );
    expect(holdingsIdx).toBeGreaterThan(-1);
    expect(dividendIdx).toBeGreaterThan(holdingsIdx);
    expect(contributionsIdx).toBeGreaterThan(holdingsIdx);
    expect(dashboardSource).not.toContain("DashboardGoalProgressCard");
    expect(dashboardSource).toContain("pulse={portfolioPulse}");
  });

  it("uses mobile-first stacked grids without horizontal scroll utilities", () => {
    expect(dashboardSource).toContain("grid min-w-0 gap-6 lg:grid-cols-2");
    expect(briefingSource).toContain("min-w-0");
    expect(goalProgressSource).toContain("min-w-0");
    expect(dividendSource).toContain("min-w-0");
    expect(dashboardSource).not.toContain("whitespace-nowrap overflow-x");
  });
});
