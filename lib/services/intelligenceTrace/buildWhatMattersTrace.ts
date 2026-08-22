/**
 * Phase 7A — What matters? evidence chain from existing personal intelligence.
 * Does not fetch or recalculate portfolio values independently.
 */

import { DASHBOARD_DEEP_LINKS } from "@/lib/navigation/deepLinks";
import { formatContributionPp } from "@/lib/services/personalIntelligence/attribution";
import type { PersonalIntelligenceToday } from "@/lib/services/personalIntelligence";
import type { ThirtySecondsBriefingView } from "@/lib/services/personalIntelligence/thirtySecondsBriefing";
import { buildGoalSensitivityFromScenario } from "@/lib/services/goalSensitivity";
import { buildResilienceProfile } from "@/lib/services/resilience";
import type { ResilienceProfile } from "@/lib/services/resilience";
import type { GoalSettings, StoredPortfolioHolding } from "@/lib/types/portfolioStorage";
import type { IntelligenceTrace, IntelligenceTraceLayer } from "./types";

type Q2Subject =
  | {
      kind: "holding";
      name: string;
      symbol: string;
      weightPercent: number | null;
      contributionPp: number | null;
      changePercent: number | null;
    }
  | {
      kind: "portfolio_move";
      name: "Portfolio";
      movePercent: number | null;
      moveAmount: number | null;
    };

function findDriverContribution(
  intelligence: PersonalIntelligenceToday,
  symbol: string,
): {
  weightPercent: number | null;
  contributionPp: number | null;
  changePercent: number | null;
} | null {
  const normalized = symbol.trim().toUpperCase();
  const row =
    intelligence.topContributors.find(
      (item) => item.symbol.trim().toUpperCase() === normalized,
    ) ??
    intelligence.topDetractors.find(
      (item) => item.symbol.trim().toUpperCase() === normalized,
    );
  if (!row) {
    const weight =
      intelligence.holdingsWeights.find(
        (item) => item.symbol.trim().toUpperCase() === normalized,
      )?.weightPercent ?? null;
    return weight != null ? { weightPercent: weight, contributionPp: null, changePercent: null } : null;
  }
  return {
    weightPercent: row.weightPercent,
    contributionPp: row.contributionPp,
    changePercent: row.changePercent,
  };
}

function exposureBullets(
  intelligence: PersonalIntelligenceToday,
  symbol: string,
): string[] {
  const bullets: string[] = [];
  const exposure = intelligence.exposure;
  if (!exposure) return bullets;

  const normalized = symbol.trim().toUpperCase();
  const group = exposure.groups.find((row) =>
    row.holdings.some(
      (holding) => holding.symbol.trim().toUpperCase() === normalized,
    ),
  );
  if (group && group.displayPercent > 0) {
    bullets.push(
      `${group.displayLabel} exposure: ${group.displayPercent.toFixed(1)}% of portfolio value`,
    );
  }
  return bullets;
}

function formatPercent(value: number, digits = 1): string {
  return `${value.toFixed(digits)}%`;
}

function formatSignedPercent(value: number, digits = 1): string {
  return `${value > 0 ? "+" : ""}${value.toFixed(digits)}%`;
}

function resolveQ2Subject(input: {
  insight: string;
  intelligence: PersonalIntelligenceToday;
  view: ThirtySecondsBriefingView;
}): Q2Subject | null {
  const { insight, intelligence, view } = input;
  const driver = view.drivers[0] ?? null;
  const normalizedInsight = insight.trim().toLowerCase();

  if (driver) {
    const mentionsDriver =
      normalizedInsight.includes(driver.name.trim().toLowerCase()) ||
      normalizedInsight.includes(driver.symbol.trim().toLowerCase()) ||
      normalizedInsight.includes("driver");

    if (mentionsDriver) {
      const stats = findDriverContribution(intelligence, driver.symbol);
      return {
        kind: "holding",
        name: driver.name,
        symbol: driver.symbol,
        weightPercent: stats?.weightPercent ?? null,
        contributionPp: stats?.contributionPp ?? null,
        changePercent: stats?.changePercent ?? null,
      };
    }
  }

  if (
    intelligence.portfolioMove &&
    /portfolio|move|larger-than-usual|larger than usual|attention/i.test(insight)
  ) {
    return {
      kind: "portfolio_move",
      name: "Portfolio",
      movePercent: intelligence.portfolioMove.todayPercent,
      moveAmount: intelligence.portfolioMove.todayChange,
    };
  }

  if (driver) {
    const stats = findDriverContribution(intelligence, driver.symbol);
    return {
      kind: "holding",
      name: driver.name,
      symbol: driver.symbol,
      weightPercent: stats?.weightPercent ?? null,
      contributionPp: stats?.contributionPp ?? null,
      changePercent: stats?.changePercent ?? null,
    };
  }

  return null;
}

