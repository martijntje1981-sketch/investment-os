import { describe, expect, it } from "vitest";

import {
  COMPLETE_MONTHLY_PRICE_LABEL,
  COMPLETE_UPGRADE_CTA_LABEL,
  canUseCompleteCapability,
  resolveProductAccess,
} from "@/lib/services/productAccess";
import { EXAMPLE_PORTFOLIO_DAYS } from "@/lib/services/examplePortfolio/types";
import { computeExampleExpiry } from "@/lib/services/examplePortfolio/types";
import { shouldBlockExpiredExampleUser } from "@/lib/auth/routeAccess";
import { assertExamplePortfolioApiAccess } from "@/lib/services/examplePortfolio/accessGuard";
import { applyFourQuestionsIntelligenceDepth } from "@/lib/services/fourQuestions/applyIntelligenceDepth";
import type { FourQuestionsBundle } from "@/lib/services/fourQuestions/types";

describe("product access resolver", () => {
  it("maps converted → complete and trial active → complete depth", () => {
    const complete = resolveProductAccess({ exampleKind: "converted" });
    expect(complete.tier).toBe("complete");
    expect(complete.intelligenceDepth).toBe("complete");
    expect(complete.isCompleteTrial).toBe(false);

    const trial = resolveProductAccess({
      exampleKind: "active",
      trialKind: "personal",
      expiresAt: "2099-01-01T00:00:00.000Z",
      daysRemaining: 11,
    });
    expect(trial.tier).toBe("trial");
    expect(trial.intelligenceDepth).toBe("complete");
    expect(trial.isCompleteTrial).toBe(true);
    expect(trial.trialIndicatorLabel).toBe("Complete trial · 11 days remaining");
  });

  it("maps expired personal trial → free without destroying data flags", () => {
    const free = resolveProductAccess({
      exampleKind: "expired",
      trialKind: "personal",
      expiresAt: "2020-01-01T00:00:00.000Z",
      daysRemaining: 0,
    });
    expect(free.tier).toBe("free");
    expect(free.intelligenceDepth).toBe("free");
    expect(free.preservesUserData).toBe(true);
    expect(free.upgradeCtaLabel).toContain(COMPLETE_MONTHLY_PRICE_LABEL);
  });

  it("keeps demo isolated and maps standard / no entitlement to free", () => {
    const demo = resolveProductAccess({
      exampleKind: "active",
      trialKind: "demo",
      daysRemaining: 5,
      expiresAt: "2099-01-01T00:00:00.000Z",
    });
    expect(demo.tier).toBe("demo");
    expect(demo.isDemo).toBe(true);
    expect(demo.intelligenceDepth).toBe("complete");

    const none = resolveProductAccess({ exampleKind: "none" });
    expect(none.tier).toBe("free");
    expect(none.intelligenceDepth).toBe("free");

    const reserved = resolveProductAccess({ exampleKind: "reserved" });
    expect(reserved.tier).toBe("free");
    expect(reserved.intelligenceDepth).toBe("free");
  });

  it("gates Complete capabilities by intelligence depth only", () => {
    const free = resolveProductAccess({
      exampleKind: "expired",
      trialKind: "personal",
    });
    const trial = resolveProductAccess({
      exampleKind: "active",
      trialKind: "personal",
      daysRemaining: 3,
      expiresAt: "2099-01-01T00:00:00.000Z",
    });
    expect(canUseCompleteCapability(free, "full_xray")).toBe(false);
    expect(canUseCompleteCapability(trial, "full_xray")).toBe(true);
    expect(canUseCompleteCapability(free, "change_intelligence")).toBe(false);
    expect(canUseCompleteCapability(trial, "change_intelligence")).toBe(true);
    expect(canUseCompleteCapability(free, "period_briefings")).toBe(false);
    expect(canUseCompleteCapability(trial, "period_briefings")).toBe(true);
    expect(canUseCompleteCapability(free, "what_if_scenarios")).toBe(false);
    expect(canUseCompleteCapability(trial, "what_if_scenarios")).toBe(true);
    expect(canUseCompleteCapability(free, "goal_sensitivity")).toBe(false);
  });
});

describe("14-day Complete trial clock", () => {
  it("uses a 14-day activation window without rewriting stored expiry math", () => {
    expect(EXAMPLE_PORTFOLIO_DAYS).toBe(14);
    const started = new Date("2026-08-01T00:00:00.000Z");
    const expires = computeExampleExpiry(started);
    expect(expires.toISOString()).toBe("2026-08-15T00:00:00.000Z");
  });
});

