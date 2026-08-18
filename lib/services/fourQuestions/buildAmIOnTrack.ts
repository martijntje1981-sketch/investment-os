/**
 * Q3 — Am I on track? (Goals + Reality Check — no new math)
 */

import { buildGoalConclusion } from "@/lib/client/dashboardConclusions";
import { getExpectedReturnAssumption } from "@/lib/client/expectedReturnAssumption";
import { PORTFOLIO_HISTORY_PATH } from "@/lib/navigation/appRoutes";
import { fourQuestionHubPath } from "@/lib/services/fourQuestions/catalog";
import type { IntelligenceScopeId } from "@/lib/services/intelligenceScope";
import { buildOnTrackTrace, traceToExpandItems } from "@/lib/services/intelligenceTrace";
import type { GoalRealityCheck } from "@/lib/services/goals/buildGoalRealityCheck";
import type { GoalProgress } from "@/lib/services/goals/goalProgressEngine";
import type {
  FourQuestionAnswer,
  FourQuestionExpandItem,
} from "@/lib/services/fourQuestions/types";
import type { ResilienceProfile } from "@/lib/services/resilience";
import type { GoalSettings } from "@/lib/types/portfolioStorage";

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
  return `Under your saved ${input.expectedAnnualReturnPercent}% planning assumption · recent pace ${formatPacePercent(input.recentAnnualizedPacePercent)}`;
}

export function buildAmIOnTrackQuestion(input: {
  scope: IntelligenceScopeId;
  progress: GoalProgress;
  goal: GoalSettings | null;
  realityCheck: GoalRealityCheck | null;
  contributionSummaryLine?: string | null;
  resilienceProfile?: ResilienceProfile | null;
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

  const savedAssumption = getExpectedReturnAssumption(goal);

  if (realityCheck?.available && savedAssumption !== null) {
    support = formatOnTrackSupportLine({
      expectedAnnualReturnPercent: realityCheck.expectedAnnualReturnPercent,
      recentAnnualizedPacePercent: realityCheck.comparableAnnualPercent,
    });
  }

  const trace = buildOnTrackTrace({
    insight: answer,
    progress,
    goal,
    realityCheck,
    resilienceProfile: input.resilienceProfile,
  });
  const expandItems: FourQuestionExpandItem[] = traceToExpandItems({
    trace,
    questionId: "am_i_on_track",
    depth: "complete",
  });
  if (
    contributionSummaryLine?.trim() &&
    expandItems.every((item) => item.id !== "contributions")
  ) {
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
      savedAssumption !== null
        ? "Goal progress uses your saved target and planning assumption. It is not a forecast."
        : "Goal progress uses your saved target and available portfolio inputs. It is not a forecast.",
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
