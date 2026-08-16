/**
 * Presentation selection for "Your Portfolio in 30 Seconds".
 * Pure — no UI, no fetch.
 */

import {
  ATTRIBUTION_MIXED_PERIOD_NOTE,
  formatContributionPp,
  hasMixedContributionPeriods,
  isDisplayMaterialContribution,
} from "@/lib/services/personalIntelligence/attribution";
import type {
  DayContribution,
  PersonalIntelligenceItem,
  PersonalIntelligenceToday,
} from "@/lib/services/personalIntelligence/types";

/** @deprecated Prefer ATTRIBUTION_DISPLAY_MIN_PP — kept for existing imports. */
export { ATTRIBUTION_DISPLAY_MIN_PP as THIRTY_SECONDS_MIN_PP } from "@/lib/services/personalIntelligence/attribution";

export type ThirtySecondsBriefingView = {
  title: string;
  headline: string;
  isQuiet: boolean;
  /**
   * Hero already shows the large today-move KPI — keep null to avoid duplication.
   * Callers may still read portfolioMove from the underlying intelligence.
   */
  moveSummary: string | null;
  drivers: Array<{
    name: string;
    symbol: string;
    contributionLabel: string;
    /** Shown only when mixed periods are present (keeps the list clean otherwise). */
    periodLabel: string | null;
    tone: "positive" | "negative" | "neutral";
  }>;
  attentionItems: PersonalIntelligenceItem[];
  periodNote: string | null;
  /** Surfaced when day move uses partial holding coverage. */
  coverageNote: string | null;
  supportingQuietLine: string | null;
};

function toDriver(
  row: DayContribution,
  showPeriodLabel: boolean,
): ThirtySecondsBriefingView["drivers"][number] {
  const pp = row.contributionPp ?? 0;
  return {
    name: row.name,
    symbol: row.symbol,
    contributionLabel: formatContributionPp(pp),
    periodLabel: showPeriodLabel ? row.periodLabel?.trim() || null : null,
    tone: pp > 0 ? "positive" : pp < 0 ? "negative" : "neutral",
  };
}

/**
 * Select at most 2 positive contributors and 1 detractor for the briefing.
 */
export function selectThirtySecondsDrivers(
  intelligence: PersonalIntelligenceToday,
): ThirtySecondsBriefingView["drivers"] {
  const candidateRows = [
    ...intelligence.topContributors,
    ...intelligence.topDetractors,
  ];
  const mixed = hasMixedContributionPeriods(candidateRows);

  const positives = intelligence.topContributors
    .filter(isDisplayMaterialContribution)
    .filter((row) => (row.contributionPp ?? 0) > 0)
    .slice(0, 2)
    .map((row) => toDriver(row, mixed));

  const detractor = intelligence.topDetractors
    .filter(isDisplayMaterialContribution)
    .filter((row) => (row.contributionPp ?? 0) < 0)
    .slice(0, 1)
    .map((row) => toDriver(row, mixed));

  return [...positives, ...detractor];
}

const ATTENTION_KIND_ORDER: Record<
  PersonalIntelligenceItem["kind"],
  number
> = {
  contributor: 0,
  exposure: 1,
  news: 2,
  goal: 3,
  portfolio_move: 4,
  coverage: 5,
};

/**
 * Max 2 attention items. Prefer material portfolio/news/goal signals.
 * Skip coverage noise and skip contributor rows already shown as drivers.
 */
export function selectThirtySecondsAttention(
  intelligence: PersonalIntelligenceToday,
  driverSymbols: Set<string> = new Set(
    selectThirtySecondsDrivers(intelligence).map((row) =>
      row.symbol.trim().toUpperCase(),
    ),
  ),
): PersonalIntelligenceItem[] {
  if (intelligence.attention === "nothing_requires_attention") {
    return [];
  }

  const candidates = intelligence.attentionItems.filter((item) => {
    if (item.materiality === "low") return false;
    if (item.kind === "coverage") return false;
    if (item.kind === "contributor") {
      const match = item.id.match(/^(?:contributor|detractor)-(.+)$/i);
      const symbol = match?.[1]?.trim().toUpperCase();
      if (symbol && driverSymbols.has(symbol)) return false;
    }
    return true;
  });

  const ranked = [...candidates].sort((a, b) => {
    const materialRank = { high: 0, medium: 1, low: 2 } as const;
    const byMaterial =
      materialRank[a.materiality] - materialRank[b.materiality];
    if (byMaterial !== 0) return byMaterial;
    return ATTENTION_KIND_ORDER[a.kind] - ATTENTION_KIND_ORDER[b.kind];
  });

  return ranked.slice(0, 2);
}

function briefingHeadline(
  intelligence: PersonalIntelligenceToday,
  isQuiet: boolean,
): string {
  if (isQuiet) {
    return intelligence.headline;
  }
  // Hero already shows the large % move — keep this surface status-led.
  if (/^Portfolio [+-]?\d/i.test(intelligence.headline)) {
    return intelligence.attention === "elevated"
      ? "A few developments are worth a closer look."
      : "Here’s what stood out in your portfolio today.";
  }
  return intelligence.headline;
}

function coverageNoteFromIntelligence(
  intelligence: PersonalIntelligenceToday,
): string | null {
  const move = intelligence.portfolioMove;
  if (!move?.hasDailyData || move.coverageComplete) return null;
  if (move.eligibleMarketHoldingCount <= 0) return null;
  if (move.validPerformanceCount >= move.eligibleMarketHoldingCount) {
    return null;
  }
  return `Based on ${move.validPerformanceCount} of ${move.eligibleMarketHoldingCount} market holdings with usable prices.`;
}

export function buildThirtySecondsBriefingView(
  intelligence: PersonalIntelligenceToday,
): ThirtySecondsBriefingView {
  const isQuiet = intelligence.attention === "nothing_requires_attention";
  const drivers = selectThirtySecondsDrivers(intelligence);
  const driverSymbols = new Set(
    drivers.map((row) => row.symbol.trim().toUpperCase()),
  );
  const attentionItems = selectThirtySecondsAttention(
    intelligence,
    driverSymbols,
  );

  const mixed = hasMixedContributionPeriods([
    ...intelligence.topContributors,
    ...intelligence.topDetractors,
  ]);

  const supportingQuietLine = isQuiet
    ? intelligence.portfolioMove?.hasDailyData
      ? "Your portfolio is behaving within a normal daily range."
      : "When daily data is available, drivers and attention items will appear here."
    : null;

  return {
    title: "Your portfolio in 30 seconds",
    headline: briefingHeadline(intelligence, isQuiet),
    isQuiet,
    moveSummary: null,
    drivers,
    attentionItems,
    periodNote:
      mixed && drivers.length > 0 ? ATTRIBUTION_MIXED_PERIOD_NOTE : null,
    coverageNote: coverageNoteFromIntelligence(intelligence),
    supportingQuietLine,
  };
}
