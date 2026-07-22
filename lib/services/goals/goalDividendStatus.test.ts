import { describe, expect, it } from "vitest";

import {
  buildGoalDividendMessage,
  getGoalDividendReliability,
} from "@/lib/services/goals/goalDividendStatus";
import type { PortfolioDividendSnapshot } from "@/lib/types/dividends";

const emptySnapshot: PortfolioDividendSnapshot = {
  estimatedAnnualIncomeEur: 0,
  hasDividendData: false,
  payingHoldingsCount: 0,
  portfolioYieldPercent: 0,
  averageYieldPercent: 0,
  highestYield: null,
  largestContributor: null,
  concentrationSharePercent: 0,
  incomeDiversificationLabel: "moderate",
  allocation: [],
  nextPayment: null,
  observations: [],
  insight: "",
  updatedAt: null,
};

describe("goalDividendStatus", () => {
  it("marks reliable dividend data when income is present", () => {
    const snapshot: PortfolioDividendSnapshot = {
      ...emptySnapshot,
      hasDividendData: true,
      estimatedAnnualIncomeEur: 1_200,
      payingHoldingsCount: 2,
      updatedAt: "2026-07-20T08:00:00.000Z",
    };

    expect(getGoalDividendReliability(snapshot)).toBe("reliable");
    expect(buildGoalDividendMessage("reliable")).toContain("verified dividend data");
  });

  it("marks partial reliability when some metadata exists without income", () => {
    const snapshot: PortfolioDividendSnapshot = {
      ...emptySnapshot,
      payingHoldingsCount: 1,
      updatedAt: "2026-07-20T08:00:00.000Z",
    };

    expect(getGoalDividendReliability(snapshot)).toBe("partial");
    expect(buildGoalDividendMessage("partial")).toContain("incomplete");
  });

  it("falls back to unavailable without fabricating values", () => {
    expect(getGoalDividendReliability(emptySnapshot)).toBe("unavailable");
    expect(buildGoalDividendMessage("unavailable")).toContain("temporarily unavailable");
  });
});
