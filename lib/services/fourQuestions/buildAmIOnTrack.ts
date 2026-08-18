/**
 * Q3 — Am I on track? (Goals + Reality Check — no new math)
 */

import { buildGoalConclusion } from "@/lib/client/dashboardConclusions";
import { getExpectedReturnAssumption } from "@/lib/client/expectedReturnAssumption";
import { PORTFOLIO_HISTORY_PATH } from "@/lib/navigation/appRoutes";
import { fourQuestionHubPath } from "@/lib/services/fourQuestions/catalog";
import type { IntelligenceScopeId } from "@/lib/services/intelligenceScope";
import {
  buildChangeTrace,
  mergeChangeIntoTrace,
} from "@/lib/services/changeIntelligence/buildChangeTrace";
import type { ChangeIntelligenceSummary } from "@/lib/services/changeIntelligence/types";
import { buildOnTrackTrace, traceToExpandItems } from "@/lib/services/intelligenceTrace";
import {
  isMeaningfulRecentPace,
  type GoalRealityCheck,
} from "@/lib/services/goals/buildGoalRealityCheck";
import type { GoalProgress } from "@/lib/services/goals/goalProgressEngine";
import type {
  FourQuestionAnswer,
  FourQuestionExpandItem,
  FourQuestionsIntelligenceDepth,
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

export { isMeaningfulRecentPace };

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
  changeIntelligence?: ChangeIntelligenceSummary | null;
  intelligenceDepth?: FourQuestionsIntelligenceDepth;
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
  const depth = input.intelligenceDepth === "free" ? "free" : "complete";
  const goalChange =
    input.changeIntelligence?.status === "ready"
      ? input.changeIntelligence.goalChange
      : null;
  const usableGoalProgress =
    goalChange &&
    !goalChange.goalDefinitionChanged &&
    goalChange.signal.materiality === "material"
      ? goalChange
      : null;

  let glance = answer;
  let glanceSupport = support;
  if (usableGoalProgress && depth === "complete") {
    glance = usableGoalProgress.headline;
    glanceSupport = support;
  } else if (goalChange?.goalDefinitionChanged) {
    glanceSupport = [
      "Your saved goal definition changed, so progress is not compared as an investment result.",
      support,
    ]
      .filter(Boolean)
      .join(" ");
  }

  const exploreHref = fourQuestionHubPath("am_i_on_track");
  const baseTrace = buildOnTrackTrace({
    insight: glance,
    progress,
    goal,
    realityCheck,
    resilienceProfile: input.resilienceProfile,
  });
  const trace =
    usableGoalProgress && depth === "complete"
      ? mergeChangeIntoTrace(
          baseTrace,
          buildChangeTrace({ insight: glance, story: usableGoalProgress }),
        )
      : goalChange?.goalDefinitionChanged && baseTrace
        ? {
            ...baseTrace,
            layers: [
              ...baseTrace.layers,
              {
                id: "change" as const,
                title: "Goal definition",
                detail: goalChange.meaning,
                presentation: "expand" as const,
                href: "/goals",
                emphasis: "supporting" as const,
              },
            ],
          }
        : baseTrace;
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
    answer: glance,
    support: glanceSupport,
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
