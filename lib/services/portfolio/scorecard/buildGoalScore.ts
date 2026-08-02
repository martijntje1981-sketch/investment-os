/**
 * Goal Score — plan tracking quality, not % of target reached alone.
 */

import type { GoalProgress } from "@/lib/services/goals/goalProgressEngine";
import type { GoalSettings } from "@/lib/types/portfolioStorage";
import {
  GOAL_BANDS,
  PORTFOLIO_SCORECARD_VERSION,
} from "@/lib/services/portfolio/scorecard/config";
import {
  availableScore,
  clampScore,
  confidenceFromLevel,
  interpolateAnchors,
  unavailableScore,
} from "@/lib/services/portfolio/scorecard/math";
import type { PortfolioScore } from "@/lib/services/portfolio/scorecard/types";
import { DASHBOARD_DEEP_LINKS } from "@/lib/navigation/deepLinks";

export type BuildGoalScoreInput = {
  goal: GoalSettings | null;
  hasSavedGoal: boolean;
  progress: GoalProgress;
  calculatedAt?: string;
};

function monthsUntilTargetYear(targetYear: number, now = new Date()): number {
  const end = Date.UTC(targetYear, 11, 31);
  return Math.max(0, (end - now.getTime()) / (30.4375 * 24 * 60 * 60 * 1000));
}

function projectValue(
  current: number,
  monthly: number,
  annualReturnPercent: number,
  months: number,
): number {
  const monthlyRate = Math.pow(1 + annualReturnPercent / 100, 1 / 12) - 1;
  let value = current;
  for (let i = 0; i < months; i += 1) {
    value = value * (1 + monthlyRate) + Math.max(0, monthly);
  }
  return value;
}

export function buildGoalScore(input: BuildGoalScoreInput): PortfolioScore {
  const calculatedAt = input.calculatedAt ?? new Date().toISOString();

  if (!input.hasSavedGoal || !input.goal) {
    return unavailableScore({
      id: "goal",
      version: `${PORTFOLIO_SCORECARD_VERSION}-goal`,
      label: "Goal",
      shortLabel: "Goal",
      reason: "Set a goal",
      calculatedAt,
      href: DASHBOARD_DEEP_LINKS.goalScore,
    });
  }

  const goal = input.goal;
  const progress = input.progress;
  const months = monthsUntilTargetYear(goal.targetYear);
  const projected = projectValue(
    progress.currentValue,
    goal.monthlyContribution,
    goal.expectedAnnualReturn,
    months,
  );
  const attainmentRatio =
    goal.targetValue > 0 ? projected / goal.targetValue : 0;

  // A. Projected attainment (primary)
  let attainmentScore = interpolateAnchors(attainmentRatio * 100, [
    { at: 40, score: 18 },
    { at: 70, score: 40 },
    { at: 90, score: 58 },
    { at: 100, score: 78 },
    { at: 120, score: 92 },
    { at: 150, score: 98 },
  ]);

  if (progress.goalReached) {
    attainmentScore = 96;
  }

  // B. Status / trajectory alignment
  const statusBoost =
    progress.status === "Ahead of schedule"
      ? 8
      : progress.status === "On track"
        ? 4
        : progress.status === "Slightly behind"
          ? -4
          : progress.status === "Behind schedule"
            ? -12
            : 0;

  // C. Contribution gap (requiredMonthlyGrowth vs configured contribution)
  let contributionScore = 70;
  const requiredExtra = progress.requiredMonthlyGrowth;
  if (
    requiredExtra != null &&
    requiredExtra > 0 &&
    goal.monthlyContribution >= 0
  ) {
    const gapRatio =
      goal.monthlyContribution > 0
        ? requiredExtra / goal.monthlyContribution
        : 2;
    contributionScore = interpolateAnchors(gapRatio, [
      { at: 0, score: 90 },
      { at: 0.25, score: 72 },
      { at: 0.75, score: 52 },
      { at: 1.5, score: 34 },
      { at: 3, score: 20 },
    ]);
  } else if (requiredExtra === 0 || requiredExtra == null) {
    contributionScore = 82;
  }

  // D. Progress toward target (secondary, capped influence)
  const progressComponent = interpolateAnchors(
    progress.currentProgressPercent,
    [
      { at: 5, score: 35 },
      { at: 25, score: 55 },
      { at: 50, score: 72 },
      { at: 75, score: 86 },
      { at: 100, score: 95 },
    ],
  );

  const raw = clampScore(
    attainmentScore * 0.5 +
      contributionScore * 0.25 +
      progressComponent * 0.15 +
      (50 + statusBoost) * 0.1,
  );

  const evidence = [
    {
      id: "projected-attainment",
      label: "Projected attainment",
      value: Number((attainmentRatio * 100).toFixed(0)),
      explanation: `Projected value is ${Math.round(attainmentRatio * 100)}% of the target by ${goal.targetYear}.`,
    },
    {
      id: "years-remaining",
      label: "Time remaining",
      value: Number((months / 12).toFixed(1)),
      explanation: `About ${(months / 12).toFixed(1)} years remain until the target year.`,
    },
    {
      id: "progress-percent",
      label: "Current progress",
      value: Number(progress.currentProgressPercent.toFixed(1)),
      explanation: `Current portfolio value is ${progress.currentProgressPercent.toFixed(1)}% of the target.`,
    },
  ];

  if (requiredExtra != null && requiredExtra > 0) {
    evidence.push({
      id: "contribution-gap",
      label: "Contribution gap",
      value: Number(requiredExtra.toFixed(0)),
      explanation:
        "Current monthly contribution is below the amount implied by the target plan.",
    });
  }

  const strengths: string[] = [];
  const attention: string[] = [];
  if (attainmentRatio >= 1)
    strengths.push("Projection meets or exceeds the target");
  else attention.push("Projection remains below the configured target");
  if (
    progress.status === "On track" ||
    progress.status === "Ahead of schedule"
  ) {
    strengths.push(`Plan status: ${progress.status}`);
  } else if (progress.status !== "Unknown") {
    attention.push(`Plan status: ${progress.status}`);
  }

  return availableScore({
    id: "goal",
    version: `${PORTFOLIO_SCORECARD_VERSION}-goal`,
    value: raw,
    label: "Goal",
    shortLabel: "Goal",
    bands: GOAL_BANDS,
    confidence: confidenceFromLevel(
      months > 0 && goal.targetValue > 0 ? "high" : "moderate",
    ),
    summary:
      GOAL_BANDS.find((b) => raw >= b.min && raw <= b.max)?.label ??
      progress.status,
    evidence,
    strengths,
    attentionPoints: attention,
    calculatedAt,
    href: DASHBOARD_DEEP_LINKS.goalScore,
  });
}
