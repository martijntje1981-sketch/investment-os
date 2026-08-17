/**
 * Q4 — What's ahead? (existing scenarios + resilience only; no forecasts)
 */

import { DASHBOARD_DEEP_LINKS } from "@/lib/navigation/deepLinks";
import { fourQuestionHubPath } from "@/lib/services/fourQuestions/catalog";
import type { IntelligenceScopeId } from "@/lib/services/intelligenceScope";
import { buildResilienceProfile } from "@/lib/services/resilience";
import { selectRelevantPortfolioScenarios } from "@/lib/services/scenarioRelevance";
import type {
  FourQuestionAnswer,
  FourQuestionExpandItem,
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
  /** Only include when already available from existing intelligence payload. */
  nextEventLabel?: string | null;
  /** Existing events destination when the label is trustworthy. */
  nextEventHref?: string | null;
}): FourQuestionAnswer {
  const {
    scope,
    holdings,
    goal,
    hasSavedGoal,
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

  const resilience = buildResilienceProfile({
    holdings,
    goal,
    hasSavedGoal,
  });
  const scenarios = selectRelevantPortfolioScenarios(holdings);
  const top = scenarios.modeled[0] ?? null;

  let answer = QUIET_ANSWER;
  let support: string | null = null;
  let quiet = true;

  if (top) {
    answer = `Your portfolio is most sensitive to ${top.scenarioName}.`;
    support =
      top.result.estimatedPortfolioImpactPercent != null
        ? `Modeled impact about ${top.result.estimatedPortfolioImpactPercent.toFixed(1)}% on affected holdings.`
        : top.reason;
    quiet = false;
  } else if (
    resilience.status === "ok" &&
    resilience.mostSensitive?.scenarioName
  ) {
    answer = `Your portfolio is most sensitive to ${resilience.mostSensitive.scenarioName}.`;
    support =
      resilience.score != null
        ? `Resilience ${resilience.score}/100${resilience.bandLabel ? ` · ${resilience.bandLabel}` : ""}`
        : null;
    quiet = false;
  } else if (resilience.status === "ok" && resilience.summary) {
    answer = resilience.summary;
    support =
      resilience.score != null ? `Resilience ${resilience.score}/100` : null;
    quiet = false;
  }

  const expandItems: FourQuestionExpandItem[] = [];

  if (top) {
    expandItems.push({
      id: "scenario",
      label: "Top scenario",
      detail: `${top.scenarioName}${
        top.affectedWeightPercent != null
          ? ` · ${Math.round(top.affectedWeightPercent)}% of portfolio affected`
          : ""
      }`,
      href: DASHBOARD_DEEP_LINKS.scenarioStress,
    });
  }

  if (resilience.status === "ok" && resilience.score != null) {
    expandItems.push({
      id: "resilience",
      label: "Resilience",
      detail: `${resilience.score}/100${
        resilience.bandLabel ? ` · ${resilience.bandLabel}` : ""
      }${
        resilience.primaryDriverExplanation
          ? ` — ${resilience.primaryDriverExplanation.split(".")[0]}.`
          : ""
      }`,
      href: DASHBOARD_DEEP_LINKS.resilienceSleep,
    });
  }

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
