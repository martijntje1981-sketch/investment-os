/**
 * Compose Companion review + ChangeIntelligenceSummary into PeriodIntelligenceReview.
 * No competing calculations. No React. No network.
 */

import { CHANGE_INTELLIGENCE_COMPLETE_TEASE } from "@/lib/services/changeIntelligence/config";
import type { ChangeIntelligenceSummary } from "@/lib/services/changeIntelligence/types";
import type { FourQuestionsIntelligenceDepth } from "@/lib/services/fourQuestions/types";
import type { InvestmentIntelligence } from "@/lib/services/news/investmentIntelligence";
import type { CompanionReview } from "@/lib/services/portfolio/companion/types";
import type { PerspectiveVideo } from "@/lib/services/perspectives/types";
import type { ResilienceProfile } from "@/lib/services/resilience";
import type { NewsContentItem } from "@/lib/types/newsContent";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";
import {
  PERIOD_COMPLETE_TEASE,
  PERIOD_FIRST_HISTORY_COPY,
  PERIOD_NO_MATERIAL_CHANGE_COPY,
  PERIOD_SECTION_TITLES,
} from "@/lib/services/periodIntelligence/config";
import { selectPeriodPrimaryInsight } from "@/lib/services/periodIntelligence/selectPeriodPrimaryInsight";
import { selectPeriodReviewContext } from "@/lib/services/periodIntelligence/selectPeriodReviewContext";
import {
  buildPeriodExecutiveSummary,
  buildPeriodReportHero,
} from "@/lib/services/periodIntelligence/buildPeriodReportPresentation";
import { periodReportExploreHrefs } from "@/lib/services/periodIntelligence/reportExplore";
import type {
  PeriodIntelligenceKind,
  PeriodIntelligenceReview,
  PeriodIntelligenceSection,
} from "@/lib/services/periodIntelligence/types";

function factValue(review: CompanionReview, id: string): string | null {
  return review.supportingFacts.find((row) => row.id === id)?.value ?? null;
}

function factDetail(review: CompanionReview, id: string): string | null {
  return review.supportingFacts.find((row) => row.id === id)?.detail ?? null;
}

function uniqueLines(lines: Array<string | null | undefined>, limit: number): string[] {
  const out: string[] = [];
  for (const line of lines) {
    const trimmed = line?.trim();
    if (!trimmed) continue;
    if (out.includes(trimmed)) continue;
    out.push(trimmed);
    if (out.length >= limit) break;
  }
  return out;
}

function periodNoun(kind: PeriodIntelligenceKind): "week" | "month" {
  return kind === "monthly" ? "month" : "week";
}

function makeSection(
  id: PeriodIntelligenceSection["id"],
  headline: string | null,
  extra: {
    whyItMatters?: string | null;
    evidence?: string[];
    confidenceNotes?: string[];
  } = {},
): PeriodIntelligenceSection | null {
  if (!headline?.trim()) return null;
  return {
    id,
    title: PERIOD_SECTION_TITLES[id],
    headline: headline.trim(),
    whyItMatters: extra.whyItMatters?.trim() || null,
    evidence: extra.evidence ?? [],
    confidenceNotes: extra.confidenceNotes ?? [],
  };
}

function happenedSection(
  kind: PeriodIntelligenceKind,
  companion: CompanionReview,
): PeriodIntelligenceSection | null {
  if (!companion.ready) return null;
  const limit = kind === "monthly" ? 4 : 3;
  const evidence = uniqueLines(
    [
      factValue(companion, "investment-return")
        ? `Investment return: ${factValue(companion, "investment-return")}`
        : factValue(companion, "movement")
          ? `Portfolio movement: ${factValue(companion, "movement")}`
          : null,
      kind === "monthly" && factValue(companion, "starting-value") && factValue(companion, "ending-value")
        ? `Portfolio value: ${factValue(companion, "starting-value")} → ${factValue(companion, "ending-value")}`
        : null,
      factValue(companion, "strongest")
        ? `Main positive contributor: ${factValue(companion, "strongest")}`
        : null,
      factValue(companion, "weakest")
        ? `Main negative contributor: ${factValue(companion, "weakest")}`
        : null,
      kind === "monthly" && factValue(companion, "net-contributions")
        ? `Net contributions: ${factValue(companion, "net-contributions")}`
        : null,
      kind === "monthly" && factValue(companion, "withdrawals")
        ? `Withdrawals: ${factValue(companion, "withdrawals")}`
        : null,
      factDetail(companion, "investment-return"),
    ],
    limit,
  );

  return makeSection("happened", companion.lead, {
    whyItMatters:
      kind === "monthly"
        ? "This is the labelled period result from your stored portfolio history, not a reconstructed close."
        : "This is your weekly portfolio result from available history.",
    evidence,
  });
}

