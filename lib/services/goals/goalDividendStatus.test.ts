import { describe, expect, it } from "vitest";

import {
  buildGoalDividendMessage,
  getGoalDividendReliability,
} from "@/lib/services/goals/goalDividendStatus";
import type { PassiveIncomeProjectionSnapshot } from "@/lib/types/dividends";

const emptyProjection: PassiveIncomeProjectionSnapshot = {
  eligibleEstimatedAnnualCashDistributionEur: 0,
  eligibleHoldingsCount: 0,
  contributingHoldingsCount: 0,
  excludedHoldingsCount: 0,
  awaitingDataHoldingsCount: 0,
  hasUsableEstimate: false,
  holdingRecords: [],
  updatedAt: null,
};

describe("goalDividendStatus", () => {
  it("marks reliable dividend data when eligible estimates are present", () => {
    const projection: PassiveIncomeProjectionSnapshot = {
      ...emptyProjection,
      hasUsableEstimate: true,
      eligibleEstimatedAnnualCashDistributionEur: 1_200,
      contributingHoldingsCount: 2,
      eligibleHoldingsCount: 2,
      updatedAt: "2026-07-20T08:00:00.000Z",
    };

    expect(getGoalDividendReliability(projection)).toBe("reliable");
    expect(buildGoalDividendMessage("reliable", projection)).toContain("eligible holding");
  });

  it("marks partial reliability when eligible holdings exist without income", () => {
    const projection: PassiveIncomeProjectionSnapshot = {
      ...emptyProjection,
      eligibleHoldingsCount: 1,
      awaitingDataHoldingsCount: 1,
      updatedAt: "2026-07-20T08:00:00.000Z",
    };

    expect(getGoalDividendReliability(projection)).toBe("partial");
    expect(buildGoalDividendMessage("partial", projection)).toContain("reliable annual distribution data");
  });

  it("falls back to unavailable without fabricating values", () => {
    expect(getGoalDividendReliability(emptyProjection)).toBe("unavailable");
    expect(buildGoalDividendMessage("unavailable", emptyProjection)).toContain(
      "temporarily unavailable",
    );
  });
});
