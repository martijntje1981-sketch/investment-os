/**
 * Report cover + executive summary from already-built Companion / period fields.
 * No new performance, change, or goal math.
 */

import type { CompanionReview } from "@/lib/services/portfolio/companion/types";
import {
  PERIOD_FIRST_HISTORY_COPY,
  PERIOD_NO_MATERIAL_CHANGE_COPY,
} from "@/lib/services/periodIntelligence/config";
import type {
  PeriodIntelligenceKind,
  PeriodIntelligenceSection,
  PeriodReportHero,
  PeriodReportHeroMetric,
} from "@/lib/services/periodIntelligence/types";

function factValue(review: CompanionReview, id: string): string | null {
  return review.supportingFacts.find((row) => row.id === id)?.value ?? null;
}

function uniquePoints(lines: Array<string | null | undefined>, limit: number): string[] {
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

export function buildPeriodReportHero(input: {
  kind: PeriodIntelligenceKind;
  companion: CompanionReview;
  conclusion: string | null;
}): PeriodReportHero | null {
  if (!input.companion.ready) return null;
  const conclusion = input.conclusion?.trim();
  if (!conclusion) return null;

  const metrics: PeriodReportHeroMetric[] = [];
  const start = factValue(input.companion, "starting-value");
  const end = factValue(input.companion, "ending-value");
  const movement = factValue(input.companion, "movement");
  const investmentReturn = factValue(input.companion, "investment-return");

  if (input.kind === "monthly" && start && end) {
    metrics.push({
      id: "value-range",
      label: "Portfolio value",
      value: `${start} → ${end}`,
    });
  }
  if (investmentReturn) {
    metrics.push({
      id: "return",
      label: "Investment return",
      value: investmentReturn,
    });
  } else if (movement) {
    metrics.push({
      id: "movement",
      label: "Portfolio movement",
      value: movement,
    });
  }

  return {
    kicker: input.kind === "monthly" ? "Your month" : "Your week",
    conclusion,
    dateRangeLabel: input.companion.dateRangeLabel,
    metrics,
  };
}

export function buildPeriodExecutiveSummary(input: {
  kind: PeriodIntelligenceKind;
  companion: CompanionReview;
  changed: PeriodIntelligenceSection | null;
  goal: PeriodIntelligenceSection | null;
  firstHistory: boolean;
  heroConclusion: string | null;
}): string[] {
  const limit = input.kind === "weekly" ? 2 : 3;
  const weakest = factValue(input.companion, "weakest");
  const strongest = factValue(input.companion, "strongest");
  const contributor = weakest
    ? `${weakest} was the largest detractor.`
    : strongest
      ? `${strongest} was the largest contributor.`
      : null;

  let changePoint: string | null = null;
  if (input.firstHistory) {
    changePoint = PERIOD_FIRST_HISTORY_COPY;
  } else if (input.changed?.headline === PERIOD_NO_MATERIAL_CHANGE_COPY) {
    changePoint = PERIOD_NO_MATERIAL_CHANGE_COPY;
  } else if (
    input.changed?.headline &&
    input.changed.headline !== input.heroConclusion
  ) {
    changePoint = input.changed.headline;
  }

  const goalPoint =
    input.goal?.headline &&
    !input.goal.headline.includes("definition changed") &&
    input.goal.headline !== input.heroConclusion
      ? input.goal.headline
      : input.goal?.headline?.includes("definition changed")
        ? input.goal.headline
        : null;

  return uniquePoints(
    input.kind === "weekly"
      ? [contributor, changePoint]
      : [contributor, changePoint, goalPoint],
    limit,
  );
}
