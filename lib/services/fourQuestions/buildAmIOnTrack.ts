/**
 * Q3 — Am I on track? (Goals + Reality Check — no new math)
 */

import { formatExpectedReturnAssumptionContext } from "@/lib/client/expectedReturnAssumption";
import { DASHBOARD_DEEP_LINKS } from "@/lib/navigation/deepLinks";
import { buildGoalConclusion } from "@/lib/client/dashboardConclusions";
import type { IntelligenceScopeId } from "@/lib/services/intelligenceScope";
import type { GoalRealityCheck } from "@/lib/services/goals/buildGoalRealityCheck";
import type { GoalProgress } from "@/lib/services/goals/goalProgressEngine";
import type { FourQuestionAnswer } from "@/lib/services/fourQuestions/types";
import type { GoalSettings } from "@/lib/types/portfolioStorage";

function formatGap(gapPp: number): string {
  const rounded = Math.round(gapPp * 10) / 10;
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded.toFixed(1)} pp`;
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
        label: "Explore goals",
        href: DASHBOARD_DEEP_LINKS.goals,
      },
      quiet: true,
      scope,
    };
  }

  const answer = card.status;
  let support = card.contextLine ?? card.conclusion;

  if (realityCheck?.available) {
    const pace = `${realityCheck.comparableAnnualPercent.toFixed(1)}% recent annualized pace`;
    const assumption = `${realityCheck.expectedAnnualReturnPercent}% assumption`;
    support = `${assumption} · ${pace}`;
  }

  const expandItems = [
    {
      id: "progress",
      label: "Progress",
      detail: `${Math.round(progress.currentProgressPercent)}% of ${card.status.includes("€") ? "target" : "goal"} · ${progress.status}`,
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
    });
  }

  if (typeof goal?.expectedAnnualReturn === "number") {
    expandItems.push({
      id: "assumption",
      label: "Expected return",
      detail: formatExpectedReturnAssumptionContext(goal.expectedAnnualReturn),
    });
  }

  if (realityCheck?.available) {
    expandItems.push({
      id: "reality",
      label: "Reality check",
      detail: `${realityCheck.comparableAnnualPercent.toFixed(1)}% ${realityCheck.sourcePeriodLabel} · gap ${formatGap(realityCheck.gapPp)}`,
    });
  }

  if (contributionSummaryLine?.trim()) {
    expandItems.push({
      id: "contributions",
      label: "Contributions",
      detail: contributionSummaryLine.trim(),
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
      label: "Explore goals",
      href: DASHBOARD_DEEP_LINKS.goalProgress,
    },
    quiet: false,
    scope,
  };
}
