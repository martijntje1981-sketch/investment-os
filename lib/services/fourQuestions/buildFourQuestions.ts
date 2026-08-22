/**
 * Orchestrate Four Questions answers for a resolved intelligence scope.
 */

import { summarizeDailyPerformance } from "@/lib/client/dailyPerformance";
import { buildValuedPositions } from "@/lib/client/portfolioAnalysis";
import {
  filterHoldingsByIntelligenceScope,
  resolveIntelligenceScope,
  type IntelligenceScopeId,
} from "@/lib/services/intelligenceScope";
import { buildAmIOnTrackQuestion } from "@/lib/services/fourQuestions/buildAmIOnTrack";
import { buildWhatHappenedQuestion } from "@/lib/services/fourQuestions/buildWhatHappened";
import { buildWhatMattersNowQuestion } from "@/lib/services/fourQuestions/buildWhatMattersNow";
import { buildWhatsAheadQuestion } from "@/lib/services/fourQuestions/buildWhatsAhead";
import {
  selectWhatMattersAttention,
  themeKeyForSymbol,
} from "@/lib/services/fourQuestions/briefingSelection";
import { applyFourQuestionsIntelligenceDepth } from "@/lib/services/fourQuestions/applyIntelligenceDepth";
import { buildResilienceProfile } from "@/lib/services/resilience";
import type {
  FourQuestionsBundle,
  FourQuestionsIntelligenceDepth,
} from "@/lib/services/fourQuestions/types";
import type { ChangeIntelligenceSummary } from "@/lib/services/changeIntelligence/types";
import type { PortfolioChangeAttention } from "@/lib/services/portfolioChangeDetection/types";
import { mergePortfolioChangeIntoFourQuestions } from "@/lib/services/portfolioChangeDetection/mergeIntoFourQuestions";
import { mergeStanceIntoFourQuestions } from "@/lib/services/portfolioStance/mergeStanceIntoFourQuestions";
import type { GoalRealityCheck } from "@/lib/services/goals/buildGoalRealityCheck";
import type { GoalProgress } from "@/lib/services/goals/goalProgressEngine";
import type { InvestmentIntelligence } from "@/lib/services/news/investmentIntelligence";
import { buildPersonalIntelligenceToday } from "@/lib/services/personalIntelligence";
import type { PortfolioPulseResult } from "@/lib/services/portfolio/periodScores/types";
import { buildPortfolioExposureAllocation } from "@/lib/services/classification";
import { buildHoldingIntelligenceCandidates } from "@/lib/services/holdingIntelligence/buildHoldingIntelligenceCandidates";
import { findHoldingIntelligenceCandidate } from "@/lib/services/holdingIntelligence/rankHoldingIntelligence";
import { buildQ1HoldingContextLayer, q1StoryExcludeHrefs } from "@/lib/services/holdingIntelligence/q1HoldingContext";
import { selectRelevantContext } from "@/lib/services/intelligenceTrace";
import type { PerspectiveVideo } from "@/lib/services/perspectives/types";
import type { NewsContentItem } from "@/lib/types/newsContent";
import type {
  GoalSettings,
  StoredPortfolioHolding,
} from "@/lib/types/portfolioStorage";

export type BuildFourQuestionsInput = {
  holdings: StoredPortfolioHolding[];
  /** Defaults to complete when omitted. */
  preferredScope?: IntelligenceScopeId | null;
  /**
   * Presentation depth only — defaults to complete.
   * Does not enforce Free access; reserved for a later entitlement slice.
   */
  intelligenceDepth?: FourQuestionsIntelligenceDepth | null;
  goal: GoalSettings | null;
  hasSavedGoal: boolean;
  /** Goal progress already computed on scoped holdings. */
  goalProgress: GoalProgress;
  realityCheck?: GoalRealityCheck | null;
  intelligence?: InvestmentIntelligence | null;
  /** Already-fetched news items only — never fetched here. */
  newsItems?: NewsContentItem[] | null;
  /** Already-fetched Perspective videos only — never fetched here. */
  perspectiveVideos?: PerspectiveVideo[] | null;
  pulse?: PortfolioPulseResult | null;
  cryptoDashboardLine?: string | null;
  contributionSummaryLine?: string | null;
  nextEventLabel?: string | null;
  nextEventHref?: string | null;
  changeIntelligence?: ChangeIntelligenceSummary | null;
  /** Phase 13 attention — optional; glance answers stay unchanged. */
  portfolioChangeAttention?: PortfolioChangeAttention | null;
  /** Q2 expand candidate only — does not override glance ranking. */
  evolutionTimeline?: import("@/lib/services/portfolioEvolution/types").PortfolioEvolutionTimeline | null;
  /** Q2/Q4 supporting expand only — does not override glance ranking. */
  stanceHistory?: import("@/lib/services/portfolioStance/types").PortfolioStanceHistory | null;
};

