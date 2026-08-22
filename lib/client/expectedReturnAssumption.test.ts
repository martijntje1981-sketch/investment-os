import { describe, expect, it } from "vitest";

import {
  EXPECTED_ANNUAL_RETURN_MAX,
  EXPECTED_ANNUAL_RETURN_MIN,
  buildExpectedReturnImpactPreview,
  formatExpectedReturnAssumptionContext,
  formatExpectedReturnPa,
  getExpectedReturnAssumption,
  isValidExpectedAnnualReturnInput,
  withExpectedReturnAssumption,
} from "@/lib/client/expectedReturnAssumption";
import { sanitizeGoalForSave } from "@/lib/client/userGoalStorage";
import { buildGoalConclusion } from "@/lib/client/dashboardConclusions";
import { buildGoalProgressEngine } from "@/lib/services/goals/goalProgressEngine";
import type { GoalSettings } from "@/lib/types/portfolioStorage";

const goal: GoalSettings = {
  targetValue: 100_000,
  targetYear: 2036,
  monthlyContribution: 500,
  expectedAnnualReturn: 10,
};

describe("expectedReturnAssumption helpers", () => {
  it("formats the stored 10% assumption as user-owned copy", () => {
    expect(getExpectedReturnAssumption(goal)).toBe(10);
    expect(formatExpectedReturnPa(10)).toBe("10% p.a.");
    expect(formatExpectedReturnAssumptionContext(10)).toBe(
      "Based on your 10% p.a. assumption",
    );
    expect(formatExpectedReturnAssumptionContext(10)).toMatch(/your/i);
    expect(formatExpectedReturnAssumptionContext(10)).not.toMatch(
      /tobailey expects|forecast return|likely return/i,
    );
  });

  it("rejects invalid assumption inputs", () => {
    expect(isValidExpectedAnnualReturnInput(Number.NaN)).toBe(false);
    expect(isValidExpectedAnnualReturnInput(-1)).toBe(false);
    expect(isValidExpectedAnnualReturnInput(EXPECTED_ANNUAL_RETURN_MAX + 1)).toBe(
      false,
    );
    expect(isValidExpectedAnnualReturnInput(EXPECTED_ANNUAL_RETURN_MIN)).toBe(
      true,
    );
    expect(isValidExpectedAnnualReturnInput(10)).toBe(true);
    expect(withExpectedReturnAssumption(goal, 999)).toBeNull();
  });

  it("updates the canonical GoalSettings field only", () => {
    const next = withExpectedReturnAssumption(goal, 8);
    expect(next).toEqual({ ...goal, expectedAnnualReturn: 8 });
    expect(Object.keys(next!).sort()).toEqual(Object.keys(goal).sort());
  });

  it("builds an impact preview from the existing goal engine", () => {
    const preview = buildExpectedReturnImpactPreview({
      goal,
      currentPortfolioValue: 40_000,
      nextExpectedAnnualReturn: 8,
    });
    expect(preview).not.toBeNull();
    expect(preview?.fromPercent).toBe(10);
    expect(preview?.toPercent).toBe(8);
    expect(preview?.usable).toBe(true);
    expect(preview?.fromCompletionLabel).toBeTruthy();
    expect(preview?.toCompletionLabel).toBeTruthy();
  });

  it("persists only through GoalSettings.expectedAnnualReturn", () => {
    const saved = sanitizeGoalForSave({
      ...goal,
      expectedAnnualReturn: 8,
    });
    expect(saved?.expectedAnnualReturn).toBe(8);
    expect(sanitizeGoalForSave({ ...goal, expectedAnnualReturn: -2 })).toBeNull();
    expect(
      sanitizeGoalForSave({
        ...goal,
        expectedAnnualReturn: EXPECTED_ANNUAL_RETURN_MAX + 5,
      }),
    ).toBeNull();
  });

  it("returns no assumption without a goal", () => {
    expect(getExpectedReturnAssumption(null)).toBeNull();
  });
});

describe("goal projection recomputes with assumption", () => {
  it("changes projected completion when expected return changes", () => {
    const at10 = buildGoalProgressEngine({
      currentPortfolioValue: 40_000,
      goal,
      hasSavedGoal: true,
    });
    const at6 = buildGoalProgressEngine({
      currentPortfolioValue: 40_000,
      goal: { ...goal, expectedAnnualReturn: 6 },
      hasSavedGoal: true,
    });
    expect(at10.estimatedCompletionLabel).not.toBe(
      at6.estimatedCompletionLabel,
    );
  });
});

describe("dashboard goal conclusion assumption context", () => {
  it("adds a compact assumption line when a projection date is shown", () => {
    const progress = buildGoalProgressEngine({
      currentPortfolioValue: 40_000,
      goal,
      hasSavedGoal: true,
    });
    const card = buildGoalConclusion(progress, goal);
    expect(card?.contextLine).toBe("Based on your 10% p.a. assumption");
    expect(card?.conclusion).not.toMatch(/tobailey expects/i);
  });
});
