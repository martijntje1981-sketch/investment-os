/**
 * Q2 — What matters now? (Personal Intelligence + scoped context)
 */

import {
  buildPersonalIntelligenceConclusion,
  selectDashboardActionPlanItems,
} from "@/lib/client/dashboardConclusions";
import { formatAllocationPercent } from "@/lib/services/classification";
import { fourQuestionHubPath } from "@/lib/services/fourQuestions/catalog";
import {
  buildChangeTrace,
} from "@/lib/services/changeIntelligence/buildChangeTrace";
import type { ChangeIntelligenceSummary } from "@/lib/services/changeIntelligence/types";
import { buildEvolutionQ2ExpandItems } from "@/lib/services/portfolioEvolution/buildEvolutionQ2ExpandItems";
import type { PortfolioEvolutionTimeline } from "@/lib/services/portfolioEvolution/types";
import {
  buildWhatMattersTrace,
  traceToExpandItems,
} from "@/lib/services/intelligenceTrace";
import type { IntelligenceScopeId } from "@/lib/services/intelligenceScope";
import { buildMarketCalmer } from "@/lib/services/marketCalmer";
import { buildPersonalActionPlan } from "@/lib/services/personalIntelligence/buildPersonalActionPlan";
import { buildThirtySecondsBriefingView } from "@/lib/services/personalIntelligence/thirtySecondsBriefing";
import type { PersonalIntelligenceToday } from "@/lib/services/personalIntelligence";
import type {
  FourQuestionAnswer,
  FourQuestionExpandItem,
  FourQuestionsIntelligenceDepth,
} from "@/lib/services/fourQuestions/types";
import type { IntelligenceTraceLayer } from "@/lib/services/intelligenceTrace";
import type { BriefingAttentionPick } from "@/lib/services/fourQuestions/briefingSelection";
import type { ResilienceProfile } from "@/lib/services/resilience";
import type {
  GoalSettings,
  StoredPortfolioHolding,
} from "@/lib/types/portfolioStorage";

const QUIET_ANSWER = "Nothing requires special attention right now.";
const CONCENTRATION_WEIGHT_THRESHOLD = 35;

function isDailyDriverWording(text: string): boolean {
  return /main driver|largest driver|explains most of|today’s largest contributor|today's largest contributor|today’s largest detractor|today's largest detractor/i.test(
    text,
  );
}

function isPortfolioMoveHeadline(text: string): boolean {
  return /larger-than-usual|larger than usual|portfolio moved/i.test(text);
}

function buildStructuralAttention(input: {
  intelligence: PersonalIntelligenceToday;
}): { answer: string; support: string } | null {
  const leadingWeight = input.intelligence.holdingsWeights
    .slice()
    .sort((left, right) => right.weightPercent - left.weightPercent)[0];
  if (!leadingWeight || leadingWeight.weightPercent < CONCENTRATION_WEIGHT_THRESHOLD) {
    return null;
  }

  const symbol = leadingWeight.symbol.trim().toUpperCase();
  const group = input.intelligence.exposure?.groups.find((row) =>
    row.holdings.some((holding) => holding.symbol.trim().toUpperCase() === symbol),
  );

  const support =
    group && group.displayPercent >= 20
      ? `About ${formatAllocationPercent(group.displayPercent)} of portfolio value is linked to ${group.displayLabel.toLowerCase()} exposure.`
      : `About ${formatAllocationPercent(leadingWeight.weightPercent)} of portfolio value currently sits in one holding.`;

  return {
    answer: `${leadingWeight.name} remains your largest portfolio concentration.`,
    support,
  };
}

