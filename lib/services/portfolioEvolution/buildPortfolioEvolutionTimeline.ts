/**
 * Canonical Portfolio Evolution timeline.
 * Sparse data is kept sparse. Missing history is omitted, never invented.
 */

import type { PortfolioPerformancePoint } from "@/lib/client/performance/types";
import type { IntelligenceStateSnapshot } from "@/lib/services/changeIntelligence/types";
import {
  EXPOSURE_GROUP_LABELS,
  type ExposureGroupId,
} from "@/lib/services/classification/types";
import { formatAllocationPercent } from "@/lib/services/classification/formatAllocationPercent";
import type { PortfolioContributionEntry } from "@/lib/services/contributions/types";
import { buildEvolutionConclusion } from "@/lib/services/portfolioEvolution/buildEvolutionConclusion";
import {
  EVOLUTION_DAILY_MIX_BLOCK_REASON,
  EVOLUTION_FALLBACK_COMPARISON_DAYS,
  EVOLUTION_METHODOLOGY_NOTE,
  EVOLUTION_PREFERRED_COMPARISON_DAYS,
  EVOLUTION_SPARSE_MIX_NOTE,
  EVOLUTION_THRESHOLDS,
  EVOLUTION_TIMEFRAME_DAYS,
  EVOLUTION_TIMEFRAME_MIN_SPAN_DAYS,
  EVOLUTION_TIMEFRAME_TO_PERIOD,
  PORTFOLIO_EVOLUTION_HREF,
} from "@/lib/services/portfolioEvolution/config";
import { EVOLUTION_TIMEFRAME_IDS } from "@/lib/services/portfolioEvolution/types";
import { snapshotToEvolutionState } from "@/lib/services/portfolioEvolution/snapshotToEvolutionState";
import type {
  EvolutionBeforeNowMetric,
  EvolutionCompactCard,
  EvolutionFundingEvent,
  EvolutionFundingVsMarket,
  EvolutionMixCheckpoint,
  EvolutionNowState,
  EvolutionStructuralMarker,
  EvolutionTimeframeId,
  EvolutionValuePoint,
  PortfolioEvolutionTimeline,
} from "@/lib/services/portfolioEvolution/types";
import type { FourQuestionsIntelligenceDepth } from "@/lib/services/fourQuestions/types";

export type BuildPortfolioEvolutionTimelineInput = {
  timeframe?: EvolutionTimeframeId;
  chartPoints?: PortfolioPerformancePoint[] | null;
  allTimeChartPoints?: PortfolioPerformancePoint[] | null;
  entries?: PortfolioContributionEntry[] | null;
  snapshots?: IntelligenceStateSnapshot[] | null;
  now: EvolutionNowState;
  contributionBasisReliable?: boolean;
  intelligenceDepth?: FourQuestionsIntelligenceDepth;
};

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function addDays(date: string, days: number): string {
  const next = new Date(`${date}T00:00:00.000Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

function daysBetween(from: string, to: string): number {
  const start = Date.parse(`${from}T00:00:00.000Z`);
  const end = Date.parse(`${to}T00:00:00.000Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  return Math.round((end - start) / 86_400_000);
}

function formatMetricPercent(
  value: number,
  kind: EvolutionBeforeNowMetric["kind"],
): string {
  if (kind === "scenario_sensitivity") {
    const rounded = round1(value);
    return `${rounded}%`;
  }
  return formatAllocationPercent(value);
}

function formatSignedPp(delta: number): string {
  const rounded = round1(delta);
  const abs = Number.isInteger(rounded)
    ? String(Math.abs(rounded))
    : Math.abs(rounded).toFixed(1);
  return `${delta >= 0 ? "+" : "−"}${abs}pp`;
}

function formatCompactValue(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) {
    return `€${(value / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}m`;
  }
  if (abs >= 10_000) {
    return `€${Math.round(value / 1000)}k`;
  }
  if (abs >= 1000) {
    return `€${(value / 1000).toFixed(1)}k`;
  }
  return `€${Math.round(value)}`;
}

function groupWeight(
  state: EvolutionNowState,
  groupId: ExposureGroupId,
): number {
  return state.exposure.find((row) => row.groupId === groupId)?.weightPercent ?? 0;
}

