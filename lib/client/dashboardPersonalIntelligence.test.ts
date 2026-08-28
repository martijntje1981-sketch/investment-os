import { describe, expect, it } from "vitest";

import {
  PERSONAL_INTELLIGENCE_QUIET_TITLE,
  selectDashboardPersonalIntelligence,
} from "@/lib/client/dashboardPersonalIntelligence";
import type { LookingAheadModel } from "@/lib/services/lookingAhead";
import type {
  PortfolioChangeAttention,
  PortfolioChangeSignal,
} from "@/lib/services/portfolioChangeDetection";

function signal(
  overrides: Partial<PortfolioChangeSignal> &
    Pick<PortfolioChangeSignal, "id" | "type" | "title">,
): PortfolioChangeSignal {
  return {
    severity: "watch",
    summary: overrides.title,
    whyItMatters: "This is a portfolio-level change.",
    currentValue: 10,
    previousValue: 6,
    delta: 4,
    unit: "percentage_points",
    holdingSymbol: null,
    holdingName: null,
    portfolioImpactPp: 4,
    confidence: "moderate",
    detectedAt: "2026-08-28T08:00:00.000Z",
    destination: { href: "/what-matters", label: "See what matters" },
    evidence: {
      whyAmISeeingThis: "Compared with the latest snapshot.",
      whatChanged: overrides.title,
      whyItMattersToPortfolio: "This is a portfolio-level change.",
      howCalculated: "Change Intelligence",
      confidenceNote: "moderate",
    },
    limitations: [],
    fourQuestionId: "what_matters_now",
    windowKind: "live_vs_snapshot",
    materialityScore: 80,
    ...overrides,
  };
}

function attention(
  overrides: Partial<PortfolioChangeAttention> &
    Pick<PortfolioChangeAttention, "status" | "primary">,
): PortfolioChangeAttention {
  return {
    headline: "Attention",
    support: null,
    window: {
      kind: "live_vs_snapshot",
      label: "Compared with last week",
      previousCapturedAt: "2026-08-21T08:00:00.000Z",
      detectedAt: "2026-08-28T08:00:00.000Z",
      snapshotKind: "weekly",
    },
    secondary: [],
    ranked: overrides.primary ? [overrides.primary] : [],
    structuralHistoryAvailable: true,
    dailyDataAvailable: true,
    limitations: [],
    ...overrides,
  };
}

const quietAhead: LookingAheadModel = {
  status: "quiet",
  headline: "No major portfolio-specific event stands out.",
  support: null,
  modeledDisclaimer: null,
  facts: [],
  event: null,
  explore: { label: "See what’s ahead →", href: "/whats-ahead" },
  primaryKind: "none",
  scenarioId: null,
  intelligenceDepth: "complete",
};

const concentrationAhead: LookingAheadModel = {
  ...quietAhead,
  status: "ready",
  headline: "Bitcoin remains the holding most worth watching.",
  primaryKind: "concentration",
};

const modeledAhead: LookingAheadModel = {
  ...quietAhead,
  status: "ready",
  headline: "If Bitcoin fell 30%, modeled impact is about −8%.",
  support: "Bitcoin crash is currently the largest modeled sensitivity.",
  modeledDisclaimer: "Modeled scenario, not a forecast.",
  primaryKind: "modeled_scenario",
  scenarioId: "bitcoin_minus_20",
};

describe("selectDashboardPersonalIntelligence", () => {
  it("prefers a material portfolio change over looking-ahead copy", () => {
    const view = selectDashboardPersonalIntelligence({
      changeAttention: attention({
        status: "attention",
        primary: signal({
          id: "goal",
          type: "goal_progress_changed",
          title: "Goal progress slowed this week",
        }),
      }),
      lookingAhead: modeledAhead,
    });

    expect(view.kind).toBe("change");
    if (view.kind === "change") {
      expect(view.title).toBe("Goal progress slowed this week");
      expect(view.href).toBe("/what-matters");
    }
  });

  it("skips holding-move and news signals that repeat Holdings Today", () => {
    const view = selectDashboardPersonalIntelligence({
      changeAttention: attention({
        status: "attention",
        primary: signal({
          id: "move",
          type: "holding_move_with_context",
          title: "AIFS moved with a news headline",
        }),
      }),
      lookingAhead: quietAhead,
    });

    expect(view.kind).toBe("quiet");
    expect(view.title).toBe(PERSONAL_INTELLIGENCE_QUIET_TITLE);
  });

  it("does not promote a static largest-holding Looking Ahead fact", () => {
    const view = selectDashboardPersonalIntelligence({
      changeAttention: attention({
        status: "nothing_material",
        primary: null,
      }),
      lookingAhead: concentrationAhead,
    });

    expect(view.kind).toBe("quiet");
  });

  it("keeps a modeled scenario when nothing else material is available", () => {
    const view = selectDashboardPersonalIntelligence({
      changeAttention: attention({
        status: "nothing_material",
        primary: null,
      }),
      lookingAhead: modeledAhead,
    });

    expect(view.kind).toBe("looking_ahead");
    if (view.kind === "looking_ahead") {
      expect(view.title).toContain("modeled impact");
      expect(view.href).toBe("/whats-ahead");
    }
  });
});
