import { describe, expect, it } from "vitest";

import {
  buildGoalPeriodSnapshot,
  formatGoalPeriodDetail,
  sliceHistoryToFiveYears,
} from "@/lib/client/goalProgressPeriods";

describe("goal progress periods", () => {
  it("uses verified start/end values without inventing contributions", () => {
    const snapshot = buildGoalPeriodSnapshot({
      period: "1Y",
      targetValue: 100_000,
      currentValue: 42_300,
      history: {
        startingValue: 38_000,
        endingValue: 42_300,
        investmentReturn: 2_100,
        dataAvailability: "full",
        chartPoints: [
          { date: "2025-08-31", portfolioValue: 38_000, netContributions: null },
          { date: "2026-08-31", portfolioValue: 42_300, netContributions: null },
        ],
      },
    });

    expect(snapshot.available).toBe(true);
    expect(snapshot.progressChangePp).toBeCloseTo(4.3, 5);
    expect(snapshot.contributions).toBeNull();
    expect(snapshot.investmentReturn).toBe(2_100);
    expect(formatGoalPeriodDetail(snapshot, (value) => `€${value}`)).toContain(
      "4.3 pp of goal",
    );
    expect(formatGoalPeriodDetail(snapshot, (value) => `€${value}`)).toContain(
      "Growth €2100",
    );
  });

  it("does not treat a short all-time series as 5-year history", () => {
    const sliced = sliceHistoryToFiveYears(
      {
        startingValue: 10_000,
        endingValue: 12_000,
        investmentReturn: 2_000,
        dataAvailability: "full",
        chartPoints: [
          { date: "2025-01-01", portfolioValue: 10_000, netContributions: null },
          { date: "2026-08-31", portfolioValue: 12_000, netContributions: null },
        ],
      },
      new Date("2026-08-31T00:00:00.000Z"),
    );

    expect(sliced).toBeNull();

    const snapshot = buildGoalPeriodSnapshot({
      period: "5Y",
      targetValue: 100_000,
      currentValue: 12_000,
      history: sliced,
    });
    expect(snapshot.available).toBe(false);
    expect(snapshot.message).toMatch(/5-year history/);
  });

  it("slices a genuine 5-year series and does not reuse all-time growth", () => {
    const sliced = sliceHistoryToFiveYears(
      {
        startingValue: 8_000,
        endingValue: 20_000,
        investmentReturn: 12_000,
        dataAvailability: "full",
        chartPoints: [
          { date: "2020-08-31", portfolioValue: 8_000, netContributions: 1_000 },
          { date: "2021-08-31", portfolioValue: 11_000, netContributions: 2_000 },
          { date: "2026-08-31", portfolioValue: 20_000, netContributions: 5_000 },
        ],
      },
      new Date("2026-08-31T00:00:00.000Z"),
    );

    expect(sliced?.startingValue).toBe(11_000);
    expect(sliced?.investmentReturn).toBeNull();

    const snapshot = buildGoalPeriodSnapshot({
      period: "5Y",
      targetValue: 100_000,
      currentValue: 20_000,
      history: sliced,
    });
    expect(snapshot.available).toBe(true);
    expect(snapshot.investmentReturn).toBeNull();
    expect(snapshot.contributions).toBe(3_000);
    expect(snapshot.portfolioChange).toBe(9_000);
  });

  it("stays unavailable when history itself is unavailable", () => {
    const snapshot = buildGoalPeriodSnapshot({
      period: "1M",
      targetValue: 100_000,
      currentValue: 42_300,
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
  });
});