describe("expired personal trial → Free access", () => {
  const personalExpiredMeta = {
    account_mode: "example" as const,
    example_trial_kind: "personal" as const,
    example_expires_at: "2020-01-01T00:00:00.000Z",
  };

  it("does not block dashboard routes for expired personal trials", () => {
    expect(
      shouldBlockExpiredExampleUser({
        pathname: "/dashboard",
        userMetadata: personalExpiredMeta,
      }),
    ).toBe(false);
  });

  it("still blocks expired demo/legacy example accounts", () => {
    expect(
      shouldBlockExpiredExampleUser({
        pathname: "/dashboard",
        userMetadata: {
          account_mode: "example",
          example_trial_kind: "demo",
          example_expires_at: "2020-01-01T00:00:00.000Z",
        },
      }),
    ).toBe(true);
  });

  it("allows portfolio APIs for expired personal trials", () => {
    const decision = assertExamplePortfolioApiAccess({
      id: "user-1",
      user_metadata: personalExpiredMeta,
    } as never);
    expect(decision.ok).toBe(true);
  });
});

describe("Free Four Questions depth", () => {
  const completeBundle: FourQuestionsBundle = {
    scope: "complete",
    intelligenceDepth: "complete",
    questions: [
      {
        id: "what_happened",
        numberLabel: "01",
        question: "What happened?",
        answer: "Portfolio +1.2% today",
        support: "AAPL explains most of today’s gain.",
        expandItems: [
          { id: "period-return", label: "Today", detail: "+1.2%" },
          { id: "top-positive", label: "Top positive", detail: "AAPL" },
          { id: "pulse-daily", label: "Daily pulse", detail: "Steady" },
          { id: "pulse-weekly", label: "Weekly pulse", detail: "Up" },
        ],
        disclosures: ["Coverage note"],
        explore: { label: "Explore full analysis", href: "/what-happened" },
        quiet: false,
        scope: "complete",
      },
      {
        id: "what_matters_now",
        numberLabel: "02",
        question: "What matters now?",
        answer: "Concentration rose.",
        support: null,
        expandItems: [
          { id: "action-1", label: "Action", detail: "Review weights" },
          { id: "action-2", label: "Action", detail: "Check cash" },
        ],
        disclosures: [],
        explore: { label: "Explore full analysis", href: "/what-matters" },
        quiet: false,
        scope: "complete",
      },
      {
        id: "am_i_on_track",
        numberLabel: "03",
        question: "Am I on track?",
        answer: "On track",
        support: "Under your 7% assumption",
        expandItems: [
          { id: "progress", label: "Progress", detail: "42%" },
          { id: "reality", label: "Reality Check", detail: "Pace" },
        ],
        disclosures: [],
        explore: { label: "Explore full analysis", href: "/on-track" },
        quiet: false,
        scope: "complete",
      },
      {
        id: "whats_ahead",
        numberLabel: "04",
        question: "What’s ahead?",
        answer: "Sensitive to rates.",
        support: null,
        expandItems: [
          { id: "scenario", label: "Top scenario", detail: "Rates" },
          { id: "resilience", label: "Resilience", detail: "72/100" },
        ],
        disclosures: ["Models, not predictions"],
        explore: { label: "Explore full analysis", href: "/whats-ahead" },
        quiet: false,
        scope: "complete",
      },
    ],
  };

  it("keeps Complete depth unchanged for trial/complete", () => {
    const next = applyFourQuestionsIntelligenceDepth(completeBundle, "complete");
    expect(next.intelligenceDepth).toBe("complete");
    expect(next.questions[0]!.expandItems).toHaveLength(4);
    expect(next.questions[0]!.explore.label).toBe("Explore full analysis");
  });

  it("applies Free depth with preview teaser and Complete CTA", () => {
    const free = applyFourQuestionsIntelligenceDepth(completeBundle, "free");
    expect(free.intelligenceDepth).toBe("free");
    expect(free.questions[0]!.answer).toBe("Portfolio +1.2% today");
    expect(free.questions[0]!.expandItems.length).toBeLessThanOrEqual(3);
    expect(
      free.questions[0]!.expandItems.some((item) => item.id === "complete-preview"),
    ).toBe(true);
    expect(free.questions.every((q) => q.explore.label === "See Complete analysis")).toBe(
      true,
    );
    expect(COMPLETE_UPGRADE_CTA_LABEL).toContain("€5.99");
  });
});
