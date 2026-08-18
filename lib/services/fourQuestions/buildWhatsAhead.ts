/**
 * Q4 — What's ahead? (existing scenarios + resilience only; no forecasts)
 */

import { fourQuestionHubPath } from "@/lib/services/fourQuestions/catalog";
import type { IntelligenceScopeId } from "@/lib/services/intelligenceScope";
import {
  buildChangeTrace,
  mergeChangeIntoTrace,
} from "@/lib/services/changeIntelligence/buildChangeTrace";
import type { ChangeIntelligenceSummary } from "@/lib/services/changeIntelligence/types";
import { buildResilienceProfile } from "@/lib/services/resilience";
import { buildResilienceTrace, traceToExpandItems } from "@/lib/services/intelligenceTrace";
import type {
  FourQuestionAnswer,
  FourQuestionExpandItem,
  FourQuestionsIntelligenceDepth,
} from "@/lib/services/fourQuestions/types";
import type {
  GoalSettings,
  StoredPortfolioHolding,
} from "@/lib/types/portfolioStorage";

const QUIET_ANSWER =
  "No major portfolio-specific forward signal is available right now.";

export function buildWhatsAheadQuestion(input: {
  scope: IntelligenceScopeId;
  holdings: StoredPortfolioHolding[];
  goal?: GoalSettings | null;
  hasSavedGoal?: boolean;
  resilienceProfile: ReturnType<typeof buildResilienceProfile> | null;
  /** Only include when already available from existing intelligence payload. */
  nextEventLabel?: string | null;
  /** Existing events destination when the label is trustworthy. */
  nextEventHref?: string | null;
  changeIntelligence?: ChangeIntelligenceSummary | null;
  intelligenceDepth?: FourQuestionsIntelligenceDepth;
}): FourQuestionAnswer {
  const {
    scope,
    holdings,
    goal,
    hasSavedGoal,
    resilienceProfile,
    nextEventLabel,
    nextEventHref,
  } = input;

  if (holdings.length === 0) {
    return {
      id: "whats_ahead",
      numberLabel: "04",
      question: "What’s ahead?",
      answer: QUIET_ANSWER,
      support: null,
      expandItems: [],
      disclosures: [],
      explore: {
        label: "Explore full analysis",
        href: fourQuestionHubPath("whats_ahead"),
      },
      quiet: true,
      scope,
    };
  }

  const resilience =
    resilienceProfile ??
    buildResilienceProfile({
      holdings,
      goal,
      hasSavedGoal,
    });

  let answer = QUIET_ANSWER;
  let support: string | null = null;
  let quiet = true;

  if (
    resilience.status === "ok" &&
    resilience.mostSensitive?.scenarioName
  ) {
    answer = `Your portfolio is most sensitive to ${resilience.mostSensitive.scenarioName}.`;
    support =
      resilience.mostSensitive.estimatedPortfolioImpactPercent != null
        ? `Modeled impact about ${resilience.mostSensitive.estimatedPortfolioImpactPercent.toFixed(1)}% under the most sensitive modeled scenario.`
        : resilience.score != null
          ? `Resilience ${resilience.score}/100${resilience.bandLabel ? ` · ${resilience.bandLabel}` : ""}`
          : null;
    quiet = false;
  } else if (resilience.status === "ok" && resilience.summary) {
    answer = resilience.summary;
    support =
      resilience.score != null ? `Resilience ${resilience.score}/100` : null;
    quiet = false;
  }

  const depth = input.intelligenceDepth === "free" ? "free" : "complete";
  const resilienceChange =
    input.changeIntelligence?.status === "ready"
      ? input.changeIntelligence.resilienceChange
      : null;
  const usableForwardChange =
    Boolean(resilienceChange) &&
    depth === "complete" &&
    resilienceChange?.signal.materiality === "material";
  if (usableForwardChange && resilienceChange) {
    answer = resilienceChange.headline;
    support = resilienceChange.relatedLines[0] ?? resilienceChange.meaning;
    quiet = false;
  }

  const baseTrace =
    resilience.status === "ok"
      ? buildResilienceTrace({ profile: resilience, insight: answer })
      : null;
  const trace =
    usableForwardChange && resilienceChange
      ? mergeChangeIntoTrace(
          baseTrace,
          buildChangeTrace({ insight: answer, story: resilienceChange }),
        )
      : baseTrace;

  const expandItems: FourQuestionExpandItem[] = [
    ...traceToExpandItems({
      trace,
      questionId: "whats_ahead",
      depth: "complete",
    }),
  ];

  if (nextEventLabel?.trim()) {
    expandItems.push({
      id: "event",
      label: "Upcoming",
      detail: nextEventLabel.trim(),
      href: nextEventHref?.trim() || null,
    });
  }

  if (quiet && expandItems.length === 0) {
    expandItems.push({
      id: "none",
      label: "Outlook",
      detail: QUIET_ANSWER,
      href: null,
    });
  }

  return {
    id: "whats_ahead",
    numberLabel: "04",
    question: "What’s ahead?",
    answer,
    support: quiet ? null : support,
    expandItems,
    disclosures: [
      "Scenario and resilience figures are illustrative models, not predictions.",
    ],
    explore: {
      label: "Explore full analysis",
      href: fourQuestionHubPath("whats_ahead"),
    },
    quiet,
    scope,
  };
}
