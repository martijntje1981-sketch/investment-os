/**
 * Deterministic Goals Intelligence — calm, non-advisory insights.
 * Reuses GoalProgress + Portfolio Timeline + factual portfolio structure.
 * Does not invent forecasts or recommend trades.
 */

import type { ConcentrationLevel } from "@/lib/client/portfolioAnalysis";
import type { GoalProgress } from "@/lib/services/goals/goalProgressEngine";
import type { PortfolioTimelineSummary } from "@/lib/services/portfolio/timeline";

export type GoalsInsightTone = "positive" | "neutral" | "attention";

export type GoalsInsight = {
  id: string;
  text: string;
  tone: GoalsInsightTone;
};

export type GoalsForecastView = {
  /** Engine estimate label (may be "Insufficient history"). */
  estimatedCompletionLabel: string;
  remainingAmount: number;
  monthlyContribution: number;
  /** True when completion is an estimate, not a certainty. */
  isEstimate: boolean;
  hasSufficientHistory: boolean;
  statusLabel: GoalProgress["status"];
  trajectoryLabel: GoalProgress["currentTrajectory"];
};

export type GoalsAlignmentView = {
  label: string;
  reason: string;
  concentrationLine: string | null;
};

export type GoalsIntelligenceResult = {
  forecast: GoalsForecastView;
  insights: GoalsInsight[];
  alignment: GoalsAlignmentView | null;
};

function concentrationLine(
  level: ConcentrationLevel | null | undefined,
  largestSymbol: string | null | undefined,
  largestWeight: number | null | undefined,
): string | null {
  if (!level) return null;
  if (level === "highly_concentrated") {
    if (
      largestSymbol &&
      largestWeight != null &&
      Number.isFinite(largestWeight)
    ) {
      return `Portfolio is highly concentrated — largest position ${largestSymbol} at ${largestWeight.toFixed(0)}%.`;
    }
    return "Portfolio is highly concentrated.";
  }
  if (level === "moderately_concentrated") {
    return "Portfolio has moderate concentration.";
  }
  return "Portfolio has limited diversification risk from concentration.";
}

export function buildGoalsIntelligence(input: {
  progress: GoalProgress;
  monthlyContribution: number;
  hasTimelineHistory: boolean;
  timelineSummary?: PortfolioTimelineSummary | null;
  goalAlignment?: { label: string; reason: string } | null;
  concentrationLevel?: ConcentrationLevel | null;
  largestSymbol?: string | null;
  largestWeightPercent?: number | null;
}): GoalsIntelligenceResult {
  const { progress } = input;
  const hasSufficientHistory = input.hasTimelineHistory;
  const isEstimate =
    progress.hasGoal &&
    !progress.goalReached &&
    progress.estimatedCompletionLabel !== "Insufficient history";

  const forecast: GoalsForecastView = {
    estimatedCompletionLabel: progress.hasGoal
      ? progress.estimatedCompletionLabel
      : "Save a goal to see an estimate",
    remainingAmount: progress.remainingAmount,
    monthlyContribution: Math.max(0, input.monthlyContribution),
    isEstimate,
    hasSufficientHistory,
    statusLabel: progress.status,
    trajectoryLabel: progress.currentTrajectory,
  };

  const insights: GoalsInsight[] = [];

  if (!progress.hasGoal) {
    insights.push({
      id: "no-goal",
      text: "Set a target amount and year. Tobailey tracks progress automatically.",
      tone: "neutral",
    });
  } else if (progress.goalReached) {
    insights.push({
      id: "reached",
      text: "You have reached your saved target value.",
      tone: "positive",
    });
  } else {
    if (progress.status === "Ahead of schedule") {
      insights.push({
        id: "ahead",
        text: "You're ahead of schedule toward your target.",
        tone: "positive",
      });
    } else if (progress.status === "On track") {
      insights.push({
        id: "on-track",
        text: "You're currently on track toward your target.",
        tone: "positive",
      });
    } else if (
      progress.status === "Slightly behind" ||
      progress.status === "Behind schedule"
    ) {
      insights.push({
        id: "behind",
        text: "Current pace is behind the saved target date — this is an estimate, not advice.",
        tone: "attention",
      });
    }

    if (input.monthlyContribution > 0) {
      insights.push({
        id: "contributing",
        text: "You're planning consistent monthly contributions.",
        tone: "neutral",
      });
    }

    const growth = input.timelineSummary?.portfolioGrowth;
    const net = input.timelineSummary?.netContributions;
    if (
      hasSufficientHistory &&
      growth != null &&
      net != null &&
      Number.isFinite(growth) &&
      Number.isFinite(net) &&
      growth > 0 &&
      growth > Math.max(0, net) * 0.05
    ) {
      insights.push({
        id: "growth-vs-contrib",
        text: "Your portfolio has grown faster than contributions over the available history.",
        tone: "positive",
      });
    }

    if (!hasSufficientHistory) {
      insights.push({
        id: "insufficient-history",
        text: "More portfolio history is needed for a stronger pace estimate.",
        tone: "neutral",
      });
    } else if (isEstimate) {
      insights.push({
        id: "achievable",
        text: "At the current plan, your target looks achievable as a projection — not a guarantee.",
        tone: "neutral",
      });
    }
  }

  const alignment: GoalsAlignmentView | null = input.goalAlignment
    ? {
        label: input.goalAlignment.label,
        reason: input.goalAlignment.reason,
        concentrationLine: concentrationLine(
          input.concentrationLevel,
          input.largestSymbol,
          input.largestWeightPercent,
        ),
      }
    : null;

  return {
    forecast,
    insights: insights.slice(0, 4),
    alignment,
  };
}

/** Map engine status to a short badge label for the Goals hero. */
export function goalsStatusBadgeLabel(
  status: GoalProgress["status"],
  goalReached: boolean,
): string {
  if (goalReached) return "Goal reached";
  switch (status) {
    case "Ahead of schedule":
      return "Ahead of schedule";
    case "On track":
      return "On track";
    case "Slightly behind":
      return "Slightly behind";
    case "Behind schedule":
      return "Behind schedule";
    default:
      return "Status unavailable";
  }
}
