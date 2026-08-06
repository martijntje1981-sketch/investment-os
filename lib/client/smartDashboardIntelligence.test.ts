import { describe, expect, it } from "vitest";

import {
  BRIEFING_FORBIDDEN_ADVISORY_PATTERNS,
} from "@/lib/client/dailyPortfolioBriefing";
import {
  buildSmartDashboardIntelligence,
  detectGoalMilestonePercent,
  heroAndMarketShareDuplicateSentence,
  resolveTodaysFocus,
} from "@/lib/client/smartDashboardIntelligence";
import type { UpcomingMarketEvent } from "@/lib/types/newsContent";

function atAmsterdamHour(hour: number): Date {
  return new Date(`2026-08-04T${String(hour).padStart(2, "0")}:30:00+02:00`);
}

function event(
  overrides: Partial<UpcomingMarketEvent> = {},
): UpcomingMarketEvent {
  return {
    id: "evt-1",
    title: "FOMC rate decision",
    category: "fed",
    date: "2026-08-04",
    timeLabel: "20:00",
    country: "US",
    description: "",
    impact: "High",
    source: "calendar",
    ...overrides,
  };
}

describe("smartDashboardIntelligence", () => {
  it("detects goal milestones inside a narrow window", () => {
    expect(detectGoalMilestonePercent(50, false)).toBe(50);
    expect(detectGoalMilestonePercent(54, false)).toBe(50);
    expect(detectGoalMilestonePercent(56, false)).toBeNull();
    expect(detectGoalMilestonePercent(100, true)).toBe(100);
  });

  it("uses calm copy when the overnight move is small", () => {
    const result = buildSmartDashboardIntelligence({
      firstName: "Martijn",
      now: atAmsterdamHour(9),
      holdingCount: 3,
      hasDailyData: true,
      todayPercent: 0.1,
      usesPreviousClose: true,
      hasSavedGoal: true,
      goalStatus: "On track",
      goalProgressPercent: 40,
    });
    expect(result.scenario).toBe("calm");
    expect(result.briefing.text).toContain("remains on track");
    expect(result.briefing.text).toContain("Nothing important changed");
    expect(result.briefing.sentences.length).toBeLessThanOrEqual(2);
    expect(result.todaysFocus).toBeNull();
  });

  it("handles strong gain and large decline scenarios", () => {
    const gain = buildSmartDashboardIntelligence({
      firstName: "Martijn",
      now: atAmsterdamHour(9),
      holdingCount: 2,
      hasDailyData: true,
      todayPercent: 1.3,
      usesPreviousClose: false,
      ledByName: "Bitcoin",
    });
    expect(gain.scenario).toBe("strong_gain");
    expect(gain.briefing.text).toContain("gained");
    expect(gain.briefing.text).toContain("Bitcoin was the strongest contributor");
    expect(gain.emphasis.heroElevated).toBe(true);

    const drop = buildSmartDashboardIntelligence({
      firstName: "Martijn",
      now: atAmsterdamHour(9),
      holdingCount: 2,
      hasDailyData: true,
      todayPercent: -1.4,
      usesPreviousClose: false,
      ledByName: "VWCE",
    });
    expect(drop.scenario).toBe("large_decline");
    expect(drop.briefing.text).toContain("declined");
    expect(drop.briefing.text).toContain("VWCE led the decline");
  });

  it("surfaces goal milestone in hero and Today's Focus", () => {
    const result = buildSmartDashboardIntelligence({
      firstName: "Martijn",
      now: atAmsterdamHour(9),
      holdingCount: 2,
      hasDailyData: true,
      todayPercent: 0.2,
      usesPreviousClose: false,
      hasSavedGoal: true,
      goalProgressPercent: 50,
      goalReached: false,
    });
    expect(result.scenario).toBe("goal_milestone");
    expect(result.briefing.text).toContain("Congratulations");
    expect(result.briefing.text).toContain("50%");
    expect(result.todaysFocus?.kind).toBe("goal_milestone");
    expect(result.emphasis.exploreGoalsHighlight).toBe(true);
  });

  it("shows Today's Focus only when meaningful", () => {
    expect(
      resolveTodaysFocus({
        holdingCount: 2,
        hasDailyData: true,
        todayPercent: 0.2,
        usesPreviousClose: false,
        hasSavedGoal: false,
        concentrationWeightPercent: 10,
      }),
    ).toBeNull();

    expect(
      resolveTodaysFocus({
        holdingCount: 2,
        hasDailyData: true,
        todayPercent: 0.2,
        usesPreviousClose: false,
        upcomingEvents: [event()],
      })?.label,
    ).toBe("Fed meeting");

    expect(
      resolveTodaysFocus({
        holdingCount: 2,
        hasDailyData: true,
        todayPercent: 0.2,
        usesPreviousClose: false,
        concentrationWeightPercent: 55,
      })?.kind,
    ).toBe("concentration");
  });

  it("keeps hero personal and never invents advisory language", () => {
    const result = buildSmartDashboardIntelligence({
      firstName: "Martijn",
      now: atAmsterdamHour(9),
      holdingCount: 2,
      hasDailyData: true,
      todayPercent: 0.6,
      usesPreviousClose: false,
      ledByName: "Bitcoin",
      intelligence: {
        mustWatch: {
          title: "Inflation cools more than expected",
          reason: "the latest inflation update",
          sourceName: "Reuters",
        },
      } as never,
    });
    expect(result.briefing.text).not.toContain("most relevant development");
    expect(result.briefing.text).not.toContain("Inflation cools");
    for (const pattern of BRIEFING_FORBIDDEN_ADVISORY_PATTERNS) {
      expect(result.briefing.text).not.toMatch(pattern);
    }
  });

  it("detects duplicate wording across hero and market surfaces", () => {
    expect(
      heroAndMarketShareDuplicateSentence(
        "Good morning. Your portfolio remains on track.",
        "Your portfolio remains on track toward its current goal.",
        null,
      ),
    ).toBe(true);
    expect(
      heroAndMarketShareDuplicateSentence(
        "Good morning. Your portfolio gained +1.3%.",
        "Inflation cools more than expected",
        "CPI print due later today",
      ),
    ).toBe(false);
  });

  it("does not perform network work", () => {
    const originalFetch = globalThis.fetch;
    let fetchCalled = false;
    globalThis.fetch = (() => {
      fetchCalled = true;
      return Promise.reject(new Error("unexpected fetch"));
    }) as typeof fetch;
    try {
      buildSmartDashboardIntelligence({
        holdingCount: 1,
        hasDailyData: true,
        todayPercent: 0,
        usesPreviousClose: false,
      });
      expect(fetchCalled).toBe(false);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