function buildMeaningLayer(input: {
  subject: Q2Subject;
  portfolioMovePercent: number | null;
  holdingCount: number;
  weakerCount: number;
}): IntelligenceTraceLayer | null {
  const { subject, portfolioMovePercent, holdingCount, weakerCount } = input;

  if (subject.kind === "portfolio_move") {
    if (subject.movePercent == null || !Number.isFinite(subject.movePercent)) {
      return null;
    }
    return {
      id: "meaning",
      title: "What it means",
      detail: `Today's portfolio move is large enough to stand out from a normal day, so the overall portfolio deserves attention rather than a single isolated holding.`,
      presentation: "expand",
      href: DASHBOARD_DEEP_LINKS.portfolioExposure,
      emphasis: "high",
    };
  }

  const { name, weightPercent, contributionPp } = subject;
  if (weightPercent == null) return null;

  const absPp = contributionPp != null ? Math.abs(contributionPp) : null;
  const structural =
    weightPercent >= 35
      ? `${name}’s ${formatPercent(weightPercent)} portfolio weight means a modest ${name} move can dominate the daily result`
      : weightPercent >= 20
        ? `${name} is a large enough position (${formatPercent(weightPercent)}) that it can shape the day’s headline`
        : null;

  if (structural && weakerCount >= 2 && holdingCount >= 3) {
    return {
      id: "meaning",
      title: "What it means",
      detail: `${structural}; ${weakerCount} of your ${holdingCount} holdings were weaker underneath.`,
      presentation: "expand",
      href: DASHBOARD_DEEP_LINKS.portfolioExposure,
      emphasis: "high",
    };
  }

  if (structural) {
    return {
      id: "meaning",
      title: "What it means",
      detail: `${structural}.`,
      presentation: "expand",
      href: DASHBOARD_DEEP_LINKS.portfolioExposure,
      emphasis: "high",
    };
  }

  const moveAbs =
    portfolioMovePercent != null && Number.isFinite(portfolioMovePercent)
      ? Math.abs(portfolioMovePercent)
      : null;

  if (absPp != null && moveAbs != null && moveAbs >= 0.05 && absPp / moveAbs >= 0.45) {
    return {
      id: "meaning",
      title: "What it means",
      detail: `${name} is explaining a large share of today's portfolio move while representing ${formatPercent(weightPercent)} of portfolio value.`,
      presentation: "expand",
      href: DASHBOARD_DEEP_LINKS.portfolioExposure,
      emphasis: "high",
    };
  }

  if (weightPercent >= 20 && absPp != null && absPp >= 0.12) {
    return {
      id: "meaning",
      title: "What it means",
      detail: `${name} combines meaningful portfolio weight (${formatPercent(weightPercent)}) with a material move contribution today (${formatContributionPp(contributionPp ?? 0)}).`,
      presentation: "expand",
      href: DASHBOARD_DEEP_LINKS.portfolioExposure,
      emphasis: "high",
    };
  }

  return null;
}