function usableSnapshots(
  snapshots: IntelligenceStateSnapshot[] | null | undefined,
): IntelligenceStateSnapshot[] {
  return [...(snapshots ?? [])]
    .filter((row) => row.payload.isDemo !== true)
    .sort((left, right) => left.periodEnd.localeCompare(right.periodEnd));
}

function slicePoints(
  points: PortfolioPerformancePoint[],
  timeframe: EvolutionTimeframeId,
  asOfDate: string,
): PortfolioPerformancePoint[] {
  const days = EVOLUTION_TIMEFRAME_DAYS[timeframe];
  if (days == null) return points;
  const cutoff = addDays(asOfDate, -days);
  return points.filter((point) => point.date >= cutoff && point.date <= asOfDate);
}

function seriesSpanDays(points: PortfolioPerformancePoint[]): number {
  if (points.length < 2) return 0;
  return daysBetween(points[0]!.date, points[points.length - 1]!.date);
}

function resolveEnabledTimeframes(
  longest: PortfolioPerformancePoint[],
  allTime: PortfolioPerformancePoint[] | null | undefined,
  asOfDate: string,
): Record<EvolutionTimeframeId, boolean> {
  const enabled: Record<EvolutionTimeframeId, boolean> = {
    "30D": false,
    "90D": false,
    "1Y": false,
    ALL: false,
  };

  for (const timeframe of EVOLUTION_TIMEFRAME_IDS) {
    const source =
      timeframe === "ALL" && allTime && allTime.length >= 2 ? allTime : longest;
    const sliced = slicePoints(source, timeframe, asOfDate);
    enabled[timeframe] =
      sliced.length >= 2 &&
      seriesSpanDays(sliced) >= EVOLUTION_TIMEFRAME_MIN_SPAN_DAYS[timeframe];
  }
  return enabled;
}

function selectThenSnapshot(
  snapshots: IntelligenceStateSnapshot[],
  asOfDate: string,
): { snapshot: IntelligenceStateSnapshot; windowDays: number } | null {
  const earlier = snapshots.filter((row) => row.periodEnd < asOfDate);
  if (earlier.length === 0) return null;

  const pickNear = (targetDays: number, minDays: number, maxDays: number) => {
    const target = addDays(asOfDate, -targetDays);
    let best: IntelligenceStateSnapshot | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const snapshot of earlier) {
      const distance = Math.abs(daysBetween(snapshot.periodEnd, target));
      const age = daysBetween(snapshot.periodEnd, asOfDate);
      if (age < minDays || age > maxDays) continue;
      if (distance < bestDistance) {
        best = snapshot;
        bestDistance = distance;
      }
    }
    return best;
  };

  const preferred = pickNear(EVOLUTION_PREFERRED_COMPARISON_DAYS, 60, 120);
  if (preferred) {
    return { snapshot: preferred, windowDays: EVOLUTION_PREFERRED_COMPARISON_DAYS };
  }
  const fallback = pickNear(EVOLUTION_FALLBACK_COMPARISON_DAYS, 14, 45);
  if (fallback) {
    return { snapshot: fallback, windowDays: EVOLUTION_FALLBACK_COMPARISON_DAYS };
  }

  const latest = earlier[earlier.length - 1]!;
  return {
    snapshot: latest,
    windowDays: Math.max(daysBetween(latest.periodEnd, asOfDate), 1),
  };
}

function comparisonLabel(windowDays: number | null): string {
  if (windowDays == null) return "available history";
  if (windowDays >= 75 && windowDays <= 110) return "90 days";
  if (windowDays >= 20 && windowDays <= 40) return "30 days";
  if (windowDays >= 300) return "1 year";
  return `since previous snapshot`;
}

function buildValueSeries(
  points: PortfolioPerformancePoint[],
): EvolutionValuePoint[] {
  return points.map((point) => ({
    date: point.date,
    portfolioValue: point.portfolioValue,
    sourceQuality: "reconstructed_constant_holdings",
  }));
}

function entriesInWindow(
  entries: PortfolioContributionEntry[],
  startDate: string | null,
  endDate: string,
): PortfolioContributionEntry[] {
  return entries.filter((entry) => {
    if (entry.entryDate > endDate) return false;
    if (startDate && entry.entryDate < startDate) return false;
    return true;
  });
}

