import { describe, expect, it } from "vitest";

import {
  buildGoalPeriodSnapshot,
  formatGoalPeriodCoverageDate,
  formatGoalPeriodDetail,
  formatGoalPeriodDetailCopy,
  GOAL_PERIOD_PRICE_MOVE_FULL_EXPLANATION,
  GOAL_PERIOD_PRICE_MOVE_SHORT_EXPLANATION,
  GOAL_PERIOD_SKIPPED_HOLDINGS_NOTE,
  GOAL_PROGRESS_PERIOD_ORDER,
  requestedGoalPeriodStartIso,
  sliceHistoryToFiveYears,
  type GoalPeriodHistoryInput,
  type GoalProgressPeriodId,
} from "@/lib/client/goalProgressPeriods";

const AS_OF = new Date("2026-08-31T00:00:00.000Z");
const REAL_EXAMPLE_TARGET = 1_000_000;
const REAL_EXAMPLE_LIVE = 104_745;
const REAL_EXAMPLE_START = 88_446;
const REAL_EXAMPLE_END = 106_312;

function money(value: number): string {
  return `€${value.toLocaleString("en-GB", { maximumFractionDigits: 0 })}`;
}

function twoPointHistory(
  startDate: string,
  startValue: number,
  endDate: string,
  endValue: number,
  extra: Partial<GoalPeriodHistoryInput> = {},
): GoalPeriodHistoryInput {
  return {
    startingValue: startValue,
    endingValue: extra.endingValue ?? endValue,
    investmentReturn: extra.investmentReturn ?? endValue - startValue,
    dataAvailability: extra.dataAvailability ?? "full",
    skippedHoldingCount: extra.skippedHoldingCount ?? 0,
    coveredHoldingCount: extra.coveredHoldingCount ?? 4,
    chartPoints: extra.chartPoints ?? [
      { date: startDate, portfolioValue: startValue, netContributions: null },
      { date: endDate, portfolioValue: endValue, netContributions: null },
    ],
    ...extra,
  };
}

