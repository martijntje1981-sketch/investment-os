import { describe, expect, it } from "vitest";

import {
  DAILY_PERFORMANCE_AFTER_CLOSE,
  formatMoverUnavailableMessage,
  formatTodayMoveDetail,
  formatTodayMoveValue,
  RANKING_AFTER_CLOSE,
} from "@/lib/client/investorOverviewCopy";
import {
  buildIntelligenceDisplayMessage,
  buildTodaysDecision,
} from "@/lib/client/todaysDecision";
import { createEmptyInvestmentIntelligence } from "@/lib/services/news/investmentIntelligence";
import type { InvestmentIntelligence } from "@/lib/services/news/investmentIntelligence";
import { bulletTextOnly } from "@/lib/services/news/intelligenceBullets";

function intelligence(
  overrides: Partial<InvestmentIntelligence> = {},
): InvestmentIntelligence {
  return {
    ...createEmptyInvestmentIntelligence("2026-07-20T08:00:00.000Z"),
    ...overrides,
  };
}

describe("buildTodaysDecision", () => {
  it("prioritizes urgent portfolio risk over opportunities", () => {
    const result = buildTodaysDecision({
      intelligence: intelligence({
        portfolioStatus: "High Attention",
        keyRisks: [bulletTextOnly("Review one holding with elevated concentration risk.")],
        opportunities: [bulletTextOnly("Uranium sector momentum remains notable.")],
      }),
      intelligenceFromCache: true,
      marketsClosed: false,
    });

    expect(result.decision).toContain("concentration risk");
    expect(result.tone).toBe("critical");
  });

  it("prioritizes upcoming high-impact events over neutral fallback", () => {
    const result = buildTodaysDecision({
      intelligence: intelligence({ quietMarket: true }),
      intelligenceFromCache: true,
      upcomingEvents: [
        {
          id: "e1",
          title: "Fed speech",
          category: "fed",
          date: "2026-07-20",
          timeLabel: "20:00",
          country: "US",
          description: "Policy remarks.",
          impact: "High",
          source: "calendar",
        },
      ],
      marketsClosed: true,
    });

    expect(result.decision).toBe(
      "Review today's macro events before making changes.",
    );
    expect(result.reason).toContain("Fed speech");
  });

  it("uses goal concern when no stronger intelligence exists", () => {
    const result = buildTodaysDecision({
      intelligence: null,
      intelligenceFromCache: false,
      goalProgress: {
        hasGoal: true,
        currentTrajectory: "Behind",
        status: "Behind schedule",
        goalReached: false,
      },
      marketsClosed: true,
    });

    expect(result.decision).toContain("goal trajectory");
    expect(result.tone).toBe("attention");
  });

  it("returns a safe neutral fallback without advisory language", () => {
    const result = buildTodaysDecision({
      intelligence: null,
      intelligenceFromCache: false,
      marketsClosed: true,
    });

    expect(result.decision).toBe("No urgent portfolio action is required.");
    expect(result.reason).toContain("building today's portfolio briefing");
    expect(result.decision.toLowerCase()).not.toMatch(/\b(buy|sell)\b/);
  });

  it("sanitizes forbidden buy/sell language", () => {
    const result = buildTodaysDecision({
      intelligence: intelligence({
        portfolioStatus: "High Attention",
        keyRisks: [bulletTextOnly("Buy more uranium before the rally ends.")],
      }),
      intelligenceFromCache: true,
      marketsClosed: false,
    });

    expect(result.decision).not.toMatch(/\bbuy\b/i);
    expect(result.decision).toContain("Review today's briefing");
  });

  it("is deterministic across repeated calls", () => {
    const context = {
      intelligence: intelligence({
        mustWatch: {
          type: "article" as const,
          itemId: "mw1",
          title: "Bitcoin-related volatility",
          sourceName: "Bloomberg",
          canonicalUrl: "https://example.com/btc",
          reason: "Recent sector movement affects a portfolio holding.",
        },
      }),
      intelligenceFromCache: true,
      marketsClosed: false,
    };

    const first = buildTodaysDecision(context);
    const second = buildTodaysDecision(context);

    expect(first).toEqual(second);
    expect(first.sourceUrl).toBe("https://example.com/btc");
    expect(first.sourceName).toBe("Bloomberg");
    expect(first.sourceLinkLabel).toBe("Read article");
  });
});

