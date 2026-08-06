import { describe, expect, it } from "vitest";

import {
  BRIEFING_FORBIDDEN_ADVISORY_PATTERNS,
  buildDailyPortfolioBriefing,
  deriveBriefingMarketTopic,
  previousClosePhraseFromContextLine,
  resolveTimeAwareGreetingPhrase,
} from "@/lib/client/dailyPortfolioBriefing";

function atAmsterdamHour(hour: number): Date {
  // Fixed calendar day; hour interpreted via Europe/Amsterdam formatter in SUT.
  return new Date(`2026-08-04T${String(hour).padStart(2, "0")}:30:00+02:00`);
}

describe("dailyPortfolioBriefing", () => {
  it("uses morning, afternoon and evening greetings", () => {
    expect(resolveTimeAwareGreetingPhrase(atAmsterdamHour(8))).toBe(
      "Good morning",
    );
    expect(resolveTimeAwareGreetingPhrase(atAmsterdamHour(14))).toBe(
      "Good afternoon",
    );
    expect(resolveTimeAwareGreetingPhrase(atAmsterdamHour(20))).toBe(
      "Good evening",
    );
  });

  it("renders the first name when available", () => {
    const result = buildDailyPortfolioBriefing({
      firstName: "Martijn",
      now: atAmsterdamHour(9),
      holdingCount: 3,
      hasDailyData: true,
      todayPercent: 0.8,
      usesPreviousClose: false,
      ledByName: "Bitcoin",
    });
    expect(result.greeting).toBe("Good morning, Martijn.");
    expect(result.text).toContain("Your portfolio is up +0.8%, led by Bitcoin.");
  });

  it("falls back when the first name is missing", () => {
    const result = buildDailyPortfolioBriefing({
      firstName: null,
      now: atAmsterdamHour(9),
      holdingCount: 2,
      hasDailyData: true,
      todayPercent: 0.5,
      usesPreviousClose: false,
    });
    expect(result.greeting).toBe("Good morning.");
    expect(result.text).not.toContain("null");
  });

  it("handles positive, negative and unchanged performance", () => {
    expect(
      buildDailyPortfolioBriefing({
        firstName: "Alex",
        now: atAmsterdamHour(10),
        holdingCount: 1,
        hasDailyData: true,
        todayPercent: 1.2,
        usesPreviousClose: false,
      }).sentences[0],
    ).toContain("up +1.2%");

    expect(
      buildDailyPortfolioBriefing({
        firstName: "Alex",
        now: atAmsterdamHour(10),
        holdingCount: 1,
        hasDailyData: true,
        todayPercent: -0.4,
        usesPreviousClose: false,
      }).sentences[0],
    ).toContain("down −0.4%");

    expect(
      buildDailyPortfolioBriefing({
        firstName: "Alex",
        now: atAmsterdamHour(10),
        holdingCount: 1,
        hasDailyData: true,
        todayPercent: 0,
        usesPreviousClose: false,
      }).sentences[0],
    ).toContain("unchanged");
  });

  it("uses previous-close wording when prices are not live", () => {
    const result = buildDailyPortfolioBriefing({
      firstName: "Martijn",
      now: atAmsterdamHour(9),
      holdingCount: 2,
      hasDailyData: true,
      todayPercent: 0.8,
      usesPreviousClose: true,
      previousClosePhrase: "Friday's market close",
      ledByName: "Bitcoin",
    });
    expect(result.sentences[0]).toContain("latest available portfolio move");
    expect(result.sentences[0]).toContain("Friday's market close");
    expect(result.sentences[0]).not.toMatch(/\btoday\b/i);
  });

  it("handles insufficient performance data", () => {
    const result = buildDailyPortfolioBriefing({
      firstName: "Martijn",
      now: atAmsterdamHour(9),
      holdingCount: 2,
      hasDailyData: false,
      todayPercent: 0,
      usesPreviousClose: false,
    });
    expect(result.text).toContain("More performance history is needed");
    expect(result.deepLink?.label).toBe("View portfolio intelligence");
  });

  it("handles the no-holdings state", () => {
    const result = buildDailyPortfolioBriefing({
      firstName: "Martijn",
      now: atAmsterdamHour(9),
      holdingCount: 0,
      hasDailyData: false,
      todayPercent: 0,
      usesPreviousClose: false,
    });
    expect(result.text).toContain(
      "Add or import your holdings to receive a personalised portfolio briefing.",
    );
    expect(result.deepLink).toBeNull();
  });

  it("omits the market sentence when no topic is available", () => {
    const result = buildDailyPortfolioBriefing({
      firstName: "Martijn",
      now: atAmsterdamHour(9),
      holdingCount: 2,
      hasDailyData: true,
      todayPercent: 0.3,
      usesPreviousClose: false,
      marketTopic: null,
    });
    expect(result.sentences).toHaveLength(1);
    expect(result.text).not.toContain("most relevant development");
  });

  it("never uses advisory language", () => {
    const result = buildDailyPortfolioBriefing({
      firstName: "Martijn",
      now: atAmsterdamHour(9),
      holdingCount: 2,
      hasDailyData: true,
      todayPercent: 0.8,
      usesPreviousClose: false,
      ledByName: "Bitcoin",
      marketTopic: "the latest inflation update",
    });
    for (const pattern of BRIEFING_FORBIDDEN_ADVISORY_PATTERNS) {
      expect(result.text).not.toMatch(pattern);
    }
  });

  it("derives a market topic without requiring a new network request", () => {
    expect(
      deriveBriefingMarketTopic({
        title: "Very long headline that should not be repeated in the briefing layer of the hero",
        reason: "the latest inflation update",
        sourceName: "Reuters",
      }),
    ).toBe("the latest inflation update");

    expect(
      previousClosePhraseFromContextLine("Based on Friday's market close"),
    ).toBe("Friday's market close");
  });

  it("is a pure function with no fetch side effects", () => {
    const originalFetch = globalThis.fetch;
    let fetchCalled = false;
    globalThis.fetch = (() => {
      fetchCalled = true;
      return Promise.reject(new Error("unexpected fetch"));
    }) as typeof fetch;

    try {
      buildDailyPortfolioBriefing({
        firstName: "Martijn",
        now: atAmsterdamHour(9),
        holdingCount: 1,
        hasDailyData: true,
        todayPercent: 1,
        usesPreviousClose: false,
      });
      expect(fetchCalled).toBe(false);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