export function buildFourQuestions(
  input: BuildFourQuestionsInput,
): FourQuestionsBundle {
  const resolution = resolveIntelligenceScope({
    preferred: input.preferredScope,
  });
  const scope = resolution.scope;
  const scopedHoldings = filterHoldingsByIntelligenceScope(
    input.holdings,
    scope,
  );

  const exposure = buildPortfolioExposureAllocation(scopedHoldings);
  const daily = summarizeDailyPerformance(scopedHoldings);
  const { valuedPositions } = buildValuedPositions(scopedHoldings);

  const personalIntelligence =
    scopedHoldings.length > 0
      ? buildPersonalIntelligenceToday({
          daily,
          holdings: scopedHoldings,
          holdingsWeights: valuedPositions.map((position) => ({
            symbol: position.holding.symbol,
            name: position.holding.name,
            weightPercent: position.weightPercent,
          })),
          exposure,
          intelligence: input.intelligence ?? null,
          goals: input.goalProgress.hasGoal
            ? {
                hasGoal: true,
                status: input.goalProgress.status,
                goalReached: input.goalProgress.goalReached,
                currentProgressPercent:
                  input.goalProgress.currentProgressPercent,
              }
            : null,
        })
      : null;

  // Reused by Q2/Q4 for traceable resilience sensitivity & (optionally) goal impact.
  const resilienceProfile =
    scopedHoldings.length > 0
      ? buildResilienceProfile({
          holdings: scopedHoldings,
          goal: input.goal,
          hasSavedGoal: input.hasSavedGoal,
        })
      : null;

  const dominantToday =
    personalIntelligence &&
    [...personalIntelligence.topContributors, ...personalIntelligence.topDetractors]
      .filter((row) => row.contributionPp != null)
      .sort(
        (left, right) =>
          Math.abs(right.contributionPp ?? 0) - Math.abs(left.contributionPp ?? 0),
      )[0];

  const q1Subject = {
    symbols: dominantToday?.symbol ? [dominantToday.symbol] : [],
    names: dominantToday?.name ? [dominantToday.name] : [],
  };
  const leadingWeight = personalIntelligence?.holdingsWeights
    .slice()
    .sort((left, right) => right.weightPercent - left.weightPercent)[0];
  const usedAfterQ1 = [
    themeKeyForSymbol(dominantToday?.symbol, scopedHoldings),
  ].filter((key): key is string => Boolean(key));
  const attentionPick = personalIntelligence
    ? selectWhatMattersAttention({
        holdings: scopedHoldings,
        intelligence: personalIntelligence,
        newsItems: input.newsItems,
        perspectiveVideos: input.perspectiveVideos,
        avoidDailyDriverSymbol: dominantToday?.symbol ?? null,
        usedThemeKeys: usedAfterQ1,
        changeIntelligence: input.changeIntelligence,
      })
    : null;
  const pickedHolding =
    attentionPick && !attentionPick.quiet
      ? scopedHoldings.find((row) =>
          attentionPick.symbols.some(
            (symbol) =>
              row.symbol.trim().toUpperCase() === symbol.trim().toUpperCase(),
          ),
        )
      : null;
  const q2Subject = {
    symbols: pickedHolding
      ? [pickedHolding.symbol]
      : leadingWeight?.symbol
        ? [leadingWeight.symbol]
        : q1Subject.symbols,
    names: pickedHolding
      ? [pickedHolding.name]
      : leadingWeight?.name
        ? [leadingWeight.name]
        : q1Subject.names,
  };
  const usedAfterQ2 = [
    ...usedAfterQ1,
    ...(attentionPick?.themeKey ? [attentionPick.themeKey] : []),
  ];

  const q1Candidate = dominantToday?.symbol
    ? findHoldingIntelligenceCandidate(
        buildHoldingIntelligenceCandidates({
          holdings: scopedHoldings,
          newsItems: input.newsItems,
        }),
        dominantToday.symbol,
      )
    : null;
  const q1ContextLayer = buildQ1HoldingContextLayer(q1Candidate);
  const q2Context = selectRelevantContext({
    subject: q2Subject,
    newsItems: input.newsItems,
    intelligence: input.intelligence ?? null,
    perspectiveVideos: input.perspectiveVideos,
    holdings: scopedHoldings,
    excludeHrefs: q1StoryExcludeHrefs(q1Candidate),
    prefer: "perspective",
  });

  const intelligenceDepth: FourQuestionsIntelligenceDepth =
    input.intelligenceDepth === "free" ? "free" : "complete";

  const questions = [
    buildWhatHappenedQuestion({
      scope,
      holdings: scopedHoldings,
      pulse: input.pulse,
      relevantContext: q1ContextLayer,
    }),
    buildWhatMattersNowQuestion({
      scope,
      holdings: scopedHoldings,
      intelligence: personalIntelligence,
      cryptoDashboardLine: input.cryptoDashboardLine,
      goal: input.goal,
      hasSavedGoal: input.hasSavedGoal,
      resilienceProfile,
      avoidDailyDriverSymbol: dominantToday?.symbol ?? null,
      relevantContext: q2Context?.layer ?? null,
      changeIntelligence: input.changeIntelligence,
      intelligenceDepth,
      evolutionTimeline: input.evolutionTimeline,
      attentionPick,
    }),
    buildAmIOnTrackQuestion({
      scope,
      progress: input.goalProgress,
      goal: input.goal,
      realityCheck: input.realityCheck ?? null,
      contributionSummaryLine: input.contributionSummaryLine,
      resilienceProfile,
      changeIntelligence: input.changeIntelligence,
      intelligenceDepth,
    }),
    buildWhatsAheadQuestion({
      scope,
      holdings: scopedHoldings,
      goal: input.goal,
      hasSavedGoal: input.hasSavedGoal,
      resilienceProfile,
      nextEventLabel: input.nextEventLabel,
      nextEventHref: input.nextEventHref,
      changeIntelligence: input.changeIntelligence,
      intelligenceDepth,
      usedThemeKeys: usedAfterQ2,
    }),
  ];

  const withChange: FourQuestionsBundle = mergePortfolioChangeIntoFourQuestions(
    {
      scope,
      intelligenceDepth: "complete",
      questions,
    },
    input.portfolioChangeAttention,
  );

  return applyFourQuestionsIntelligenceDepth(
    mergeStanceIntoFourQuestions(withChange, input.stanceHistory),
    intelligenceDepth,
  );
}