export function buildWhatMattersNowQuestion(input: {
  scope: IntelligenceScopeId;
  holdings: StoredPortfolioHolding[];
  intelligence: PersonalIntelligenceToday | null;
  /** Optional crypto-scoped one-liner when already computed. */
  cryptoDashboardLine?: string | null;
  goal: GoalSettings | null;
  hasSavedGoal: boolean;
  resilienceProfile: ResilienceProfile | null;
  avoidDailyDriverSymbol?: string | null;
  relevantContext?: IntelligenceTraceLayer | null;
  changeIntelligence?: ChangeIntelligenceSummary | null;
  intelligenceDepth?: FourQuestionsIntelligenceDepth;
  /** Candidate evidence only — never wins the Q2 glance. */
  evolutionTimeline?: PortfolioEvolutionTimeline | null;
  /**
   * Portfolio-wide information-value pick. When present, glance follows it
   * (including a valid quiet result) instead of repeating Q1 structure.
   */
  attentionPick?: BriefingAttentionPick | null;
}): FourQuestionAnswer {
  const { scope, holdings, intelligence, cryptoDashboardLine } = input;

  if (!intelligence || holdings.length === 0) {
    return {
      id: "what_matters_now",
      numberLabel: "02",
      question: "What matters now?",
      answer: QUIET_ANSWER,
      support: null,
      expandItems: [],
      disclosures: [],
      explore: {
        label: "Explore full analysis",
        href: fourQuestionHubPath("what_matters_now"),
      },
      quiet: true,
      scope,
    };
  }

  const view = buildThirtySecondsBriefingView(intelligence);
  const calmer = buildMarketCalmer({
    intelligence,
    holdings,
  });
  const actionPlan = buildPersonalActionPlan(intelligence, {
    suppressUnderstandForSymbols: undefined,
  });
  const conclusion = buildPersonalIntelligenceConclusion({
    intelligence,
    view,
    calmer,
    actionPlan,
  });

  const planItems = selectDashboardActionPlanItems(actionPlan, {
    isQuiet: conclusion.isQuiet,
    calmerActive: calmer.activation !== "inactive",
  });

  let answer = conclusion.primaryConclusion;
  let quiet = conclusion.isQuiet;
  const attentionPick = input.attentionPick ?? null;
  const usedAttentionPick = Boolean(attentionPick) && scope !== "crypto";

  if (
    scope === "crypto" &&
    cryptoDashboardLine?.trim() &&
    !conclusion.isQuiet
  ) {
    answer = cryptoDashboardLine.trim();
  } else if (
    scope === "crypto" &&
    cryptoDashboardLine?.trim() &&
    conclusion.isQuiet
  ) {
    answer = cryptoDashboardLine.trim();
    quiet = false;
  } else if (usedAttentionPick && attentionPick) {
    answer = attentionPick.answer;
    quiet = attentionPick.quiet;
  } else if (conclusion.isQuiet) {
    answer = QUIET_ANSWER;
  }

  const structural = buildStructuralAttention({ intelligence });
  const avoidSymbol = input.avoidDailyDriverSymbol?.trim().toUpperCase() || null;
  const repeatsQ1Driver = Boolean(
    avoidSymbol &&
      new RegExp(
        `\\b${avoidSymbol.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
        "i",
      ).test(answer) &&
      /today|driver|contributor|detractor|explains/i.test(answer),
  );

  // Q1 owns today's realized driver. Never leave Q2 on daily-driver wording,
  // even when the concentrated holding is a different name from Q1's mover.
  // When the briefing pick already searched the book, honor a quiet result
  // instead of falling back to the same-theme concentration sentence.
  if (
    !usedAttentionPick &&
    (isDailyDriverWording(answer) ||
      repeatsQ1Driver ||
      (isPortfolioMoveHeadline(answer) && structural))
  ) {
    if (structural) {
      answer = structural.answer;
      quiet = false;
    } else {
      answer = "Nothing else requires special attention beyond today’s move.";
    }
  }

  const structuralChange =
    input.changeIntelligence?.status === "ready"
      ? input.changeIntelligence.primaryStory
      : null;
  const depth = input.intelligenceDepth === "free" ? "free" : "complete";
  const usedChangeStory =
    Boolean(structuralChange) &&
    (!usedAttentionPick ||
      attentionPick?.answer === structuralChange?.headline ||
      attentionPick?.answer === structuralChange?.freeHeadline);
  if (structuralChange && usedChangeStory && !usedAttentionPick) {
    answer =
      depth === "free" ? structuralChange.freeHeadline : structuralChange.headline;
    quiet = false;
  } else if (
    structuralChange &&
    usedChangeStory &&
    usedAttentionPick &&
    depth === "free"
  ) {
    answer = structuralChange.freeHeadline;
    quiet = false;
  }

  const support =
    !quiet && usedAttentionPick
      ? depth === "complete"
        ? attentionPick?.support ?? null
        : null
      : !quiet && structuralChange && usedChangeStory
      ? depth === "complete"
        ? structuralChange.relatedLines[0] ?? structuralChange.meaning
        : null
      : !quiet && structural && /concentration/i.test(answer)
        ? structural.support
        : !quiet &&
            depth === "complete" &&
            intelligence.exposure?.fixedIncome &&
            intelligence.exposure.fixedIncome.weightPercent >= 15 &&
            intelligence.exposure.fixedIncome.majorityIsLongDuration &&
            intelligence.exposure.fixedIncome.majorityIsGovernment
          ? "Most of your bond exposure is concentrated in long-duration government debt."
          : !quiet &&
              intelligence.exposure?.fixedIncome &&
              intelligence.exposure.fixedIncome.weightPercent >= 15
            ? `Fixed income now represents ${formatAllocationPercent(intelligence.exposure.fixedIncome.weightPercent)} of your portfolio.`
        : !quiet &&
            conclusion.attentionLine &&
            !isDailyDriverWording(conclusion.attentionLine)
          ? conclusion.attentionLine
          : !quiet &&
              planItems[0] &&
              !isDailyDriverWording(planItems[0].headline)
            ? planItems[0].headline
            : null;

  const exploreHref = fourQuestionHubPath("what_matters_now");
  const changeTrace =
    structuralChange && usedChangeStory
      ? buildChangeTrace({
          insight: answer,
          story: structuralChange,
          extraLayers: input.relevantContext ? [input.relevantContext] : [],
        })
      : null;
  const trace =
    changeTrace ??
    buildWhatMattersTrace({
      insight: answer,
      intelligence,
      view,
      holdings,
      // Phase 7A scope: only one goal-impact connection (Resilience / Sleep Well).
      goal: input.goal,
      hasSavedGoal: false,
      resilienceProfile: input.resilienceProfile,
      relevantContext: input.relevantContext,
    });

  const expandItems: FourQuestionExpandItem[] = [
    ...(traceToExpandItems({
      trace,
      questionId: "what_matters_now",
      depth: "complete",
      exploreHref,
    }) ?? []),
    ...buildEvolutionQ2ExpandItems(input.evolutionTimeline),
  ];

  return {
    id: "what_matters_now",
    numberLabel: "02",
    question: "What matters now?",
    answer,
    support: quiet ? null : support,
    expandItems,
    disclosures: [],
    explore: {
      label: "Explore full analysis",
      href: exploreHref,
    },
    quiet,
    scope,
  };
}
