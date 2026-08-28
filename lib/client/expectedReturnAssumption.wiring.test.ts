import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relativePath: string): string {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("Phase 3C central expected return assumption wiring", () => {
  const goalsPage = read("app/goals/page.tsx");
  const scenario = read("components/analysis/ScenarioStressSection.tsx");
  const analysis = read("components/analysis/glance/AnalysisDetailView.tsx");
  const dashboard = read("app/dashboard/page.tsx");
  const conclusionCard = read(
    "components/dashboard/DashboardGoalConclusionCard.tsx",
  );
  const helper = read("lib/client/expectedReturnAssumption.ts");
  const storage = read("lib/client/userGoalStorage.ts");

  it("keeps GoalSettings.expectedAnnualReturn as the only canonical field", () => {
    expect(helper).toContain("GoalSettings.expectedAnnualReturn");
    expect(storage).toContain("expectedAnnualReturn");
    expect(helper).not.toContain("portfolioExpectedReturn");
    expect(goalsPage).not.toContain("portfolioExpectedReturn");
  });

  it("surfaces Your assumption on Goals with edit affordance", () => {
    expect(goalsPage).toContain("Your assumption");
    expect(goalsPage).toContain("Expected annual return");
    expect(goalsPage).toContain("ExpectedReturnAssumptionEditor");
    expect(goalsPage).toContain("ExpectedReturnAssumptionPanel");
  });

  it("wires Goal Sensitivity / Scenario to the same editor + persistGoal", () => {
    expect(scenario).toContain("ExpectedReturnAssumptionCompact");
    expect(scenario).toContain("ExpectedReturnAssumptionEditor");
    expect(scenario).toContain("onPersistGoal");
    expect(scenario).toContain("expected-return assumption");
    expect(analysis).toContain("onPersistGoal={persistGoal}");
  });

  it("keeps Dashboard compact with optional assumption context only", () => {
    expect(dashboard).toContain("DashboardSecondaryNav");
    expect(conclusionCard).toContain("buildGoalConclusion(progress, goal)");
    expect(dashboard).not.toContain("ExpectedReturnAssumptionPanel");
    expect(dashboard).not.toContain("ExpectedReturnAssumptionEditor");
    expect(dashboard).not.toContain("DashboardGoalConclusionCard");
  });

  it("avoids Tobailey-prediction wording in helpers and Goals form hint", () => {
    expect(helper).not.toMatch(/Tobailey expects|Forecast return|Likely return/i);
    expect(goalsPage).toContain("not a Tobailey forecast");
    expect(goalsPage).not.toMatch(/Tobailey expects/i);
  });
});
