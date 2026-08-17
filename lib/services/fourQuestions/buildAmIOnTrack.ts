/**
 * Q3 — Am I on track? (Goals + Reality Check — no new math)
 */

import { formatExpectedReturnAssumptionContext } from "@/lib/client/expectedReturnAssumption";
import { buildGoalConclusion } from "@/lib/client/dashboardConclusions";
import { GOALS_PATH, PORTFOLIO_HISTORY_PATH } from "@/lib/navigation/appRoutes";
import { fourQuestionHubPath } from "@/lib/services/fourQuestions/catalog";
import type { IntelligenceScopeId } from "@/lib/services/intelligenceScope";
import type { GoalRealityCheck } from "@/lib/services/goals/buildGoalRealityCheck";
import type { GoalProgress } from "@/lib/services/goals/goalProgressEngine";
import type {
  FourQuestionAnswer,
  FourQuestionExpandItem,
} from "@/lib/services/fourQuestions/types";
import type { GoalSettings } from "@/lib/types/portfolioStorage";

const GOAL_REALITY_HREF = `${GOALS_PATH}#goal-reality-check`;

function formatGap(gapPp: number): string {
  const rounded = Math.round(gapPp * 10) / 10;
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded.toFixed(1)} pp`;
}

function formatPacePercent(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded.toFixed(1)}%`;
}

/**
 * Glance support: keep on-track status separate from realized pace wording.
 * Does not change goal mathematics — only clarifies that pace ≠ assumption.
 */
export function formatOnTrackSupportLine(input: {
  expectedAnnualReturnPercent: number;
  recentAnnualizedPacePercent: number;
}): string {
  return `Under your ${input.expectedAnnualReturnPercent}% assumption · recent pace ${formatPacePercent(input.recentAnnualizedPacePercent)}`;
}

export function buildAmIOnTrackQuestion(input: {
  scope: IntelligenceScopeId;
  progress: GoalProgress;
  goal: GoalSettings | null;
  realityCheck: GoalRealityCheck | null;
  contributionSummaryLine?: string | null;
}): FourQuestionAnswer {
  const { scope, progress, goal, realityCheck, contributionSummaryLine } =
    input;
  const card = buildGoalConclusion(progress, goal);

  if (!progress.hasGoal || !card) {
    return {
      id: "am_i_on_track",
      numberLabel: "03",
      question: "Am I on track?",
      answer: "No goal is set yet.",
      support: "Add a target on Goals to track progress.",
      expandItems: [],
      disclosures: [],
      explore: {
        label: "Explore full analysis",
        href: fourQuestionHubPath("am_i_on_track"),
      },
      quiet: true,
      scope,
    };
  }

  const answer = card.status;
  let support = card.contextLine ?? card.conclusion;

  if (realityCheck?.available) {
    support = formatOnTrackSupportLine({
      expectedAnnualReturnPercent: realityCheck.expectedAnnualReturnPercent,
      recentAnnualizedPacePercent: realityCheck.comparableAnnualPercent,
    });
  }

  const expandItems: FourQuestionExpandItem[] = [
    {
      id: "progress",
      label: "Progress",
      detail: `${Math.round(progress.currentProgressPercent)}% of ${card.status.includes("€") ? "target" : "goal"} · ${progress.status}`,
      href: GOALS_PATH,
    },
  ];

  if (
    progress.estimatedCompletionLabel &&
    progress.estimatedCompletionLabel !== "Insufficient history" &&
    !progress.goalReached
  ) {
    expandItems.push({
      id: "projection",
      label: "Projected completion",
      detail: progress.estimatedCompletionLabel,
      href: GOALS_PATH,
    });
  }

  if (typeof goal?.expectedAnnualReturn === "number") {
    expandItems.push({
      id: "assumption",
      label: "Expected return",
      detail: formatExpectedReturnAssumptionContext(goal.expectedAnnualReturn),
      href: GOAL_REALITY_HREF,
    });
  }

  if (realityCheck?.available) {
    expandItems.push({
      id: "reality",
      label: "Reality check",
      detail: `${realityCheck.comparableAnnualPercent.toFixed(1)}% ${realityCheck.sourcePeriodLabel} · gap ${formatGap(realityCheck.gapPp)}`,
      href: GOAL_REALITY_HREF,
    });
  }

  if (contributionSummaryLine?.trim()) {
    expandItems.push({
      id: "contributions",
      label: "Contributions",
      detail: contributionSummaryLine.trim(),
      href: PORTFOLIO_HISTORY_PATH,
    });
  }

  const disclosures: string[] = [];
  if (realityCheck?.available) {
    disclosures.push(realityCheck.disclaimer);
  } else {
    disclosures.push(
      "Goal progress uses your saved target and return assumption. It is not a forecast.",
    );
  }

  return {
    id: "am_i_on_track",
    numberLabel: "03",
    question: "Am I on track?",
    answer,
    support,
    expandItems,
    disclosures,
    explore: {
      label: "Explore full analysis",
      href: fourQuestionHubPath("am_i_on_track"),
    },
    quiet: false,
    scope,
  };
}