function changedSection(
  kind: PeriodIntelligenceKind,
  change: ChangeIntelligenceSummary,
  firstHistory: boolean,
  insightHeadline: string,
  insightEvidence: string[],
): PeriodIntelligenceSection | null {
  if (firstHistory) {
    return makeSection("changed", PERIOD_FIRST_HISTORY_COPY);
  }
  if (change.status === "insufficient_history") {
    return null;
  }
  if (change.noMaterialChange || !change.freeHeadline) {
    return makeSection("changed", PERIOD_NO_MATERIAL_CHANGE_COPY);
  }

  const story = change.primaryStory;
  const completeHeadline = story?.headline ?? insightHeadline;
  const evidence = uniqueLines(
    kind === "monthly"
      ? [
          story?.evidence[0] ?? insightEvidence[0],
          ...(story?.relatedLines ?? []),
          ...insightEvidence.slice(1),
          change.resilienceChange &&
          change.resilienceChange !== story &&
          !story?.relatedLines?.some((line) => /resilience/i.test(line))
            ? `At the same time, ${change.resilienceChange.headline.replace(/\.$/, "")}.`
            : null,
        ]
      : [
          story?.evidence[0] ?? insightEvidence[0],
          ...(story?.relatedLines ?? []).slice(0, 2),
        ],
    kind === "monthly" ? 4 : 3,
  );

  const notes: string[] = [];
  if (story?.quantityChanged) {
    notes.push(
      "Position quantity also changed between snapshots, so weight shifts are not attributed to market-price movement alone.",
    );
  }
  if (story?.capturedAfterPeriodEnd) {
    notes.push(
      "Snapshot captured after the labelled period ended. It is not a reconstructed closing portfolio.",
    );
  }

  return makeSection("changed", completeHeadline, {
    whyItMatters: story?.meaning ?? insightHeadline,
    evidence,
    confidenceNotes: notes,
  });
}

function goalSection(
  companion: CompanionReview,
  change: ChangeIntelligenceSummary,
): PeriodIntelligenceSection | null {
  const definitionChanged = Boolean(change.goalChange?.goalDefinitionChanged);
  if (definitionChanged) {
    return makeSection(
      "goal",
      "Your saved goal definition changed, so progress is not compared as an investment result.",
    );
  }

  const usable =
    change.status === "ready" &&
    change.goalChange &&
    !change.goalChange.goalDefinitionChanged &&
    change.goalChange.signal.materiality === "material"
      ? change.goalChange
      : null;

  if (usable) {
    return makeSection("goal", usable.headline, {
      whyItMatters: usable.meaning,
      evidence: uniqueLines(usable.evidence, 3),
    });
  }

  if (!companion.goalStatusLabel) return null;
  return makeSection("goal", `Goal status: ${companion.goalStatusLabel}.`);
}

function aheadSection(
  kind: PeriodIntelligenceKind,
  resilience: ResilienceProfile | null | undefined,
  concentrationWeightPercent: number | null | undefined,
  largestHoldingName: string | null | undefined,
): PeriodIntelligenceSection | null {
  const noun = periodNoun(kind);

  if (resilience?.status === "ok" && resilience.mostSensitive?.scenarioName) {
    return makeSection(
      "ahead",
      `Your portfolio is currently most sensitive to ${resilience.mostSensitive.scenarioName}.`,
      {
        whyItMatters: "This is a current modeled sensitivity, not a prediction of the next period.",
        evidence: uniqueLines(
          [
            resilience.mostSensitive.estimatedPortfolioImpactPercent != null
              ? `Modeled impact about ${resilience.mostSensitive.estimatedPortfolioImpactPercent.toFixed(1)}%`
              : null,
            resilience.score != null
              ? `Resilience ${resilience.score}/100${resilience.bandLabel ? ` · ${resilience.bandLabel}` : ""}`
              : null,
          ],
          2,
        ),
      },
    );
  }

  if (
    concentrationWeightPercent != null &&
    concentrationWeightPercent >= 40 &&
    largestHoldingName
  ) {
    return makeSection(
      "ahead",
      `${largestHoldingName} is currently about ${Math.round(concentrationWeightPercent)}% of portfolio value.`,
      {
        whyItMatters: `That concentration is the main structural point to understand going into the next ${noun}.`,
      },
    );
  }

  return null;
}

function windowMismatchNote(
  companion: CompanionReview,
  change: ChangeIntelligenceSummary,
): string | null {
  const window = change.comparisonWindow;
  if (!window || !companion.startDate || !companion.endDate) return null;
  const covers =
    companion.dateRangeLabel &&
    window.previousPeriodKey &&
    window.currentPeriodKey;
  if (!covers) return null;
  return `What happened covers ${companion.dateRangeLabel}. What changed compares stored ${window.snapshotKind} snapshots ${window.previousPeriodKey} → ${window.currentPeriodKey}.`;
}

