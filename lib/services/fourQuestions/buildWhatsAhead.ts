/**
 * Q4 — What's ahead? (existing scenarios + resilience only; no forecasts)
 */

import { fourQuestionHubPath } from "@/lib/services/fourQuestions/catalog";
import {
  selectForwardScenario,
  themeKeyForScenarioId,
  usedThemeKeysInclude,
} from "@/lib/services/fourQuestions/briefingSelection";
import type { IntelligenceScopeId } from "@/lib/services/intelligenceScope";
import {
  buildChangeTrace,
  mergeChangeIntoTrace,
} from "@/lib/services/changeIntelligence/buildChangeTrace";
import type { ChangeIntelligenceSummary } from "@/lib/services/changeIntelligence/types";
import { buildResilienceProfile } from "@/lib/services/resilience";
import { buildResilienceTrace, traceToExpandItems } from "@/lib/services/intelligenceTrace";
import { buildPortfolioExposureAllocation } from "@/lib/services/classification";
import { buildQualitativeRateOutlook } from "@/lib/services/classification/bondsRatesView";
import { DASHBOARD_DEEP_LINKS } from "@/lib/navigation/deepLinks";
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
  /** Themes already used by earlier questions — skip repeating the same risk. */
  usedThemeKeys?: readonly string[];
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
  const usedThemeKeys = input.usedThemeKeys ?? [];
  const mostSensitiveTheme = themeKeyForScenarioId(
    resilience.mostSensitive?.scenarioId,
  );
  const mostSensitiveThemeUsed = usedThemeKeysInclude(
    usedThemeKeys,
    mostSensitiveTheme,
  );

  if (
    resilience.status === "ok" &&
    resilience.mostSensitive?.scenarioName &&
    !mostSensitiveThemeUsed
  ) {
    answer = `Your portfolio is most sensitive to ${resilience.mostSensitive.scenarioName}.`;
    support =
      resilience.mostSensitive.estimatedPortfolioImpactPercent != null
        ? `Modeled impact about ${resilience.mostSensitive.estimatedPortfolioImpactPercent.toFixed(1)}% under the most sensitive modeled scenario.`
        : resilience.score != null
          ? `Resilience ${resilience.score}/100${resilience.bandLabel ? ` · ${resilience.bandLabel}` : ""}`
          : null;
    quiet = false;
  } else if (
    resilience.status === "ok" &&
    resilience.summary &&
    !mostSensitiveThemeUsed
  ) {
    answer = resilience.summary;
    support =
      resilience.score != null ? `Resilience ${resilience.score}/100` : null;
    quiet = false;
  }

  const eventLabel = nextEventLabel?.trim() || null;
  if (mostSensitiveThemeUsed && eventLabel) {
    answer = eventLabel;
    support = "Upcoming event already on your calendar — not a forecast.";
    quiet = false;
  } else if (mostSensitiveThemeUsed) {
    const forward = selectForwardScenario(resilience, usedThemeKeys);
    if (forward?.scenarioName) {
      answer = `A further modeled risk is ${forward.scenarioName}.`;
      support =
        forward.estimatedPortfolioImpactPercent != null
          ? `Modeled impact about ${forward.estimatedPortfolioImpactPercent.toFixed(1)}% under that scenario.`
          : null;
      quiet = false;
    } else {
      answer = QUIET_ANSWER;
      support = null;
      quiet = true;
    }
  }

  const depth = input.intelligenceDepth === "free" ? "free" : "complete";
  const resilienceChange =
    input.changeIntelligence?.status === "ready"
      ? input.changeIntelligence.resilienceChange
      : null;
  // Period-over-period sensitivity change is a different fact from today's
  // move or the static "most sensitive" scenario, so it may still win.
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

  const sleeve = buildPortfolioExposureAllocation(holdings).fixedIncome;
  const rateOutlook = buildQualitativeRateOutlook({
    weightPercent: sleeve?.weightPercent ?? null,
    durationKnownSharePercent: sleeve?.durationKnownSharePercent ?? 0,
    durationClassifiedSharePercent: sleeve?.durationClassifiedSharePercent,
    majorityIsLongDuration: sleeve?.majorityIsLongDuration ?? false,
    majorityIsClassifiedLongDuration: sleeve?.majorityIsClassifiedLongDuration,
  });
  if (rateOutlook) {
    expandItems.push({
      id: "fixed-income-rates",
      label: "Bonds and rates",
      detail: rateOutlook,
      href: DASHBOARD_DEEP_LINKS.bondsRates,
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