function buildSensitivityLayer(
  resilience: ResilienceProfile,
  subject: Q2Subject,
): IntelligenceTraceLayer | null {
  if (subject.kind !== "holding") return null;

  const most = resilience.mostSensitive;
  if (!most) return null;
  const normalized = subject.symbol.trim().toUpperCase();
  const scenarioName = most.scenarioName.toUpperCase();

  const scenarioMatchesSubject =
    scenarioName.includes(normalized) ||
    (normalized === "BTC" && scenarioName.includes("BITCOIN"));
  if (!scenarioMatchesSubject) {
    return null;
  }

  const impact = most.estimatedPortfolioImpactPercent;
  if (impact == null || !Number.isFinite(impact)) return null;

  const affected =
    most.affectedPortfolioWeightPercent != null
      ? ` · about ${formatPercent(most.affectedPortfolioWeightPercent, 0)} of portfolio affected`
      : "";

  return {
    id: "sensitivity",
    title: "What if",
    detail: `In Tobailey's ${most.scenarioName} scenario, the estimated direct portfolio impact is approximately ${impact.toFixed(1)}%${affected}.`,
    presentation: "explore",
    href: DASHBOARD_DEEP_LINKS.scenarioStress,
    emphasis: "high",
  };
}

function buildGoalImpactLayer(input: {
  resilience: ResilienceProfile;
  goal: GoalSettings | null;
  hasSavedGoal: boolean;
}): IntelligenceTraceLayer | null {
  // Phase 7A: only show one goal-impact connection where the UI model intends it.
  if (!input.hasSavedGoal) return null;

  const context = input.resilience.goalContext;
  if (context) {
    return {
      id: "goal_impact",
      title: "Goal impact",
      detail: context.summary,
      presentation: "explore",
      href: "/goals",
      emphasis: "high",
    };
  }

  if (!input.hasSavedGoal || !input.goal || !input.resilience.mostSensitive) {
    return null;
  }

  const scenario = input.resilience.scenarioResults.find(
    (row) => row.scenarioId === input.resilience.mostSensitive!.scenarioId,
  );
  if (!scenario) return null;

  const sensitivity = buildGoalSensitivityFromScenario({
    scenarioResult: scenario,
    goal: input.goal,
    hasSavedGoal: true,
  });

  if (
    sensitivity.status !== "ok" ||
    sensitivity.currentProgressPercent === null ||
    sensitivity.stressedProgressPercent === null
  ) {
    return null;
  }

  return {
    id: "goal_impact",
    title: "Goal impact",
    detail: `Under ${input.resilience.mostSensitive.scenarioName}, goal progress would move from approximately ${sensitivity.currentProgressPercent.toFixed(1)}% to ${sensitivity.stressedProgressPercent.toFixed(1)}%.`,
    presentation: "explore",
    href: "/goals",
    emphasis: "high",
  };
}

function buildConfidenceLayer(
  intelligence: PersonalIntelligenceToday,
  view: ThirtySecondsBriefingView,
): IntelligenceTraceLayer {
  const bullets: string[] = [];
  const move = intelligence.portfolioMove;

  if (move) {
    if (move.coverageComplete) {
      bullets.push("Portfolio day move: based on all eligible priced holdings.");
    } else if (move.hasDailyData) {
      bullets.push(
        `Portfolio day move: ${move.validPerformanceCount} of ${move.eligibleMarketHoldingCount} eligible holdings priced.`,
      );
    } else {
      bullets.push("Daily portfolio performance data is not available.");
    }
  }

  if (view.periodNote) {
    bullets.push(view.periodNote);
  }
  if (view.coverageNote) {
    bullets.push(view.coverageNote);
  }
  for (const note of intelligence.dataNotes) {
    if (!bullets.includes(note)) bullets.push(note);
  }
  bullets.push("Historical risk-contribution comparison unavailable.");

  return {
    id: "confidence",
    title: "Data confidence",
    detail: bullets[0] ?? "Based on currently priced holdings.",
    bullets: bullets.length > 1 ? bullets.slice(1) : undefined,
    presentation: "explore",
    emphasis: "low",
  };
}