function allocationCoincidence(
  eventDate: string,
  snapshots: IntelligenceStateSnapshot[],
  now: EvolutionNowState,
): EvolutionFundingEvent["allocationCoincidence"] {
  const before = [...snapshots]
    .filter((row) => row.periodEnd <= eventDate)
    .at(-1);
  const after =
    snapshots.find((row) => row.periodEnd > eventDate) ?? null;
  if (!before) return null;

  const fromState = snapshotToEvolutionState(before);
  const toState = after ? snapshotToEvolutionState(after) : now;
  const fromCash = groupWeight(fromState, "cash");
  const toCash = groupWeight(toState, "cash");
  if (Math.abs(toCash - fromCash) < EVOLUTION_THRESHOLDS.cashPp) return null;

  return {
    groupId: "cash",
    groupLabel: EXPOSURE_GROUP_LABELS.cash,
    fromPercent: fromCash,
    toPercent: toCash,
  };
}

function buildFundingEvents(
  entries: PortfolioContributionEntry[],
  snapshots: IntelligenceStateSnapshot[],
  now: EvolutionNowState,
  complete: boolean,
): EvolutionFundingEvent[] {
  return entries.map((entry) => {
    const isWithdrawal = entry.entryType === "withdrawal";
    const amount = isWithdrawal ? -entry.baseAmount : entry.baseAmount;
    const destination =
      entry.destinationType === "holding" && entry.destinationHoldingSymbol
        ? `Recorded toward ${entry.destinationHoldingSymbol}`
        : entry.destinationType === "cash"
          ? "Recorded as cash"
          : null;

    return {
      id: entry.id,
      date: entry.entryDate,
      kind: isWithdrawal ? "withdrawal" : "contribution",
      amount,
      title: isWithdrawal ? "Withdrawal" : "Contribution",
      immediateEffectLabel: isWithdrawal
        ? `€${Math.round(Math.abs(amount)).toLocaleString("en-GB")} was withdrawn from the portfolio.`
        : `€${Math.round(amount).toLocaleString("en-GB")} was added to the portfolio.`,
      recordedDestinationLabel: destination,
      allocationCoincidence: complete
        ? allocationCoincidence(entry.entryDate, snapshots, now)
        : null,
    };
  });
}

function buildMixCheckpoints(
  snapshots: IntelligenceStateSnapshot[],
  now: EvolutionNowState,
  startDate: string | null,
  complete: boolean,
): {
  checkpoints: EvolutionMixCheckpoint[] | null;
  blocked: boolean;
  reason: string | null;
} {
  if (!complete) {
    return {
      checkpoints: null,
      blocked: true,
      reason: EVOLUTION_DAILY_MIX_BLOCK_REASON,
    };
  }

  const inWindow = snapshots.filter((row) => {
    if (row.payload.exposure.groups.length === 0) return false;
    if (startDate && row.periodEnd < startDate) return false;
    return row.periodEnd <= now.asOfDate;
  });

  const checkpoints: EvolutionMixCheckpoint[] = inWindow.map((snapshot) => ({
    date: snapshot.periodEnd,
    label: snapshot.snapshotKind === "monthly" ? "Monthly snapshot" : "Weekly snapshot",
    sourceQuality: "stored_snapshot",
    groups: snapshotToEvolutionState(snapshot).exposure,
  }));

  if (now.exposure.length > 0) {
    checkpoints.push({
      date: now.asOfDate,
      label: "Now",
      sourceQuality: "current",
      groups: now.exposure,
    });
  }

  const unique = checkpoints.filter((row, index, list) => {
    if (index === 0) return true;
    return row.date !== list[index - 1]?.date;
  });

  if (unique.length < 2) {
    return {
      checkpoints: null,
      blocked: true,
      reason: EVOLUTION_DAILY_MIX_BLOCK_REASON,
    };
  }

  return {
    checkpoints: unique,
    blocked: false,
    reason: EVOLUTION_SPARSE_MIX_NOTE,
  };
}

function pushMetric(
  rows: EvolutionBeforeNowMetric[],
  metric: EvolutionBeforeNowMetric | null,
): void {
  if (!metric) return;
  rows.push(metric);
}

