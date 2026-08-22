import { describe, expect, it } from "vitest";

import {
  annualizePeriodReturn,
  buildGoalRealityCandidatesFromHistory,
  buildGoalRealityCheck,
  classifyHistoryQuality,
  derivePeriodReturnFromChartPoints,
  GOAL_REALITY_INLINE_TOLERANCE_PP,
  selectGoalRealityCandidate,
  type GoalRealityPeriodCandidate,
} from "@/lib/services/goals/buildGoalRealityCheck";

function candidate(
  overrides: Partial<GoalRealityPeriodCandidate> &
    Pick<GoalRealityPeriodCandidate, "periodId" | "periodReturnDecimal" | "yearsRepresented">,
): GoalRealityPeriodCandidate {
  return {
    sourcePeriodLabel: "the last test window",
    dataAvailability: "full",
    historicalFxApproximate: false,
    coveredHoldingCount: 3,
    skippedHoldingCount: 0,
    constantHoldingsReconstructed: true,
    ...overrides,
  };
}

describe("annualizePeriodReturn", () => {
  it("annualizes 6 months with compound formula", () => {
    // 5% over 0.5y → (1.05)^2 - 1 = 10.25%
    const annual = annualizePeriodReturn(0.05, 0.5);
    expect(annual).toBeCloseTo(10.25, 2);
  });

  it("annualizes 3 months with compound formula", () => {
    const annual = annualizePeriodReturn(0.02, 0.25);
    expect(annual).toBeCloseTo((Math.pow(1.02, 4) - 1) * 100, 5);
  });

  it("annualizes 1 month with compound formula", () => {
    const annual = annualizePeriodReturn(0.01, 1 / 12);
    expect(annual).toBeCloseTo((Math.pow(1.01, 12) - 1) * 100, 5);
  });

  it("annualizes 1 week with compound formula", () => {
    const annual = annualizePeriodReturn(0.002, 7 / 365.25);
    expect(annual).toBeCloseTo(
      (Math.pow(1.002, 365.25 / 7) - 1) * 100,
      4,
    );
  });

  it("handles negative period returns safely", () => {
    const annual = annualizePeriodReturn(-0.1, 0.5);
    expect(annual).toBeCloseTo((Math.pow(0.9, 2) - 1) * 100, 5);
    expect(annual!).toBeLessThan(0);
  });

  it("returns null for invalid growth ratios", () => {
    expect(annualizePeriodReturn(-1.5, 0.5)).toBeNull();
    expect(annualizePeriodReturn(0.1, 0)).toBeNull();
  });
});

describe("buildGoalRealityCheck", () => {
  it("compares 20% assumption vs ~10% annualized pace in percentage points", () => {
    const check = buildGoalRealityCheck({
      expectedAnnualReturnPercent: 20,
      candidates: [
        candidate({
          periodId: "6M",
          periodReturnDecimal: 0.05,
          yearsRepresented: 0.5,
          sourcePeriodLabel: "the last 6 months",
        }),
      ],
    });
    expect(check.available).toBe(true);
    if (!check.available) return;
    expect(check.comparableAnnualPercent).toBeCloseTo(10.3, 0);
    expect(check.gapPp).toBeCloseTo(check.comparableAnnualPercent - 20, 1);
    expect(check.gapPp).toBeLessThan(0);
    expect(check.conclusion).toMatch(/percentage points above your recent annualized pace/i);
    expect(check.conclusion).not.toMatch(/\b(unrealistic|optimistic|advice|buy|sell)\b/i);
  });

  it("reports when actual pace is above the assumption", () => {
    const check = buildGoalRealityCheck({
      expectedAnnualReturnPercent: 8,
      candidates: [
        candidate({
          periodId: "1Y",
          periodReturnDecimal: 0.14,
          yearsRepresented: 1,
          sourcePeriodLabel: "the last 12 months",
        }),
      ],
    });
    expect(check.available).toBe(true);
    if (!check.available) return;
    expect(check.comparableKind).toBe("last_12_months");
    expect(check.comparableAnnualPercent).toBe(14);
    expect(check.gapPp).toBe(6);
    expect(check.conclusion).toMatch(/last 12-month return is 6 percentage points above/i);
  });

  it("uses broadly in line within tolerance", () => {
    const check = buildGoalRealityCheck({
      expectedAnnualReturnPercent: 10,
      candidates: [
        candidate({
          periodId: "1Y",
          periodReturnDecimal: 0.105,
          yearsRepresented: 1,
          sourcePeriodLabel: "the last 12 months",
        }),
      ],
    });
    expect(check.available).toBe(true);
    if (!check.available) return;
    expect(Math.abs(check.gapPp)).toBeLessThan(GOAL_REALITY_INLINE_TOLERANCE_PP);
    expect(check.conclusion).toMatch(/broadly in line/i);
  });

  it("prefers multi-year annualized performance when ALL span is long", () => {
    const check = buildGoalRealityCheck({
      expectedAnnualReturnPercent: 10,
      candidates: [
        candidate({
          periodId: "1W",
          periodReturnDecimal: 0.02,
          yearsRepresented: 7 / 365.25,
          sourcePeriodLabel: "the last week",
        }),
        candidate({
          periodId: "ALL",
          periodReturnDecimal: 0.4,
          yearsRepresented: 4,
          sourcePeriodLabel: "4 years of history",
        }),
      ],
    });
    expect(check.available).toBe(true);
    if (!check.available) return;
    expect(check.periodId).toBe("ALL");
    expect(check.comparableKind).toBe("annualized_performance");
    expect(check.historyQuality).toBe("strong");
  });

  it("marks short history with explanatory note", () => {
    const check = buildGoalRealityCheck({
      expectedAnnualReturnPercent: 10,
      candidates: [
        candidate({
          periodId: "1M",
          periodReturnDecimal: 0.02,
          yearsRepresented: 30 / 365.25,
          sourcePeriodLabel: "the last month",
        }),
      ],
    });
    expect(check.available).toBe(true);
    if (!check.available) return;
    expect(check.historyQuality).toBe("short");
    expect(check.comparableKind).toBe("recent_annualized_pace");
    expect(check.qualityNote).toMatch(/Short-term performance can vary/i);
  });

  it("discloses constant-holdings methodology", () => {
    const check = buildGoalRealityCheck({
      expectedAnnualReturnPercent: 10,
      candidates: [
        candidate({
          periodId: "1Y",
          periodReturnDecimal: 0.08,
          yearsRepresented: 1,
          sourcePeriodLabel: "the last 12 months",
          historicalFxApproximate: true,
          dataAvailability: "partial",
        }),
      ],
    });
    expect(check.available).toBe(true);
    if (!check.available) return;
    expect(check.methodologyNote).toMatch(/constant current holdings/i);
    expect(check.methodologyNote).toMatch(/not adjusted for deposits/i);
    expect(check.methodologyNote).toMatch(/FX/i);
    expect(check.disclaimer).toMatch(/not a forecast or advice/i);
  });

  it("returns unavailable without expected return", () => {
    const check = buildGoalRealityCheck({
      expectedAnnualReturnPercent: null,
      candidates: [
        candidate({
          periodId: "1Y",
          periodReturnDecimal: 0.1,
          yearsRepresented: 1,
          sourcePeriodLabel: "the last 12 months",
        }),
      ],
    });
    expect(check.available).toBe(false);
  });

  it("returns unavailable without history", () => {
    const check = buildGoalRealityCheck({
      expectedAnnualReturnPercent: 10,
      candidates: [],
    });
    expect(check.available).toBe(false);
  });

  it("still surfaces extreme short-term annualized results with short-history note", () => {
    const check = buildGoalRealityCheck({
      expectedAnnualReturnPercent: 10,
      candidates: [
        candidate({
          periodId: "1W",
          periodReturnDecimal: 0.05,
          yearsRepresented: 7 / 365.25,
          sourcePeriodLabel: "the last week",
        }),
      ],
    });
    expect(check.available).toBe(true);
    if (!check.available) return;
    expect(Math.abs(check.comparableAnnualPercent)).toBeGreaterThan(50);
    expect(check.qualityNote).toMatch(/week/i);
  });
});

