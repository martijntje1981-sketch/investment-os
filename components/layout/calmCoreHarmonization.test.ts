import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relativePath: string): string {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("Calm Core dark harmonization contracts", () => {
  it("keeps Money in & out as a hash detail with three dark blocks", () => {
    const page = read("app/portfolio/page.tsx");
    const funding = read("components/contributions/PortfolioFundingSection.tsx");

    expect(page).toContain("usePortfolioMoneyInOutOpen");
    expect(page).toContain('id="money-in-out"');
    expect(page).toContain("PORTFOLIO_PATH");
    expect(page).not.toContain("rounded-xl bg-white p-4 text-slate-950");
    expect(funding).toContain("Net contributed");
    expect(funding).toContain("Total contributed");
    expect(funding).toContain("Total withdrawn");
    expect(funding).toContain("Recent activity");
    expect(funding).toContain("Manage / history");
    expect(funding).toContain("appDarkCardClass");
    expect(funding).toContain("appDarkCautionClass");
    expect(funding).not.toContain("createPortfolioContribution");
  });

  it("structures Goals as three conclusion-first blocks plus Explore", () => {
    const goals = read("app/goals/page.tsx");
    expect(goals).toContain('canvas="navy"');
    expect(goals).toContain("Am I on track?");
    expect(goals).toContain("What is driving the outcome?");
    expect(goals).toContain("GoalTradeOffsSection");
    expect(goals).toContain("goals-explore");
    expect(goals).toContain('id="goal-progress"');
    expect(goals).toContain("<WhatIfExplorer");
    expect(goals).not.toContain("<PageHero");
    expect(goals).not.toContain("AuthenticatedFourQuestionsNav");
  });

  it("keeps Explore destinations and hashes reachable", () => {
    const catalog = read("components/portfolio/glance/portfolioExploreCatalog.ts");
    const newsCatalog = read("lib/services/newsGlance/newsDetailCatalog.ts");
    expect(catalog).toContain("money-in-out");
    expect(newsCatalog).toContain("portfolio-news");
    expect(newsCatalog).toContain("markets-today");
    expect(newsCatalog).toContain("news-macro");
    expect(newsCatalog).toContain("news-videos");
  });

  it("does not introduce write-path or calculation changes in this phase", () => {
    const funding = read("components/contributions/PortfolioFundingSection.tsx");
    const goals = read("app/goals/page.tsx");
    expect(funding).toContain("usePortfolioContributions");
    expect(funding).toContain("summary.netContributed");
    expect(goals).toContain("useGoalProgress");
    expect(goals).toContain("buildGoalsIntelligence");
    expect(goals).toContain("persistGoal(normalized)");
  });

  it("keeps News detail hashes without a giant light wrapper", () => {
    const detail = read("components/news/glance/NewsDetailView.tsx");
    expect(detail).toContain("NewsHubContent");
    expect(detail).toContain("appDarkCardClass");
    expect(detail).not.toContain("bg-background");
    expect(detail).not.toContain("text-foreground");
  });
});