function percentMetric(input: {
  id: string;
  label: string;
  kind: EvolutionBeforeNowMetric["kind"];
  from: number | null;
  to: number | null;
  threshold: number;
}): EvolutionBeforeNowMetric | null {
  if (input.from == null || input.to == null) return null;
  const delta = round1(input.to - input.from);
  if (Math.abs(delta) < input.threshold) return null;
  return {
    id: input.id,
    label: input.label,
    fromLabel: formatMetricPercent(input.from, input.kind),
    toLabel: formatMetricPercent(input.to, input.kind),
    deltaLabel: formatSignedPp(delta),
    absDelta: Math.abs(delta),
    kind: input.kind,
  };
}

function buildBeforeNow(
  thenState: EvolutionNowState | null,
  now: EvolutionNowState,
  valueStart: number | null,
  valueEnd: number | null,
  complete: boolean,
): EvolutionBeforeNowMetric[] {
  const rows: EvolutionBeforeNowMetric[] = [];

  if (thenState?.portfolioValue != null && now.portfolioValue != null) {
    const delta = now.portfolioValue - thenState.portfolioValue;
    if (Math.abs(delta) >= EVOLUTION_THRESHOLDS.materialValue) {
      rows.push({
        id: "value",
        label: "Portfolio value",
        fromLabel: formatCompactValue(thenState.portfolioValue),
        toLabel: formatCompactValue(now.portfolioValue),
        deltaLabel: `${delta >= 0 ? "+" : "−"}${formatCompactValue(Math.abs(delta))}`,
        absDelta: Math.abs(delta),
        kind: "value",
      });
    }
  } else if (valueStart != null && valueEnd != null) {
    const delta = valueEnd - valueStart;
    if (Math.abs(delta) >= EVOLUTION_THRESHOLDS.materialValue) {
      rows.push({
        id: "value-reconstructed",
        label: "Current holdings at market prices",
        fromLabel: formatCompactValue(valueStart),
        toLabel: formatCompactValue(valueEnd),
        deltaLabel: `${delta >= 0 ? "+" : "−"}${formatCompactValue(Math.abs(delta))}`,
        absDelta: Math.abs(delta),
        kind: "value",
      });
    }
  }

  if (!thenState) return rows.slice(0, complete ? 3 : 1);

  pushMetric(
    rows,
    percentMetric({
      id: "crypto",
      label: "Crypto exposure",
      kind: "crypto_exposure",
      from: groupWeight(thenState, "crypto"),
      to: groupWeight(now, "crypto"),
      threshold: EVOLUTION_THRESHOLDS.exposurePp,
    }),
  );

  const sameLargest =
    (thenState.largestHoldingSymbol ?? "").toUpperCase() ===
    (now.largestHoldingSymbol ?? "").toUpperCase();
  if (sameLargest || now.largestHoldingSymbol) {
    pushMetric(
      rows,
      percentMetric({
        id: "largest",
        label: now.largestHoldingName
          ? `Largest holding · ${now.largestHoldingName}`
          : "Largest holding",
        kind: "largest_holding",
        from: thenState.largestHoldingWeightPercent,
        to: now.largestHoldingWeightPercent,
        threshold: EVOLUTION_THRESHOLDS.concentrationPp,
      }),
    );
  }

  if (
    thenState.scenarioId &&
    now.scenarioId &&
    thenState.scenarioId === now.scenarioId
  ) {
    pushMetric(
      rows,
      percentMetric({
        id: "scenario",
        label: now.scenarioName ?? "Modeled downside",
        kind: "scenario_sensitivity",
        from: thenState.scenarioImpactPercent,
        to: now.scenarioImpactPercent,
        threshold: EVOLUTION_THRESHOLDS.scenarioPp,
      }),
    );
  }

  pushMetric(
    rows,
    percentMetric({
      id: "cash",
      label: "Cash",
      kind: "cash",
      from: groupWeight(thenState, "cash"),
      to: groupWeight(now, "cash"),
      threshold: EVOLUTION_THRESHOLDS.cashPp,
    }),
  );

  if (complete) {
    pushMetric(
      rows,
      percentMetric({
        id: "fixed-income",
        label: "Fixed income",
        kind: "fixed_income",
        from: groupWeight(thenState, "fixed_income"),
        to: groupWeight(now, "fixed_income"),
        threshold: EVOLUTION_THRESHOLDS.exposurePp,
      }),
    );
    pushMetric(
      rows,
      percentMetric({
        id: "precious-metals",
        label: "Precious metals",
        kind: "precious_metals",
        from: groupWeight(thenState, "precious_metals"),
        to: groupWeight(now, "precious_metals"),
        threshold: EVOLUTION_THRESHOLDS.exposurePp,
      }),
    );
    pushMetric(
      rows,
      percentMetric({
        id: "unclassified",
        label: "Other / Unclassified",
        kind: "unclassified",
        from: groupWeight(thenState, "other_unclassified"),
        to: groupWeight(now, "other_unclassified"),
        threshold: EVOLUTION_THRESHOLDS.exposurePp,
      }),
    );
  }

  const ranked = [...rows].sort((left, right) => {
    const rank = (kind: EvolutionBeforeNowMetric["kind"]) => {
      switch (kind) {
        case "crypto_exposure":
          return 0;
        case "largest_holding":
          return 1;
        case "scenario_sensitivity":
          return 2;
        case "value":
          return 3;
        default:
          return 4;
      }
    };
    const byKind = rank(left.kind) - rank(right.kind);
    if (byKind !== 0) return byKind;
    return right.absDelta - left.absDelta;
  });

  const withoutValue = ranked.filter((row) => row.kind !== "value");
  const valueRow = ranked.find((row) => row.kind === "value");
  const selected = withoutValue.slice(0, complete ? 3 : 1);
  if (selected.length === 0 && valueRow) selected.push(valueRow);
  return selected;
}