describe("buildIntelligenceDisplayMessage", () => {
  it("never uses generic market-close wording for intelligence", () => {
    const message = buildIntelligenceDisplayMessage({
      intelligence: null,
      intelligenceFromCache: false,
      marketsClosed: true,
    });

    expect(message.toLowerCase()).not.toContain("available after market close");
    expect(message).toContain("building today's portfolio briefing");
  });

  it("describes closed markets with useful portfolio context", () => {
    const message = buildIntelligenceDisplayMessage({
      intelligence: intelligence({
        todayMatters: [bulletTextOnly("Uranium sector movement affects NUKL.")],
        keyRisks: [bulletTextOnly("VWCE outflows raise concern.")],
        quietMarket: false,
      }),
      intelligenceFromCache: true,
      marketsClosed: true,
    });

    expect(message).toContain("Markets are closed");
    expect(message.toLowerCase()).not.toContain("available after market close");
  });

  it("uses goal progress when intelligence is unavailable", () => {
    const message = buildIntelligenceDisplayMessage({
      intelligence: null,
      intelligenceFromCache: false,
      goalProgress: {
        hasGoal: true,
        currentTrajectory: "On track",
        status: "On track",
        goalReached: false,
      },
      marketsClosed: true,
    });

    expect(message).toContain("on track toward its current goal");
  });
});

describe("investor overview copy", () => {
  it("keeps market-close wording only for daily performance and ranking", () => {
    expect(
      formatTodayMoveValue({
        hasDailyData: false,
        performanceCoverageComplete: false,
        formatValue: () => "+€100",
      }),
    ).toBe("—");

    expect(
      formatTodayMoveDetail({
        hasDailyData: false,
        performanceCoverageComplete: false,
        formatPercent: () => "+1.2%",
      }),
    ).toBe(DAILY_PERFORMANCE_AFTER_CLOSE);

    expect(formatMoverUnavailableMessage(false)).toBe(RANKING_AFTER_CLOSE);
    expect(DAILY_PERFORMANCE_AFTER_CLOSE).not.toBe(RANKING_AFTER_CLOSE);
  });
});

describe("dashboard Today's Decision integration", () => {
  it("renders Today's Decision as a dedicated dashboard section before holdings", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");

    const dashboard = readFileSync(
      resolve(process.cwd(), "app/dashboard/page.tsx"),
      "utf8",
    );
    const decisionSection = readFileSync(
      resolve(process.cwd(), "components/dashboard/DashboardTodaysDecision.tsx"),
      "utf8",
    );
    const preview = readFileSync(
      resolve(
        process.cwd(),
        "components/dashboard/DashboardIntelligencePreview.tsx",
      ),
      "utf8",
    );

    expect(dashboard.indexOf("<DashboardSummary")).toBeLessThan(
      dashboard.indexOf("<DashboardTodaysDecision"),
    );
    expect(dashboard.indexOf("<DashboardTodaysDecision")).toBeLessThan(
      dashboard.indexOf("<HoldingsToday"),
    );
    expect(dashboard.indexOf("<HoldingsToday")).toBeLessThan(
      dashboard.indexOf("<DashboardIntelligencePreview"),
    );
    expect(decisionSection).toContain("TodaysDecisionBlock");
    expect(decisionSection).toContain("buildTodaysDecision");
    expect(preview).toContain("buildIntelligenceDisplayMessage");
    expect(preview).not.toContain("TodaysDecisionBlock");
    expect(dashboard).not.toContain("BottomNavigation");
    expect(dashboard).not.toMatch(/innerWidth|matchMedia|useMediaQuery/);
  });
});
