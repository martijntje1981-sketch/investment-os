import { describe, expect, it } from "vitest";

import {
  buildFrozenGoalPlan,
  goalTargetDateUtcIso,
} from "@/lib/services/goalPace/goalPlanFreeze";
import { projectPortfolioValue } from "@/lib/services/goals/goalProgressEngine";
import type { DbGoalRow } from "@/lib/services/portfolio/types";

const capturedAt = new Date("2026-09-01T08:15:00.000Z");

function goal(overrides: Partial<DbGoalRow> = {}): DbGoalRow {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    portfolio_id: "port-a",
    target_value: 50000,
    target_year: 2035,
    monthly_contribution: 200,
    expected_annual_return: 7,
    passive_income_target: null,
    is_active: true,
    updated_at: "2026-08-20T12:00:00.000Z",
    ...overrides,
  };
}

describe("goalTargetDateUtcIso", () => {
  it("freezes the Goal-engine 31 Dec UTC convention", () => {
    expect(goalTargetDateUtcIso(2035)).toBe("2035-12-31");
    expect(new Date(Date.UTC(2035, 11, 31)).toISOString().slice(0, 10)).toBe(
      "2035-12-31",
    );
  });
});

describe("buildFrozenGoalPlan", () => {
  it("returns null when no Goal exists rather than inventing a plan", () => {
    expect(buildFrozenGoalPlan(null, capturedAt)).toBeNull();
  });

  it("freezes persisted Goal fields including the stable identifier", () => {
    expect(buildFrozenGoalPlan(goal(), capturedAt)).toEqual({
      goalId: "11111111-1111-4111-8111-111111111111",
      targetValue: 50000,
      targetYear: 2035,
      targetDateIso: "2035-12-31",
      monthlyContribution: 200,
      expectedAnnualReturn: 7,
      goalUpdatedAt: "2026-08-20T12:00:00.000Z",
      planCapturedAt: "2026-09-01T08:15:00.000Z",
    });
  });

  it("does not invent a Goal identifier when none exists", () => {
    const frozen = buildFrozenGoalPlan(goal({ id: "   " }), capturedAt);
    expect(frozen).not.toBeNull();
    expect(frozen?.goalId).toBeNull();
  });

  it("distinguishes a deleted/recreated Goal by a new persisted id", () => {
    const first = buildFrozenGoalPlan(goal(), capturedAt);
    const recreated = buildFrozenGoalPlan(
      goal({ id: "22222222-2222-4222-8222-222222222222", target_value: 80000 }),
      capturedAt,
    );
    expect(first?.goalId).not.toBe(recreated?.goalId);
    expect(recreated?.targetValue).toBe(80000);
  });

  it("reuses projectPortfolioValue instead of a second compounding model", () => {
    const frozen = buildFrozenGoalPlan(goal(), capturedAt);
    const planned = projectPortfolioValue(
      10_000,
      frozen!.monthlyContribution,
      frozen!.expectedAnnualReturn,
      12,
    );
    expect(planned).toBeGreaterThan(10_000 + frozen!.monthlyContribution);
  });
});
