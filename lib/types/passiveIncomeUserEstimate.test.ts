import { describe, expect, it } from "vitest";

import {
  buildAnnualCashAmountUserEstimate,
  buildAnnualYieldUserEstimate,
  isValidPassiveIncomeUserEstimate,
  MAX_PASSIVE_INCOME_USER_CASH_EUR,
  MAX_PASSIVE_INCOME_USER_YIELD_PERCENT,
  normalizePassiveIncomeUserEstimate,
  parsePassiveIncomeEstimateInput,
} from "@/lib/types/passiveIncomeUserEstimate";

describe("passiveIncomeUserEstimate validation", () => {
  it("accepts 4.5 as 4.5% yield", () => {
    const estimate = buildAnnualYieldUserEstimate(4.5, "2026-07-26T10:00:00.000Z");
    expect(estimate).toEqual({
      mode: "annual_yield",
      annualYieldPercent: 4.5,
      updatedAt: "2026-07-26T10:00:00.000Z",
    });
  });

  it("rejects blank, zero, negative, NaN, Infinity and over-bound values", () => {
    expect(parsePassiveIncomeEstimateInput("")).toBeNull();
    expect(parsePassiveIncomeEstimateInput(".")).toBeNull();
    expect(parsePassiveIncomeEstimateInput("abc")).toBeNull();
    expect(buildAnnualYieldUserEstimate(0)).toBeNull();
    expect(buildAnnualYieldUserEstimate(-1)).toBeNull();
    expect(buildAnnualYieldUserEstimate(Number.NaN)).toBeNull();
    expect(buildAnnualYieldUserEstimate(Number.POSITIVE_INFINITY)).toBeNull();
    expect(
      buildAnnualYieldUserEstimate(MAX_PASSIVE_INCOME_USER_YIELD_PERCENT + 0.01),
    ).toBeNull();
    expect(buildAnnualCashAmountUserEstimate(0)).toBeNull();
    expect(buildAnnualCashAmountUserEstimate(-5)).toBeNull();
    expect(
      buildAnnualCashAmountUserEstimate(MAX_PASSIVE_INCOME_USER_CASH_EUR + 1),
    ).toBeNull();
  });

  it("stores only one mode at a time", () => {
    expect(
      isValidPassiveIncomeUserEstimate({
        mode: "annual_yield",
        annualYieldPercent: 3,
        annualCashAmountEur: 100,
        updatedAt: "2026-07-26T10:00:00.000Z",
      }),
    ).toBe(false);

    expect(
      normalizePassiveIncomeUserEstimate({
        mode: "annual_cash_amount",
        annualCashAmountEur: 250,
        annualYieldPercent: 4,
        updatedAt: "2026-07-26T10:00:00.000Z",
      }),
    ).toBeNull();
  });
});