function crossedUp(from: number, to: number, threshold: number): boolean {
  return from < threshold && to >= threshold;
}

function introduced(from: number, to: number): boolean {
  return from <= 0 && to >= EVOLUTION_THRESHOLDS.exposurePp;
}

function buildStructuralMarkers(input: {
  thenState: EvolutionNowState | null;
  now: EvolutionNowState;
  events: EvolutionFundingEvent[];
  thenDate: string | null;
  complete: boolean;
}): EvolutionStructuralMarker[] {
  const markers: EvolutionStructuralMarker[] = input.events.map((event) => ({
    id: `funding:${event.id}`,
    date: event.date,
    kind: event.kind,
    label: event.kind === "withdrawal" ? "Withdrawal recorded" : "Contribution recorded",
  }));

  if (!input.complete || !input.thenState || !input.thenDate) return markers;

  const thenCrypto = groupWeight(input.thenState, "crypto");
  const nowCrypto = groupWeight(input.now, "crypto");
  if (crossedUp(thenCrypto, nowCrypto, EVOLUTION_THRESHOLDS.cryptoCrossed)) {
    markers.push({
      id: "crypto-50",
      date: input.now.asOfDate,
      kind: "crypto_crossed_50",
      label: "Crypto crossed 50%",
    });
  }

  if (
    input.thenState.largestHoldingWeightPercent != null &&
    input.now.largestHoldingWeightPercent != null &&
    crossedUp(
      input.thenState.largestHoldingWeightPercent,
      input.now.largestHoldingWeightPercent,
      EVOLUTION_THRESHOLDS.largestHoldingCrossed,
    )
  ) {
    markers.push({
      id: "largest-50",
      date: input.now.asOfDate,
      kind: "largest_holding_crossed_50",
      label: "Largest holding crossed 50%",
    });
  }

  const thenCash = groupWeight(input.thenState, "cash");
  const nowCash = groupWeight(input.now, "cash");
  if (
    thenCash >= EVOLUTION_THRESHOLDS.cashFloor &&
    nowCash < EVOLUTION_THRESHOLDS.cashFloor
  ) {
    markers.push({
      id: "cash-floor",
      date: input.now.asOfDate,
      kind: "cash_fell_below_5",
      label: "Cash fell below 5%",
    });
  }

  if (introduced(groupWeight(input.thenState, "fixed_income"), groupWeight(input.now, "fixed_income"))) {
    markers.push({
      id: "fi-in",
      date: input.now.asOfDate,
      kind: "fixed_income_introduced",
      label: "Fixed income introduced",
    });
  }

  if (
    introduced(
      groupWeight(input.thenState, "precious_metals"),
      groupWeight(input.now, "precious_metals"),
    )
  ) {
    markers.push({
      id: "pm-in",
      date: input.now.asOfDate,
      kind: "precious_metals_introduced",
      label: "Precious metals introduced",
    });
  }

  if (
    input.thenState.scenarioId &&
    input.now.scenarioId === input.thenState.scenarioId &&
    input.thenState.scenarioImpactPercent != null &&
    input.now.scenarioImpactPercent != null &&
    Math.abs(input.now.scenarioImpactPercent - input.thenState.scenarioImpactPercent) >=
      EVOLUTION_THRESHOLDS.scenarioPp
  ) {
    markers.push({
      id: "scenario",
      date: input.now.asOfDate,
      kind: "scenario_sensitivity_changed",
      label: "Modeled downside changed",
    });
  }

  return markers;
}