export type BuildPeriodIntelligenceReviewInput = {
  kind: PeriodIntelligenceKind;
  companion: CompanionReview;
  change: ChangeIntelligenceSummary;
  snapshotCount: number;
  intelligenceDepth?: FourQuestionsIntelligenceDepth;
  weeklyPulse?: { score: number; bandLabel: string } | null;
  concentrationWeightPercent?: number | null;
  largestHoldingName?: string | null;
  resilienceProfile?: ResilienceProfile | null;
  holdings?: StoredPortfolioHolding[];
  newsItems?: NewsContentItem[] | null;
  intelligence?: InvestmentIntelligence | null;
  perspectiveVideos?: PerspectiveVideo[] | null;
  now?: Date;
};

export function buildPeriodIntelligenceReview(
  input: BuildPeriodIntelligenceReviewInput,
): PeriodIntelligenceReview {
  const kind = input.kind;
  const companion = input.companion;
  const change = input.change;
  const firstHistory =
    change.status === "insufficient_history" && input.snapshotCount >= 1;
  const depth = input.intelligenceDepth === "free" ? "free" : "complete";
  const insight = selectPeriodPrimaryInsight({
    kind,
    companion,
    change,
    firstHistory,
    concentrationWeightPercent: input.concentrationWeightPercent,
  });

  const happened = happenedSection(kind, companion);
  const changed = changedSection(
    kind,
    change,
    firstHistory,
    insight.headline,
    insight.evidence,
  );
  const matters =
    insight.kind === "insufficient_history" || insight.kind === "no_material_change"
      ? null
      : makeSection("matters", insight.meaning);
  const goal = goalSection(companion, change);
  const ahead = aheadSection(
    kind,
    input.resilienceProfile,
    input.concentrationWeightPercent,
    input.largestHoldingName,
  );

  const contextSubject = {
    symbols: [
      change.primaryStory?.signal.subject,
      change.resilienceChange?.signal.subject,
    ].filter((row): row is string => Boolean(row && row !== "largest_holding")),
    names: [
      input.largestHoldingName,
      change.primaryStory?.signal.headline.match(/^(.+?) concentration /i)?.[1],
      companion.metrics?.strongestContributor,
    ].filter((row): row is string => Boolean(row)),
  };

  const context = selectPeriodReviewContext({
    kind,
    startDate: companion.startDate,
    endDate: companion.endDate,
    symbols: contextSubject.symbols,
    names: contextSubject.names,
    holdings: input.holdings ?? [],
    newsItems: input.newsItems,
    intelligence: input.intelligence,
    perspectiveVideos: input.perspectiveVideos,
    nowMs: input.now?.getTime(),
  });

  const mismatch = windowMismatchNote(companion, change);
  const confidenceNotes = uniqueLines(
    [
      ...change.confidence.notes,
      mismatch,
      ...(changed?.confidenceNotes ?? []),
      ...(goal?.confidenceNotes ?? []),
    ],
    6,
  );

  const pulseLine =
    kind === "weekly" && input.weeklyPulse
      ? `Weekly Pulse ${input.weeklyPulse.score} · ${input.weeklyPulse.bandLabel}`
      : null;
  if (pulseLine && happened && !happened.evidence.includes(pulseLine)) {
    happened.evidence = uniqueLines([...happened.evidence, pulseLine], kind === "monthly" ? 4 : 3);
  }

  const summaryParts = uniqueLines(
    [happened?.headline, insight.headline],
    2,
  );

  const completeHeadline =
    !companion.ready
      ? null
      : insight.kind === "insufficient_history" || insight.kind === "no_material_change"
        ? happened?.headline ?? insight.headline
        : insight.headline;

  const hero = buildPeriodReportHero({
    kind,
    companion,
    conclusion: completeHeadline,
  });
  const executiveSummary = buildPeriodExecutiveSummary({
    kind,
    companion,
    changed,
    goal,
    firstHistory,
    heroConclusion: completeHeadline,
  });

  return {
    kind,
    ready: companion.ready,
    readinessReason: companion.readinessReason,
    period: {
      kind,
      periodKind: companion.periodKind,
      label: companion.periodLabel,
      dateRangeLabel: companion.dateRangeLabel,
      startDate: companion.startDate,
      endDate: companion.endDate,
      comparisonPreviousKey: change.comparisonWindow?.previousPeriodKey ?? null,
      comparisonCurrentKey: change.comparisonWindow?.currentPeriodKey ?? null,
    },
    headline: completeHeadline,
    summary: summaryParts.join(" ") || null,
    hero,
    executiveSummary,
    explore: periodReportExploreHrefs(Boolean(goal)),
    happened,
    changed,
    matters,
    goal,
    ahead,
    context,
    confidence: {
      level: change.confidence.level,
      notes: confidenceNotes,
    },
    dataAsOf: change.comparisonWindow?.currentCapturedAt ?? companion.endDate,
    insightKind: insight.kind,
    freeHeadline: insight.headline,
    firstHistory,
    noMaterialChange: insight.kind === "no_material_change",
    intelligenceDepth: depth,
    isDemo: companion.isDemo,
    completeTease:
      depth === "free" && (change.freeHeadline || firstHistory)
        ? PERIOD_COMPLETE_TEASE
        : depth === "free"
          ? CHANGE_INTELLIGENCE_COMPLETE_TEASE
          : null,
  };
}
