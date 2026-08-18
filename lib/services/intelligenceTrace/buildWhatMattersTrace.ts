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

function buildMeaningLayer(input: {
  name: string;
  weightPercent: number | null;
  contributionPp: number | null;
  portfolioMovePercent: number | null;
}): IntelligenceTraceLayer | null {
  const { name, weightPercent, contributionPp, portfolioMovePercent } = input;
  if (weightPercent == null || contributionPp == null) return null;

  const absPp = Math.abs(contributionPp);
  const moveAbs =
    portfolioMovePercent != null && Number.isFinite(portfolioMovePercent)
      ? Math.abs(portfolioMovePercent)
      : null;

  if (moveAbs != null && moveAbs >= 0.05) {
    const share = absPp / moveAbs;
    if (share >= 0.45) {
      return {
        id: "meaning",
        title: "What it means",
        detail: `${name} is explaining a large share of today's portfolio move while representing ${weightPercent.toFixed(1)}% of portfolio value.`,
        presentation: "expand",
      };
    }
  }

  if (weightPercent >= 20 && absPp >= 0.12) {
    return {
      id: "meaning",
      title: "What it means",
      detail: `${name} combines meaningful portfolio weight (${weightPercent.toFixed(1)}%) with a material move contribution today (${formatContributionPp(contributionPp)}).`,
      presentation: "expand",
    };
  }

  return null;
}

function buildSensitivityLayer(
  resilience: ResilienceProfile,
): IntelligenceTraceLayer | null {
  const most = resilience.mostSensitive;
  if (!most) return null;

  const impact = most.estimatedPortfolioImpactPercent;
  if (impact == null || !Number.isFinite(impact)) return null;

  const affected =
    most.affectedPortfolioWeightPercent != null
      ? ` · about ${most.affectedPortfolioWeightPercent.toFixed(0)}% of portfolio affected`
      : "";

  return {
    id: "sensitivity",
    title: "What if",
    detail: `In Tobailey's ${most.scenarioName} scenario, the estimated direct portfolio impact is approximately ${impact.toFixed(1)}%${affected}.`,
    presentation: "explore",
    href: DASHBOARD_DEEP_LINKS.scenarioStress,
  };
}

function buildGoalImpactLayer(input: {
  resilience: ResilienceProfile;
  goal: GoalSettings | null;
  hasSavedGoal: boolean;
}): IntelligenceTraceLayer | null {
  const context = input.resilience.goalContext;
  if (context) {
    return {
      id: "goal_impact",
      title: "Goal impact",
      detail: context.summary,
      presentation: "explore",
      href: "/goals",
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
}): IntelligenceTrace | null {
  const { intelligence, view, insight } = input;
  const driver = view.drivers[0] ?? null;
  const attention = intelligence.attentionItems[0] ?? null;

  if (!driver && !attention) {
    return null;
  }

  const subjectName = driver?.name ?? attention?.label ?? "Portfolio";
  const subjectSymbol = driver?.symbol ?? "";
  const stats = subjectSymbol
    ? findDriverContribution(intelligence, subjectSymbol)
    : null;

  const layers: IntelligenceTraceLayer[] = [];
  const omittedLayerIds: IntelligenceTraceLayer["id"][] = ["change"];

  const evidenceBullets: string[] = [];
  if (stats?.weightPercent != null) {
    evidenceBullets.push(
      `${subjectName} portfolio weight: ${stats.weightPercent.toFixed(1)}%`,
    );
  }
  if (stats?.contributionPp != null) {
    evidenceBullets.push(
      `Estimated contribution to today's move: ${formatContributionPp(stats.contributionPp)}`,
    );
  } else if (driver?.contributionLabel) {
    evidenceBullets.push(
      `Estimated contribution to today's move: ${driver.contributionLabel}`,
    );
  }
  if (stats?.changePercent != null && Number.isFinite(stats.changePercent)) {
    evidenceBullets.push(
      `${subjectName} price move: ${stats.changePercent >= 0 ? "+" : ""}${stats.changePercent.toFixed(1)}%`,
    );
  }
  evidenceBullets.push(...exposureBullets(intelligence, subjectSymbol));

  if (evidenceBullets.length > 0) {
    layers.push({
      id: "evidence",
      title: "Evidence",
      detail: `${subjectName} is supported by measurable portfolio facts today.`,
      bullets: evidenceBullets,
      presentation: "expand",
    });
  }

  const meaning = buildMeaningLayer({
    name: subjectName,
    weightPercent: stats?.weightPercent ?? null,
    contributionPp: stats?.contributionPp ?? null,
    portfolioMovePercent: intelligence.portfolioMove?.todayPercent ?? null,
  });
  if (meaning) layers.push(meaning);

  const resilience =
    input.resilienceProfile ??
    buildResilienceProfile({
      holdings: input.holdings,
      goal: input.goal,
      hasSavedGoal: input.hasSavedGoal,
    });

  const sensitivity = buildSensitivityLayer(resilience);
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
  });

  layers.push(buildConfidenceLayer(intelligence, view));

  if (layers.length === 0) return null;

  return {
    insight,
    layers,
    omittedLayerIds,
  };
}