function buildFundingVsMarket(input: {
  thenState: EvolutionNowState | null;
  now: EvolutionNowState;
  windowLabel: string;
  recordedNetFunding: number;
  contributionBasisReliable: boolean;
  reconstructedDelta: number | null;
  complete: boolean;
}): EvolutionFundingVsMarket | null {
  const snapshotDelta =
    input.thenState?.portfolioValue != null && input.now.portfolioValue != null
      ? input.now.portfolioValue - input.thenState.portfolioValue
      : null;

  if (snapshotDelta == null && input.reconstructedDelta == null) {
    if (Math.abs(input.recordedNetFunding) < 1) return null;
    return {
      windowLabel: input.windowLabel,
      valueChange: null,
      valueChangeSource: null,
      recordedNetFunding: input.recordedNetFunding,
      contributionBasisReliable: input.contributionBasisReliable,
      investmentMovementApproximate: null,
      copy: `Recorded contributions explain ${formatCompactValue(input.recordedNetFunding)} of the change.`,
    };
  }

  if (snapshotDelta != null && input.complete) {
    const residual = snapshotDelta - input.recordedNetFunding;
    return {
      windowLabel: input.windowLabel,
      valueChange: snapshotDelta,
      valueChangeSource: "stored_snapshot",
      recordedNetFunding: input.recordedNetFunding,
      contributionBasisReliable: input.contributionBasisReliable,
      investmentMovementApproximate: residual,
      copy: input.contributionBasisReliable
        ? `Recorded contributions explain ${formatCompactValue(input.recordedNetFunding)} of the ${formatCompactValue(snapshotDelta)} change.`
        : `Recorded contributions explain ${formatCompactValue(input.recordedNetFunding)} of the change.`,
    };
  }

  return {
    windowLabel: input.windowLabel,
    valueChange: snapshotDelta ?? input.reconstructedDelta,
    valueChangeSource:
      snapshotDelta != null
        ? "stored_snapshot"
        : "reconstructed_constant_holdings",
    recordedNetFunding: input.recordedNetFunding,
    contributionBasisReliable: input.contributionBasisReliable,
    investmentMovementApproximate: null,
    copy: `Recorded contributions explain ${formatCompactValue(input.recordedNetFunding)} of the change.`,
  };
}

