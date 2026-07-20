import { beforeEach, describe, expect, it } from "vitest";

import {
  formatOptionalPassiveIncomeDisplay,
  hasPassiveIncomeTarget,
  normalizePassiveIncomeTarget,
  parseOptionalPassiveIncomeInput,
  passiveIncomeTargetForDatabase,
} from "@/lib/client/goalPassiveIncome";
import { mapDbGoalToStored, mapGoalToDbInsert } from "@/lib/services/portfolio/mappers";
import type { GoalSettings } from "@/lib/types/portfolioStorage";
import type { DbGoalRow } from "@/lib/services/portfolio/types";
import {
  readSavedUserGoal,
  sanitizeGoalForSave,
  saveUserGoal,
} from "@/lib/client/userGoalStorage";
import { goalStorageKey } from "@/lib/client/portfolioStorageKeys";
import { computePassiveIncomeProgress } from "@/lib/services/dividends";

const USER = "11111111-1111-4111-8111-111111111111";

const baseGoal: GoalSettings = {
  targetValue: 250_000,
  targetYear: 2036,
  monthlyContribution: 500,
  expectedAnnualReturn: 8,
};

function goalRow(
  passiveIncomeTarget: number | string | null,
): DbGoalRow {
  return {
    id: "goal-1",
    target_value: baseGoal.targetValue,
    target_year: baseGoal.targetYear,
    monthly_contribution: baseGoal.monthlyContribution,
    expected_annual_return: baseGoal.expectedAnnualReturn,
    passive_income_target: passiveIncomeTarget,
    is_active: true,
    updated_at: "2026-07-20T10:00:00.000Z",
  };
}

describe("goalPassiveIncome helpers", () => {
  it("treats blank input as unset", () => {
    expect(parseOptionalPassiveIncomeInput("")).toBeUndefined();
    expect(parseOptionalPassiveIncomeInput("   ")).toBeUndefined();
    expect(parseOptionalPassiveIncomeInput(".")).toBeUndefined();
    expect(normalizePassiveIncomeTarget(undefined)).toBeUndefined();
    expect(normalizePassiveIncomeTarget(null)).toBeUndefined();
  });

  it("accepts explicit zero as valid", () => {
    expect(parseOptionalPassiveIncomeInput("0")).toBe(0);
    expect(normalizePassiveIncomeTarget(0)).toBe(0);
    expect(formatOptionalPassiveIncomeDisplay(0)).toBe("0");
    expect(hasPassiveIncomeTarget(0)).toBe(false);
  });

  it("accepts positive passive income targets", () => {
    expect(parseOptionalPassiveIncomeInput("12000")).toBe(12000);
    expect(normalizePassiveIncomeTarget(12000)).toBe(12000);
    expect(hasPassiveIncomeTarget(12000)).toBe(true);
  });

  it("rejects invalid negative and malformed values", () => {
    expect(parseOptionalPassiveIncomeInput("-100")).toBeUndefined();
    expect(normalizePassiveIncomeTarget(-50)).toBeUndefined();
    expect(normalizePassiveIncomeTarget("abc")).toBeUndefined();
    expect(normalizePassiveIncomeTarget(Number.NaN)).toBeUndefined();
  });

  it("maps optional values to database nulls without truthiness bugs", () => {
    expect(passiveIncomeTargetForDatabase(undefined)).toBeNull();
    expect(passiveIncomeTargetForDatabase(0)).toBe(0);
    expect(passiveIncomeTargetForDatabase(5000)).toBe(5000);
  });
});

describe("goal save and reload", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("saves goals with blank passive income omitted", () => {
    saveUserGoal(USER, baseGoal);

    expect(readSavedUserGoal(USER)).toEqual(baseGoal);
    expect(JSON.parse(localStorage.getItem(goalStorageKey(USER)) ?? "{}")).not.toHaveProperty(
      "passiveIncomeTarget",
    );
  });

  it("saves goals with explicit zero passive income", () => {
    saveUserGoal(USER, { ...baseGoal, passiveIncomeTarget: 0 });

    expect(readSavedUserGoal(USER)).toEqual({
      ...baseGoal,
      passiveIncomeTarget: 0,
    });
  });

  it("saves goals with positive passive income", () => {
    saveUserGoal(USER, { ...baseGoal, passiveIncomeTarget: 12_000 });

    expect(readSavedUserGoal(USER)?.passiveIncomeTarget).toBe(12_000);
  });

  it("strips invalid negative passive income on save", () => {
    const sanitized = sanitizeGoalForSave({
      ...baseGoal,
      passiveIncomeTarget: -100,
    });

    expect(sanitized).toEqual(baseGoal);
  });
});

describe("goal sync mapping", () => {
  it("loads null, zero, and positive passive income from remote rows", () => {
    expect(mapDbGoalToStored(goalRow(null))).toEqual(baseGoal);
    expect(mapDbGoalToStored(goalRow(0))).toEqual({
      ...baseGoal,
      passiveIncomeTarget: 0,
    });
    expect(mapDbGoalToStored(goalRow(15_000))).toEqual({
      ...baseGoal,
      passiveIncomeTarget: 15_000,
    });
  });

  it("persists explicit zero and positive values to the database payload", () => {
    expect(
      mapGoalToDbInsert({ ...baseGoal, passiveIncomeTarget: 0 }, USER)
        .passive_income_target,
    ).toBe(0);
    expect(
      mapGoalToDbInsert({ ...baseGoal, passiveIncomeTarget: 9_000 }, USER)
        .passive_income_target,
    ).toBe(9_000);
    expect(mapGoalToDbInsert(baseGoal, USER).passive_income_target).toBeNull();
  });
});

describe("passive income calculations", () => {
  it("does not produce NaN when passive income is missing or zero", () => {
    expect(computePassiveIncomeProgress(4_000, undefined)).toBe(0);
    expect(computePassiveIncomeProgress(4_000, null)).toBe(0);
    expect(computePassiveIncomeProgress(4_000, 0)).toBe(0);
    expect(computePassiveIncomeProgress(4_000, 10_000)).toBe(40);
  });
});
