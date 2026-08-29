/**
 * Deterministic period-level ranking. Does not change compareIntelligenceStates math.
 * Groups related concentration/exposure/resilience into one conclusion.
 */

import type { CompanionReview } from "@/lib/services/portfolio/companion/types";
import type {
  ChangeIntelligenceStory,
  ChangeIntelligenceSummary,
} from "@/lib/services/changeIntelligence/types";
import {
  PERIOD_FIRST_HISTORY_COPY,
  PERIOD_NO_MATERIAL_CHANGE_COPY,
} from "@/lib/services/periodIntelligence/config";
import type {
  PeriodInsightKind,
  PeriodIntelligenceKind,
} from "@/lib/services/periodIntelligence/types";

export type PeriodPrimaryInsight = {
  kind: PeriodInsightKind;
  headline: string;
  meaning: string;
  evidence: string[];
  story: ChangeIntelligenceStory | null;
};

function periodWord(kind: PeriodIntelligenceKind): "week" | "month" {
  return kind === "monthly" ? "month" : "week";
}

function holdingName(story: ChangeIntelligenceStory | null): string | null {
  if (!story) return null;
  const fromHeadline = story.signal.headline.match(/^(.+?) concentration /i)?.[1];
  const name = fromHeadline || story.signal.subject;
  if (!name || name === "largest_holding") return null;
  return name;
}

function signalDelta(story: ChangeIntelligenceStory | null): number {
  return story?.signal.delta ?? 0;
}

function uniqueEvidence(lines: Array<string | null | undefined>): string[] {
  const out: string[] = [];
  for (const line of lines) {
    const trimmed = line?.trim();
    if (!trimmed) continue;
    if (out.includes(trimmed)) continue;
    out.push(trimmed);
    if (out.length >= 4) break;
  }
  return out;
}

function dependenceHeadline(
  kind: PeriodIntelligenceKind,
  story: ChangeIntelligenceStory,
  increased: boolean,
): string {
  const name = holdingName(story);
  const period = periodWord(kind);
  if (name) {
    return increased
      ? `Your portfolio became more dependent on ${name} this ${period}.`
      : `Your portfolio became less dependent on ${name} this ${period}.`;
  }
  return increased
    ? `Your portfolio became more concentrated this ${period}.`
    : `Your portfolio became less concentrated this ${period}.`;
}

function movementPercent(companion: CompanionReview): number | null {
  const start = companion.metrics?.startingValue;
  const movement = companion.metrics?.portfolioMovement;
  if (start == null || start <= 0 || movement == null) return null;
  return (movement / start) * 100;
}