describe("selectGoalRealityCandidate hierarchy", () => {
  it("does not prefer short ALL span over verified 1Y", () => {
    const selected = selectGoalRealityCandidate([
      candidate({
        periodId: "ALL",
        periodReturnDecimal: 0.05,
        yearsRepresented: 0.8,
        sourcePeriodLabel: "available portfolio history",
      }),
      candidate({
        periodId: "1Y",
        periodReturnDecimal: 0.09,
        yearsRepresented: 1,
        sourcePeriodLabel: "the last 12 months",
      }),
    ]);
    expect(selected?.periodId).toBe("1Y");
  });
});

describe("derivePeriodReturnFromChartPoints", () => {
  it("derives a 6M window from verified points", () => {
    const points = [
      { date: "2025-08-17", portfolioValue: 100_000, netContributions: null, investmentReturn: null },
      { date: "2025-11-17", portfolioValue: 102_000, netContributions: null, investmentReturn: null },
      { date: "2026-02-17", portfolioValue: 105_000, netContributions: null, investmentReturn: null },
    ];
    const derived = derivePeriodReturnFromChartPoints(points, 182);
    expect(derived).not.toBeNull();
    expect(derived!.periodReturnDecimal).toBeCloseTo(0.05, 5);
  });
});

describe("buildGoalRealityCandidatesFromHistory", () => {
  it("builds 6M/3M candidates from longer series when span allows", () => {
    const points = [];
    for (let i = 0; i <= 200; i += 10) {
      const date = new Date(Date.UTC(2026, 0, 1));
      date.setUTCDate(date.getUTCDate() + i);
      points.push({
        date: date.toISOString().slice(0, 10),
        portfolioValue: 100_000 * (1 + i / 2000),
        netContributions: null,
        investmentReturn: null,
      });
    }
    const candidates = buildGoalRealityCandidatesFromHistory([
      {
        periodId: "1Y",
        success: true,
        investmentReturnPercent: 8,
        startingValue: 100_000,
        endingValue: 108_000,
        chartPoints: points,
        dataAvailability: "full",
        availabilityMessage: null,
        historicalFxApproximate: false,
        coveredHoldingCount: 2,
        skippedHoldingCount: 0,
        spanDays: 365,
      },
    ]);
    expect(candidates.some((row) => row.periodId === "1Y")).toBe(true);
    expect(candidates.some((row) => row.periodId === "6M")).toBe(true);
  });
});

describe("classifyHistoryQuality", () => {
  it("classifies strong / moderate / short", () => {
    expect(classifyHistoryQuality(1.2)).toBe("strong");
    expect(classifyHistoryQuality(0.5)).toBe("moderate");
    expect(classifyHistoryQuality(0.1)).toBe("short");
  });
});