export function buildWhatMattersTrace(input: {
  insight: string;
  intelligence: PersonalIntelligenceToday;
  view: ThirtySecondsBriefingView;
  holdings: StoredPortfolioHolding[];
  goal?: GoalSettings | null;
  hasSavedGoal?: boolean;
  /** Pre-built profile avoids duplicate scenario runs when caller already has one. */
  resilienceProfile?: ResilienceProfile | null;
  relevantContext?: IntelligenceTraceLayer | null;
}): IntelligenceTrace | null {
  const { intelligence, view, insight } = input;
  const subject = resolveQ2Subject({ insight, intelligence, view });
  if (!subject) return null;

  const layers: IntelligenceTraceLayer[] = [];
  const omittedLayerIds: IntelligenceTraceLayer["id"][] = ["change"];

  const evidenceBullets: string[] = [];
  if (subject.kind === "holding") {
    if (subject.weightPercent != null) {
      evidenceBullets.push(
        `${subject.name} portfolio weight: ${formatPercent(subject.weightPercent)}`,
      );
    }
    if (subject.contributionPp != null) {
      evidenceBullets.push(
        `Estimated contribution to today's move: ${formatContributionPp(subject.contributionPp)}`,
      );
    }
    if (
      subject.changePercent != null &&
      Number.isFinite(subject.changePercent)
    ) {
      evidenceBullets.push(
        `${subject.name} price move: ${formatSignedPercent(subject.changePercent)}`,
      );
    }
    evidenceBullets.push(...exposureBullets(intelligence, subject.symbol));
  } else {
    if (
      subject.movePercent != null &&
      Number.isFinite(subject.movePercent)
    ) {
      evidenceBullets.push(
        `Today's portfolio move: ${formatSignedPercent(subject.movePercent)}`,
      );
    }
    if (
      subject.moveAmount != null &&
      Number.isFinite(subject.moveAmount)
    ) {
      evidenceBullets.push(
        `Today's portfolio value change: ${subject.moveAmount > 0 ? "+" : ""}${subject.moveAmount.toFixed(2)}`,
      );
    }
    if (intelligence.portfolioMove) {
      evidenceBullets.push(
        `Coverage: ${intelligence.portfolioMove.validPerformanceCount} of ${intelligence.portfolioMove.eligibleMarketHoldingCount} eligible holdings priced`,
      );
    }
  }

  const weakerCount =
    subject.kind === "holding" && (subject.contributionPp ?? 0) >= 0
      ? intelligence.topDetractors.length
      : intelligence.topContributors.length;
  const meaning = buildMeaningLayer({
    subject,
    portfolioMovePercent: intelligence.portfolioMove?.todayPercent ?? null,
    holdingCount: Math.max(input.holdings.length, intelligence.holdingsWeights.length),
    weakerCount,
  });
  if (meaning) layers.push(meaning);
  if (input.relevantContext) layers.push(input.relevantContext);

  if (evidenceBullets.length > 0) {
    layers.push({
      id: "evidence",
      title: "Evidence",
      detail:
        subject.kind === "holding"
          ? `${subject.name} is supported by measurable portfolio facts today.`
          : "The portfolio-level move is supported by measurable portfolio facts today.",
      bullets: evidenceBullets,
      presentation: "expand",
      href: DASHBOARD_DEEP_LINKS.portfolioExposure,
      emphasis: "supporting",
    });
  }

  const resilience =
    input.resilienceProfile ??
    buildResilienceProfile({
      holdings: input.holdings,
      goal: input.goal,
      hasSavedGoal: input.hasSavedGoal,
    });

  const sensitivity = buildSensitivityLayer(resilience, subject);
  if (sensitivity) layers.push(sensitivity);

  const goalImpact = buildGoalImpactLayer({
    resilience,
    goal: input.goal ?? null,
    hasSavedGoal: Boolean(input.hasSavedGoal),
  });
  if (goalImpact) layers.push(goalImpact);

  layers.push({
    id: "calculation",
    title: "How Tobailey calculated this",
    detail:
      "Today's driver ranking uses holding weights and price moves against the prior portfolio value base.",
    bullets: [
      "contribution (pp) ≈ (holding move ÷ prior portfolio value) × 100",
      "Drivers ranked by absolute contribution to today's portfolio percent move",
      "Exposure groups reuse existing portfolio classification weights",
    ],
    presentation: "explore",
    href: DASHBOARD_DEEP_LINKS.portfolioPerformance,
    emphasis: "supporting",
  });

  layers.push(buildConfidenceLayer(intelligence, view));

  if (layers.length === 0) return null;

  return {
    insight,
    layers,
    omittedLayerIds,
  };
}