export function selectPeriodPrimaryInsight(input: {
  kind: PeriodIntelligenceKind;
  companion: CompanionReview;
  change: ChangeIntelligenceSummary;
  firstHistory: boolean;
  concentrationWeightPercent?: number | null;
}): PeriodPrimaryInsight {
  const { kind, companion, change, firstHistory } = input;

  if (firstHistory || change.status === "insufficient_history") {
    return {
      kind: "insufficient_history",
      headline: PERIOD_FIRST_HISTORY_COPY,
      meaning: PERIOD_FIRST_HISTORY_COPY,
      evidence: [],
      story: null,
    };
  }

  const primary = change.primaryStory;
  const resilience = change.resilienceChange;
  const goal = change.goalChange;
  const period = periodWord(kind);

  const resilienceDown =
    Boolean(resilience) &&
    resilience?.signal.materiality === "material" &&
    signalDelta(resilience) < 0;
  const scenarioWorse =
    resilience?.category === "scenario_sensitivity" &&
    resilience.signal.materiality === "material" &&
    signalDelta(resilience) > 0;
  const concentrationStory =
    primary &&
    (primary.category === "concentration" || primary.category === "holding_weight") &&
    primary.signal.materiality === "material"
      ? primary
      : null;
  const exposureStory =
    primary &&
    primary.category === "exposure" &&
    primary.signal.materiality === "material"
      ? primary
      : null;
  const usableGoal =
    goal &&
    !goal.goalDefinitionChanged &&
    goal.signal.materiality === "material"
      ? goal
      : null;

  if (resilienceDown || scenarioWorse) {
    const story = concentrationStory ?? resilience!;
    const evidence = uniqueEvidence([
      ...(concentrationStory?.evidence ?? []),
      ...(concentrationStory?.relatedLines ?? []),
      ...(resilience?.evidence ?? []),
      resilience && concentrationStory ? resilience.headline : null,
    ]);
    return {
      kind: "resilience_deterioration",
      headline: concentrationStory
        ? dependenceHeadline(kind, concentrationStory, signalDelta(concentrationStory) > 0)
        : resilience!.freeHeadline,
      meaning: concentrationStory
        ? "A larger share of your portfolio is now dependent on one source of risk."
        : resilience!.meaning,
      evidence,
      story,
    };
  }

  if (concentrationStory) {
    const increased = signalDelta(concentrationStory) > 0;
    return {
      kind: "concentration_change",
      headline: dependenceHeadline(kind, concentrationStory, increased),
      meaning: concentrationStory.meaning,
      evidence: uniqueEvidence([
        ...concentrationStory.evidence,
        ...concentrationStory.relatedLines,
      ]),
      story: concentrationStory,
    };
  }

  if (usableGoal) {
    return {
      kind: "goal_change",
      headline: usableGoal.headline,
      meaning: usableGoal.meaning,
      evidence: uniqueEvidence(usableGoal.evidence),
      story: usableGoal,
    };
  }

  if (exposureStory) {
    return {
      kind: "exposure_change",
      headline: exposureStory.freeHeadline,
      meaning: exposureStory.meaning,
      evidence: uniqueEvidence([
        ...exposureStory.evidence,
        ...exposureStory.relatedLines,
      ]),
      story: exposureStory,
    };
  }

  const movePct = movementPercent(companion);
  const concentratedNow =
    input.concentrationWeightPercent != null &&
    input.concentrationWeightPercent >= 40;
  const unusualMove =
    movePct != null &&
    Math.abs(movePct) >= (kind === "monthly" ? 3 : 2);
  const strongest = companion.metrics?.strongestContributor;
  if (unusualMove && concentratedNow && strongest) {
    return {
      kind: "concentrated_performance",
      headline: `This ${period}'s result was unusually concentrated in ${strongest}.`,
      meaning: `A large share of the period move sits in one holding, so the result is less broadly based.`,
      evidence: uniqueEvidence([
        companion.supportingFacts.find((row) => row.id === "movement")?.value,
        companion.supportingFacts.find((row) => row.id === "strongest")?.value
          ? `Strongest contributor: ${strongest}`
          : null,
      ]),
      story: null,
    };
  }

  const resilienceUp =
    Boolean(resilience) &&
    resilience?.signal.materiality === "material" &&
    signalDelta(resilience) > 0 &&
    resilience.category === "resilience";
  const concentrationImproved =
    Boolean(concentrationStory) && signalDelta(concentrationStory) < 0;
  const goalUp = Boolean(usableGoal) && signalDelta(usableGoal) > 0;
  if (resilienceUp || concentrationImproved || goalUp) {
    const story = concentrationStory ?? resilience ?? usableGoal;
    return {
      kind: "meaningful_improvement",
      headline:
        story?.freeHeadline ??
        `Your portfolio looked more stable this ${period}.`,
      meaning: story?.meaning ?? "Stored snapshots show an improvement on a material metric.",
      evidence: uniqueEvidence(story?.evidence ?? []),
      story: story ?? null,
    };
  }

  if (change.noMaterialChange || !change.freeHeadline) {
    return {
      kind: "no_material_change",
      headline: PERIOD_NO_MATERIAL_CHANGE_COPY,
      meaning: PERIOD_NO_MATERIAL_CHANGE_COPY,
      evidence: [],
      story: null,
    };
  }

  return {
    kind: "no_material_change",
    headline: change.freeHeadline,
    meaning: primary?.meaning ?? PERIOD_NO_MATERIAL_CHANGE_COPY,
    evidence: uniqueEvidence(primary?.evidence ?? []),
    story: primary,
  };
}
