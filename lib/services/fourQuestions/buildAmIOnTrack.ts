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

function formatAssumptionPercent(value: number): string {
  const rounded =
    Number.isInteger(value) || Math.abs(value - Math.round(value)) < 1e-9
      ? String(Math.round(value))
      : (Math.round(value * 10) / 10).toFixed(1);
  return `${rounded}%`;
}

/** True when Reality Check history is long enough to show a pace comparison. */
export function isMeaningfulRecentPace(
  realityCheck: GoalRealityCheck | null | undefined,
): boolean {
  if (!realityCheck?.available) return false;
  if (realityCheck.historyQuality === "short") return false;
  if (realityCheck.yearsRepresented < 0.25) return false;
  return true;
}

/**
 * Glance support: saved planning assumption first; recent pace only when meaningful.
 */
export function formatOnTrackSupportLine(input: {
  expectedAnnualReturnPercent: number | null;
  realityCheck: GoalRealityCheck | null;
}): string | null {
  const parts: string[] = [];
  if (input.expectedAnnualReturnPercent != null) {
    parts.push(
      `Based on your saved ${formatAssumptionPercent(input.expectedAnnualReturnPercent)} growth assumption.`,
    );
  }

  if (isMeaningfulRecentPace(input.realityCheck) && input.realityCheck?.available) {
    parts.push(input.realityCheck.conclusion);
  } else if (input.expectedAnnualReturnPercent != null) {
    parts.push(
      "Recent portfolio history isn’t yet sufficient for a meaningful pace comparison.",
    );
  }

  return parts.length > 0 ? parts.join(" ") : null;
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
  const savedAssumption = getExpectedReturnAssumption(goal);
  const polished = formatOnTrackSupportLine({
    expectedAnnualReturnPercent: savedAssumption,
    realityCheck,
  });
  const support = polished ?? card.contextLine ?? card.conclusion;

  const exploreHref = fourQuestionHubPath("am_i_on_track");
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
    exploreHref,
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
      emphasis: "supporting",
    });
  }

  const disclosures: string[] = [];
  if (isMeaningfulRecentPace(realityCheck) && realityCheck?.available) {
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
      href: exploreHref,
    },
    quiet: false,
    scope,
  };
}