export function buildPortfolioEvolutionTimeline(
  input: BuildPortfolioEvolutionTimelineInput,
): PortfolioEvolutionTimeline {
  const complete = input.intelligenceDepth !== "free";
  const requested = input.timeframe ?? (complete ? "90D" : "30D");
  const timeframe = complete ? requested : "30D";
  const asOfDate = input.now.asOfDate;
  const longest = [...(input.chartPoints ?? [])].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  const allTime = input.allTimeChartPoints
    ? [...input.allTimeChartPoints].sort((a, b) => a.date.localeCompare(b.date))
    : null;
  const timeframeEnabled = resolveEnabledTimeframes(longest, allTime, asOfDate);
  const sourceForFrame =
    timeframe === "ALL" && allTime && allTime.length >= 2 ? allTime : longest;
  const sliced = slicePoints(sourceForFrame, timeframe, asOfDate);
  const useSliced = timeframeEnabled[timeframe] ? sliced : [];
  const valueSeries = buildValueSeries(useSliced);
  const startValue = valueSeries[0]?.portfolioValue ?? null;
  const endValue = valueSeries.at(-1)?.portfolioValue ?? null;
  const snapshots = usableSnapshots(input.snapshots);
  const thenPick = selectThenSnapshot(snapshots, asOfDate);
  const thenState = thenPick ? snapshotToEvolutionState(thenPick.snapshot) : null;
  const timeframeDays = EVOLUTION_TIMEFRAME_DAYS[timeframe];
  const timeframeStart =
    timeframeDays == null ? "0000-01-01" : addDays(asOfDate, -timeframeDays);
  const windowStart = valueSeries[0]?.date ?? timeframeStart;
  const windowLabel = comparisonLabel(thenPick?.windowDays ?? null);
  const windowEntries = entriesInWindow(input.entries ?? [], windowStart, asOfDate);
  const fundingEvents = buildFundingEvents(windowEntries, snapshots, input.now, complete);
  const mix = buildMixCheckpoints(
    snapshots,
    input.now,
    thenState?.asOfDate ?? windowStart,
    complete,
  );
  const beforeNow = buildBeforeNow(
    thenState,
    input.now,
    startValue,
    endValue,
    complete,
  );
  const recordedNetFunding = windowEntries.reduce((sum, entry) => {
    return sum + (entry.entryType === "withdrawal" ? -entry.baseAmount : entry.baseAmount);
  }, 0);
  const reconstructedDelta =
    startValue != null && endValue != null ? endValue - startValue : null;
  const fundingVsMarket = buildFundingVsMarket({
    thenState,
    now: input.now,
    windowLabel,
    recordedNetFunding,
    contributionBasisReliable: input.contributionBasisReliable !== false,
    reconstructedDelta,
    complete,
  });
  const structuralMarkers = buildStructuralMarkers({
    thenState,
    now: input.now,
    events: fundingEvents,
    thenDate: thenState?.asOfDate ?? null,
    complete,
  });
  const conclusion = buildEvolutionConclusion({
    thenState,
    nowState: input.now,
    beforeNow,
    fundingVsMarket,
    recordedNetFunding,
  });
  const hasValueSeries = valueSeries.length >= 2;
  const hasComparison = thenState != null || hasValueSeries || fundingEvents.length > 0;
  const emptyState: PortfolioEvolutionTimeline["emptyState"] = hasComparison
    ? "ready"
    : "building";

  return {
    timeframe,
    timeframeEnabled,
    performancePeriod: EVOLUTION_TIMEFRAME_TO_PERIOD[timeframe],
    valueSeries,
    chartPoints: useSliced,
    hasValueSeries,
    valueSourceQuality: hasValueSeries ? "reconstructed_constant_holdings" : null,
    startValue,
    endValue,
    comparisonWindowLabel: windowLabel,
    fundingEvents,
    mixCheckpoints: mix.checkpoints,
    mixHistoryBlocked: mix.blocked,
    mixHistoryBlockReason: mix.reason,
    beforeNow,
    structuralMarkers,
    fundingVsMarket,
    conclusion,
    emptyState,
    performanceToggleAvailable: false,
    intelligenceDepth: complete ? "complete" : "free",
    methodologyNote: EVOLUTION_METHODOLOGY_NOTE,
  };
}

export function buildEvolutionCompactCard(
  timeline: PortfolioEvolutionTimeline,
): EvolutionCompactCard {
  const valueMetric = timeline.beforeNow.find((row) => row.kind === "value");
  const structural = timeline.beforeNow.find((row) => row.kind !== "value");
  return {
    windowLabel: timeline.comparisonWindowLabel,
    fromValue: timeline.startValue,
    toValue: timeline.endValue,
    fromLabel: valueMetric?.fromLabel ?? null,
    toLabel: valueMetric?.toLabel ?? null,
    metric: structural ?? null,
    conclusion:
      timeline.emptyState === "building"
        ? "Portfolio Evolution is building your history."
        : timeline.conclusion.primary,
    building: timeline.emptyState === "building",
    href: PORTFOLIO_EVOLUTION_HREF,
  };
}