describe("goal progress periods", () => {
  it("uses the same history start and end for euro change and goal-equivalent points", () => {
    const snapshot = buildGoalPeriodSnapshot({
      period: "1Y",
      targetValue: 100_000,
      asOf: AS_OF,
      history: twoPointHistory("2025-08-31", 38_000, "2026-08-31", 42_300, {
        investmentReturn: 2_100,
      }),
    });

    expect(snapshot.available).toBe(true);
    expect(snapshot.startValue).toBe(38_000);
    expect(snapshot.endValue).toBe(42_300);
    expect(snapshot.portfolioChange).toBe(4_300);
    expect(snapshot.portfolioChange).toBe(snapshot.endValue! - snapshot.startValue!);
    expect(snapshot.progressChangePp).toBeCloseTo(
      snapshot.portfolioChange! / 100_000 * 100,
      10,
    );
    expect(snapshot.progressChangePp).toBeCloseTo(4.3, 5);
    expect(snapshot.contributions).toBeNull();
    expect(snapshot.startDateIso).toBe("2025-08-31");
    expect(snapshot.endDateIso).toBe("2026-08-31");

    const copy = formatGoalPeriodDetailCopy(snapshot, money);
    expect(copy.priceMoveLine).toBe("Estimated price move +€4,300");
    expect(copy.equivalentLine).toContain("+4.3 percentage points of your goal");
    expect(copy.priceMoveLine).not.toMatch(/Growth|Profit|Performance|investment return/i);
    expect(copy.equivalentLine).not.toMatch(/Growth|Profit|Performance/i);
    expect(formatGoalPeriodDetail(snapshot, money)).not.toContain("Growth");
  });

  it("reconciles the real 1M example at about €17,866 and +1.8 pp, not +1.6 pp", () => {
    const snapshot = buildGoalPeriodSnapshot({
      period: "1M",
      targetValue: REAL_EXAMPLE_TARGET,
      asOf: AS_OF,
      history: twoPointHistory(
        "2026-07-31",
        REAL_EXAMPLE_START,
        "2026-08-28",
        REAL_EXAMPLE_END,
      ),
    });

    expect(snapshot.portfolioChange).toBe(17_866);
    expect(snapshot.progressChangePp).toBeCloseTo(1.7866, 5);
    expect(snapshot.endValue).toBe(REAL_EXAMPLE_END);
    expect(snapshot.endValue).not.toBe(REAL_EXAMPLE_LIVE);

    const liveSplicedPp =
      ((REAL_EXAMPLE_LIVE - REAL_EXAMPLE_START) / REAL_EXAMPLE_TARGET) * 100;
    expect(liveSplicedPp).toBeCloseTo(1.6299, 3);
    expect(snapshot.progressChangePp).not.toBeCloseTo(liveSplicedPp, 1);

    const copy = formatGoalPeriodDetailCopy(snapshot, money);
    expect(copy.priceMoveLine).toBe("Estimated price move +€17,866");
    expect(copy.equivalentLine).toContain("+1.8 percentage points of your goal");
    expect(copy.equivalentLine).toContain("through 28 Aug");
    expect(copy.equivalentLine).not.toContain("1.6");
    expect(copy.equivalentLine).not.toMatch(/since/i);
  });

  it("does not use live current value as the EOD period end", () => {
    const snapshot = buildGoalPeriodSnapshot({
      period: "1M",
      targetValue: REAL_EXAMPLE_TARGET,
      asOf: AS_OF,
      history: twoPointHistory(
        "2026-07-31",
        REAL_EXAMPLE_START,
        "2026-08-28",
        REAL_EXAMPLE_END,
        { endingValue: REAL_EXAMPLE_LIVE },
      ),
    });

    expect(snapshot.endValue).toBe(REAL_EXAMPLE_END);
    expect(snapshot.portfolioChange).toBe(17_866);
    expect(
      Object.prototype.hasOwnProperty.call(
        {
          period: "1M",
          targetValue: REAL_EXAMPLE_TARGET,
          history: twoPointHistory(
            "2026-07-31",
            REAL_EXAMPLE_START,
            "2026-08-28",
            REAL_EXAMPLE_END,
          ),
        },
        "currentValue",
      ),
    ).toBe(false);
  });

  it("does not treat a short all-time series as 5-year history", () => {
    const sliced = sliceHistoryToFiveYears(
      twoPointHistory("2025-01-01", 10_000, "2026-08-31", 12_000),
      AS_OF,
    );

    expect(sliced).toBeNull();

    const snapshot = buildGoalPeriodSnapshot({
      period: "5Y",
      targetValue: 100_000,
      asOf: AS_OF,
      history: sliced,
    });
    expect(snapshot.available).toBe(false);
    expect(snapshot.message).toMatch(/5-year history/);
    expect(snapshot.message).toBe("Not enough 5-year history yet.");
  });

  it("slices a genuine 5-year series from its in-window EOD ends, without inventing contributions", () => {
    const sliced = sliceHistoryToFiveYears(
      {
        startingValue: 8_000,
        endingValue: 20_000,
        investmentReturn: 12_000,
        dataAvailability: "full",
        skippedHoldingCount: 0,
        chartPoints: [
          { date: "2020-08-31", portfolioValue: 8_000, netContributions: 1_000 },
          { date: "2021-08-31", portfolioValue: 11_000, netContributions: 2_000 },
          { date: "2026-08-31", portfolioValue: 20_000, netContributions: 5_000 },
        ],
      },
      AS_OF,
    );

    expect(sliced?.startingValue).toBe(11_000);
    expect(sliced?.investmentReturn).toBeNull();

    const snapshot = buildGoalPeriodSnapshot({
      period: "5Y",
      targetValue: 100_000,
      asOf: AS_OF,
      history: sliced,
    });
    expect(snapshot.available).toBe(true);
    expect(snapshot.startValue).toBe(11_000);
    expect(snapshot.endValue).toBe(20_000);
    expect(snapshot.portfolioChange).toBe(9_000);
    expect(snapshot.progressChangePp).toBeCloseTo(9, 5);
    expect(snapshot.contributions).toBeNull();
    expect(formatGoalPeriodDetail(snapshot, money)).not.toContain("Contributions");
    expect(formatGoalPeriodDetail(snapshot, money)).not.toContain("Growth");
  });

  it("stays unavailable when history itself is unavailable", () => {
    const snapshot = buildGoalPeriodSnapshot({
      period: "1M",
      targetValue: 100_000,
      asOf: AS_OF,
      history: {
        startingValue: null,
        endingValue: null,
        investmentReturn: null,
        dataAvailability: "unavailable",
        availabilityMessage: "No history",
        chartPoints: [],
      },
    });
    expect(snapshot.available).toBe(false);
    expect(snapshot.progressChangePp).toBeNull();
    expect(snapshot.message).toBe("Not enough history for this period yet.");
  });

  it("stays unavailable when fewer than two reliable aligned points exist", () => {
    const snapshot = buildGoalPeriodSnapshot({
      period: "1Y",
      targetValue: 100_000,
      asOf: AS_OF,
      history: {
        startingValue: 38_000,
        endingValue: 42_300,
        investmentReturn: 4_300,
        dataAvailability: "full",
        chartPoints: [
          { date: "2026-08-31", portfolioValue: 42_300, netContributions: null },
        ],
      },
    });
    expect(snapshot.available).toBe(false);
    expect(snapshot.portfolioChange).toBeNull();
    expect(snapshot.progressChangePp).toBeNull();
    expect(snapshot.startDateIso).toBeNull();
    expect(snapshot.endDateIso).toBeNull();
  });

  it("does not present a late first EOD as complete period coverage", () => {
    const snapshot = buildGoalPeriodSnapshot({
      period: "1M",
      targetValue: REAL_EXAMPLE_TARGET,
      asOf: AS_OF,
      history: twoPointHistory(
        "2026-08-20",
        REAL_EXAMPLE_START,
        "2026-08-28",
        REAL_EXAMPLE_END,
      ),
    });

    expect(snapshot.coverageIsPartialWindow).toBe(true);
    expect(snapshot.startDateIso).toBe("2026-08-20");
    expect(snapshot.endDateIso).toBe("2026-08-28");
    expect(snapshot.requestedStartIso).toBe(requestedGoalPeriodStartIso("1M", AS_OF));

    const copy = formatGoalPeriodDetailCopy(snapshot, money);
    expect(copy.equivalentLine).toMatch(/since 20 Aug/i);
    expect(copy.equivalentLine).toContain("through 28 Aug");
    expect(copy.coverageRangeLabel).toBe("20 Aug to 28 Aug");
  });

  it("discloses skipped-holding coverage when the estimate excludes holdings", () => {
    const snapshot = buildGoalPeriodSnapshot({
      period: "1Y",
      targetValue: 100_000,
      asOf: AS_OF,
      history: twoPointHistory("2025-08-31", 38_000, "2026-08-31", 42_300, {
        skippedHoldingCount: 2,
        coveredHoldingCount: 3,
      }),
    });

    expect(snapshot.skippedHoldingCount).toBe(2);
    const copy = formatGoalPeriodDetailCopy(snapshot, money);
    expect(copy.skippedHoldingsLine).toBe(GOAL_PERIOD_SKIPPED_HOLDINGS_NOTE);
  });

  it("uses the same EOD endpoint contract for 1M, 1Y, 5Y and All", () => {
    const sharedEnd = 20_000;
    const histories: Record<GoalProgressPeriodId, GoalPeriodHistoryInput | null> = {
      "1M": twoPointHistory("2026-07-31", 11_000, "2026-08-31", sharedEnd),
      "1Y": twoPointHistory("2025-08-31", 11_000, "2026-08-31", sharedEnd),
      ALL: twoPointHistory("2020-08-31", 11_000, "2026-08-31", sharedEnd),
      "5Y": sliceHistoryToFiveYears(
        {
          startingValue: 8_000,
          endingValue: sharedEnd,
          investmentReturn: 12_000,
          dataAvailability: "full",
          chartPoints: [
            { date: "2020-08-31", portfolioValue: 8_000, netContributions: null },
            { date: "2021-08-31", portfolioValue: 11_000, netContributions: null },
            { date: "2026-08-31", portfolioValue: sharedEnd, netContributions: null },
          ],
        },
        AS_OF,
      ),
    };

    expect(GOAL_PROGRESS_PERIOD_ORDER).toEqual(["1M", "1Y", "5Y", "ALL"]);

    for (const period of GOAL_PROGRESS_PERIOD_ORDER) {
      const snapshot = buildGoalPeriodSnapshot({
        period,
        targetValue: 100_000,
        asOf: AS_OF,
        history: histories[period],
      });
      expect(snapshot.available, period).toBe(true);
      expect(snapshot.endValue, period).toBe(sharedEnd);
      expect(snapshot.startValue, period).toBe(11_000);
      expect(snapshot.portfolioChange, period).toBe(9_000);
      expect(snapshot.progressChangePp, period).toBeCloseTo(9, 5);
      expect(snapshot.contributions, period).toBeNull();
      expect(snapshot.startDateIso, period).toBeTruthy();
      expect(snapshot.endDateIso, period).toBe("2026-08-31");
      expect(snapshot.requestedStartIso, period).toBe(
        requestedGoalPeriodStartIso(period, AS_OF),
      );
    }
  });

  it("does not invent contribution or transaction values", () => {
    const snapshot = buildGoalPeriodSnapshot({
      period: "ALL",
      targetValue: 100_000,
      asOf: AS_OF,
      history: {
        startingValue: 10_000,
        endingValue: 20_000,
        investmentReturn: 7_000,
        dataAvailability: "full",
        chartPoints: [
          { date: "2020-08-31", portfolioValue: 10_000, netContributions: 2_000 },
          { date: "2026-08-31", portfolioValue: 20_000, netContributions: 5_000 },
        ],
      },
    });

    expect(snapshot.contributions).toBeNull();
    expect(formatGoalPeriodDetail(snapshot, money)).not.toMatch(/contribution/i);
    expect(formatGoalPeriodDetailCopy(snapshot, money).fullExplanation).toBe(
      GOAL_PERIOD_PRICE_MOVE_FULL_EXPLANATION,
    );
    expect(formatGoalPeriodDetailCopy(snapshot, money).shortExplanation).toBe(
      GOAL_PERIOD_PRICE_MOVE_SHORT_EXPLANATION,
    );
  });

  it("localizes EOD coverage dates in en-GB UTC", () => {
    expect(formatGoalPeriodCoverageDate("2026-08-28")).toBe("28 Aug");
    expect(
      formatGoalPeriodCoverageDate("2020-08-31", { includeYear: true }),
    ).toBe("31 Aug 2020");
  });
});
