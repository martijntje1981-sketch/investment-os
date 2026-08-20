/**
 * Compose the optional PDF visual brief from canonical engines.
 * Does not live in the PDF renderer. Does not invent forecasts or lifetime returns.
 */

import {
  holdingPriceStatusUserLabel,
  resolveHoldingPriceTrustStatus,
} from "@/lib/client/holdingDisplayPrice";
import { getHoldingMarketValue } from "@/lib/client/portfolioAnalysis";
import type { PortfolioPerformancePoint } from "@/lib/client/performance/types";
import {
  buildAllocationIntelligence,
} from "@/lib/services/allocationIntelligence/buildAllocationIntelligence";
import {
  buildPortfolioExposureAllocation,
  formatAllocationPercent,
} from "@/lib/services/classification";
import { classifyHoldingExposure } from "@/lib/services/classification/classifyHoldingExposure";
import {
  INCOMPLETE_HISTORY_NOTE,
  buildPortfolioFundingHistory,
} from "@/lib/services/contributions/portfolioFundingHistory";
import type { PortfolioContributionEntry } from "@/lib/services/contributions/types";
import { FOUR_QUESTIONS } from "@/lib/services/fourQuestions/catalog";
import { buildGoalProgressEngine } from "@/lib/services/goals/goalProgressEngine";
import type { HoldingPeriodMove } from "@/lib/services/performanceAttribution/buildHoldingMovesFromEod";
import { buildPortfolioPerformanceAttribution } from "@/lib/services/performanceAttribution/buildPortfolioPerformanceAttribution";
import { ATTR_DISPLAY_MIN_PP } from "@/lib/services/performanceAttribution/materiality";
import type { HoldingAttributionRow } from "@/lib/services/performanceAttribution/types";
import type {
  PeriodIntelligenceKind,
  PeriodIntelligenceReview,
} from "@/lib/services/periodIntelligence/types";
import type {
  PeriodReportAheadItem,
  PeriodReportAllocationSlice,
  PeriodReportBrief,
  PeriodReportCoverHighlight,
  PeriodReportGoalVisual,
  PeriodReportHoldingRow,
  PeriodReportImpactRow,
  PeriodReportPerformanceChart,
  PeriodReportScenarioBar,
} from "@/lib/services/periodIntelligence/periodReportBrief";
import type { CompanionReview } from "@/lib/services/portfolio/companion/types";
import type { ResilienceProfile } from "@/lib/services/resilience";
import { runAllPortfolioScenarios } from "@/lib/services/scenarioEngine/runScenario";
import type { GoalSettings, StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

const NO_GOAL_PROMPT =
  "Add a goal in Tobailey to track whether your portfolio is moving toward what you're investing for.";

const MODELED_SCENARIO_IDS = [
  "bitcoin_minus_20",
  "crypto_minus_20",
  "global_equities_minus_20",
] as const;

function uniqueLines(
  lines: Array<string | null | undefined>,
  limit: number,
): string[] {
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

function formatEur(value: number): string {
  return `€${Math.round(value).toLocaleString("en-GB")}`;
}

export function isoCalendarDay(
  value: string | Date | null | undefined,
): string | null {
  if (!value) return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return value.toISOString().slice(0, 10);
  }
  const match = String(value).match(/(\d{4}-\d{2}-\d{2})/);
  return match?.[1] ?? null;
}

export function holdingsSnapshotValue(
  holdings: StoredPortfolioHolding[],
): number | null {
  if (holdings.length === 0) return null;
  const total = holdings.reduce((sum, holding) => {
    const value = getHoldingMarketValue(holding);
    return sum + (value ?? 0);
  }, 0);
  return Number.isFinite(total) ? total : null;
}

export function resolveCanonicalPeriodEndValue(input: {
  holdingsSnapshotValue: number | null | undefined;
  endingPortfolioValue: number | null | undefined;
  companionMetricsEndingValue: number | null | undefined;
}): number | null {
  const candidates = [
    input.holdingsSnapshotValue,
    input.endingPortfolioValue,
    input.companionMetricsEndingValue,
  ];
  for (const value of candidates) {
    if (value != null && Number.isFinite(value) && value > 0) return value;
  }
  return null;
}

export function alignChartEndToCanonical<T extends { date: string; value: number }>(
  points: T[],
  canonicalEnd: number | null,
  asOfDay: string | null,
): T[] {
  if (points.length === 0 || canonicalEnd == null || !asOfDay) return points;
  const last = points[points.length - 1]!;
  if (isoCalendarDay(last.date) !== asOfDay) return points;
  if (last.value === canonicalEnd) return points;
  return [...points.slice(0, -1), { ...last, value: canonicalEnd }];
}

function formatSignedPercent(value: number): string {
  const abs = Math.abs(value);
  const digits = abs >= 10 ? 1 : 1;
  const body = abs.toFixed(digits);
  if (value > 0) return `+${body}%`;
  if (value < 0) return `-${body}%`;
  return `${body}%`;
}

function formatPp(value: number): string {
  const body = Math.abs(value).toFixed(1);
  if (value > 0) return `+${body}pp`;
  if (value < 0) return `-${body}pp`;
  return `${body}pp`;
}

function formatDayLabel(iso: string): string {
  const day = iso.slice(0, 10);
  const date = new Date(`${day}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return day;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function formatTimestamp(value: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }).format(value);
}

function inInclusiveRange(
  isoDate: string,
  start: string | null,
  end: string | null,
): boolean {
  const day = isoDate.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  if (start && day < start.slice(0, 10)) return false;
  if (end && day > end.slice(0, 10)) return false;
  return true;
}

function toImpactRow(row: HoldingAttributionRow): PeriodReportImpactRow {
  return {
    symbol: row.symbol,
    name: row.name,
    holdingMovePercent: row.returnPercent,
    holdingMoveLabel:
      row.returnPercent != null ? formatSignedPercent(row.returnPercent) : null,
    contributionPp: row.contributionPp ?? 0,
    contributionPpLabel: formatPp(row.contributionPp ?? 0),
  };
}

function buildPerformanceChart(
  points: PortfolioPerformancePoint[] | null | undefined,
  canonicalEnd: number | null,
  asOfDay: string | null,
): PeriodReportPerformanceChart | null {
  const usable = (points ?? [])
    .filter(
      (point) =>
        Number.isFinite(point.portfolioValue) && point.portfolioValue > 0,
    )
    .map((point) => ({ date: point.date, value: point.portfolioValue }));
  if (usable.length < 2) return null;
  const aligned = alignChartEndToCanonical(usable, canonicalEnd, asOfDay);
  const start = aligned[0]!;
  const end = aligned[aligned.length - 1]!;
  return {
    points: aligned,
    startLabel: formatDayLabel(start.date),
    endLabel: formatDayLabel(end.date),
    startValueLabel: formatEur(start.value),
    endValueLabel: formatEur(end.value),
  };
}

function questionTitle(id: (typeof FOUR_QUESTIONS)[number]["id"]): string {
  const def = FOUR_QUESTIONS.find((row) => row.id === id);
  return def ? `${def.numberLabel} ${def.question}` : "";
}

function aheadItemsFromReview(
  review: Pick<
    PeriodIntelligenceReview,
    "ahead" | "changed" | "goal" | "context" | "matters"
  >,
  extra: PeriodReportAheadItem[],
): PeriodReportAheadItem[] {
  const skipTitles = new Set(
    [review.matters?.headline, review.context?.headline]
      .map((value) => value?.trim())
      .filter((value): value is string => Boolean(value)),
  );
  const items = uniqueLines(
    [
      review.ahead?.headline,
      review.changed &&
      review.changed.headline &&
      review.ahead?.headline !== review.changed.headline
        ? review.changed.headline
        : null,
    ],
    3,
  )
    .filter((title) => !skipTitles.has(title))
    .map((title, index) => {
      const why =
        index === 0
          ? review.ahead?.whyItMatters ??
            review.ahead?.evidence[0] ??
            "This is current portfolio context, not a forecast."
          : review.changed?.whyItMatters ??
            "This is current portfolio context, not a forecast.";
      return { title, whyItMatters: why };
    });
  const extraDistinct = extra.filter((row) => !skipTitles.has(row.title.trim()));
  return uniqueLines(
    [
      ...items.map((row) => `${row.title}|||${row.whyItMatters}`),
      ...extraDistinct.map((row) => `${row.title}|||${row.whyItMatters}`),
    ],
    3,
  ).map((packed) => {
    const [title, whyItMatters] = packed.split("|||");
    return { title: title ?? "", whyItMatters: whyItMatters ?? "" };
  });
}

export type BuildPeriodReportBriefInput = {
  kind: PeriodIntelligenceKind;
  companion: CompanionReview;
  review: Omit<PeriodIntelligenceReview, "brief">;
  holdings?: StoredPortfolioHolding[];
  resilienceProfile?: ResilienceProfile | null;
  goal?: GoalSettings | null;
  hasSavedGoal?: boolean;
  contributionEntries?: PortfolioContributionEntry[];
  chartPoints?: PortfolioPerformancePoint[] | null;
  holdingMoves?: HoldingPeriodMove[] | null;
  startingPortfolioValue?: number | null;
  endingPortfolioValue?: number | null;
  totalReturnPercent?: number | null;
  totalReturnAmount?: number | null;
  historicalFxApproximate?: boolean;
  generatedAt?: Date;
};

export function buildPeriodReportBrief(
  input: BuildPeriodReportBriefInput,
): PeriodReportBrief {
  const kind = input.kind;
  const monthly = kind === "monthly";
  const holdings = input.holdings ?? [];
  const generatedAt = input.generatedAt ?? new Date();
  const companion = input.companion;
  const review = input.review;

  const metrics = companion.metrics;
  const snapshotValue = holdingsSnapshotValue(holdings);
  const endingValue = resolveCanonicalPeriodEndValue({
    holdingsSnapshotValue: snapshotValue,
    endingPortfolioValue: input.endingPortfolioValue,
    companionMetricsEndingValue: metrics?.endingValue ?? null,
  });
  const asOfDay =
    isoCalendarDay(review.dataAsOf) ??
    isoCalendarDay(companion.endDate) ??
    isoCalendarDay(generatedAt);
  const coverStartValue = metrics?.startingValue ?? input.startingPortfolioValue ?? null;
  const attributionStartValue =
    input.startingPortfolioValue ?? metrics?.startingValue ?? null;
  const periodChangePercent =
    coverStartValue != null &&
    endingValue != null &&
    coverStartValue > 0 &&
    Number.isFinite(coverStartValue) &&
    Number.isFinite(endingValue)
      ? ((endingValue - coverStartValue) / coverStartValue) * 100
      : null;

  const headline =
    review.hero?.conclusion ??
    review.headline ??
    companion.lead ??
    review.period.label;

  const allocation =
    holdings.length > 0 ? buildPortfolioExposureAllocation(holdings) : null;
  const scenarioResults =
    input.resilienceProfile?.scenarioResults &&
    input.resilienceProfile.scenarioResults.length > 0
      ? input.resilienceProfile.scenarioResults
      : holdings.length > 0 && monthly
        ? runAllPortfolioScenarios(holdings)
        : [];
  const allocationIntel =
    allocation != null
      ? buildAllocationIntelligence({
          allocation,
          scenarioResults,
        })
      : null;

  const attributionPeriod = monthly ? "1M" : "1W";
  const attribution =
    input.holdingMoves && input.holdingMoves.length > 0
      ? buildPortfolioPerformanceAttribution({
          period: attributionPeriod,
          holdings,
          holdingMoves: input.holdingMoves,
          startingPortfolioValue: attributionStartValue,
          endingPortfolioValue: endingValue,
          totalReturnPercent: input.totalReturnPercent,
          totalReturnAmount: input.totalReturnAmount,
          historicalFxApproximate: input.historicalFxApproximate,
        })
      : null;

  const contributors = (attribution?.contributors ?? [])
    .filter(
      (row) =>
        row.contributionPp != null &&
        row.contributionPp > 0 &&
        Math.abs(row.contributionPp) >= ATTR_DISPLAY_MIN_PP,
    )
    .slice(0, monthly ? 5 : 4)
    .map(toImpactRow);
  const detractors = (attribution?.detractors ?? [])
    .filter(
      (row) =>
        row.contributionPp != null &&
        row.contributionPp < 0 &&
        Math.abs(row.contributionPp) >= ATTR_DISPLAY_MIN_PP,
    )
    .slice(0, monthly ? 4 : 3)
    .map(toImpactRow);

  const slices: PeriodReportAllocationSlice[] = (allocation?.groups ?? [])
    .filter((group) => group.rawPercent > 0 || group.displayPercent > 0)
    .map((group) => ({
      groupId: group.groupId,
      label: group.displayLabel,
      displayPercent: group.displayPercent,
      rawPercent: group.rawPercent,
      percentLabel: formatAllocationPercent(group.rawPercent),
      valueLabel: formatEur(group.value),
    }));

  const goalEngine =
    input.hasSavedGoal && input.goal
      ? buildGoalProgressEngine({
          currentPortfolioValue: endingValue ?? 0,
          portfolioValueAvailable: endingValue != null && endingValue > 0,
          goal: input.goal,
          hasSavedGoal: true,
        })
      : null;

  const goalVisual: PeriodReportGoalVisual =
    goalEngine && goalEngine.hasGoal && goalEngine.portfolioValueAvailable
      ? {
          hasGoal: true,
          progressPercent: goalEngine.currentProgressPercent,
          currentLabel: formatEur(goalEngine.currentValue),
          targetLabel: formatEur(goalEngine.targetValue),
          statusLabel: goalEngine.status,
          projectedLabel:
            goalEngine.estimatedCompletionLabel &&
            goalEngine.estimatedCompletionLabel !== "Unavailable" &&
            goalEngine.estimatedCompletionLabel !== "Insufficient history"
              ? goalEngine.estimatedCompletionLabel
              : null,
          contributionAssumption:
            input.goal && input.goal.monthlyContribution > 0
              ? `Modeled monthly contribution ${formatEur(input.goal.monthlyContribution)}`
              : null,
          stressedLabel: input.resilienceProfile?.goalContext
            ? input.resilienceProfile.goalContext.summary
            : null,
        }
      : {
          hasGoal: false,
          prompt:
            input.hasSavedGoal || companion.goalStatusLabel
              ? null
              : NO_GOAL_PROMPT,
        };

  const resilienceFactors = (input.resilienceProfile?.factors ?? [])
    .filter((factor) => factor.applicable && factor.explanation.trim())
    .slice(0, 3)
    .map((factor) => ({
      id: factor.id,
      label: factor.label,
      explanation: factor.explanation,
    }));
  const resilience =
    input.resilienceProfile?.status === "ok"
      ? {
          score: input.resilienceProfile.score,
          bandLabel: input.resilienceProfile.bandLabel,
          factors: resilienceFactors,
        }
      : null;

  const scenarios: PeriodReportScenarioBar[] = scenarioResults
    .filter(
      (row) =>
        row.status === "ok" &&
        row.estimatedPortfolioImpactPercent != null &&
        MODELED_SCENARIO_IDS.includes(
          row.scenarioId as (typeof MODELED_SCENARIO_IDS)[number],
        ),
    )
    .map((row) => ({
      scenarioId: row.scenarioId,
      name: row.scenarioName,
      impactPercent: row.estimatedPortfolioImpactPercent as number,
      impactLabel: formatSignedPercent(row.estimatedPortfolioImpactPercent as number),
    }));

  const funding =
    (input.contributionEntries?.length ?? 0) > 0
      ? buildPortfolioFundingHistory({
          entries: input.contributionEntries ?? [],
          currentPortfolioValueBase: endingValue,
          portfolioBaseCurrency: "EUR",
        })
      : null;

  const periodEntries = (input.contributionEntries ?? []).filter((entry) =>
    inInclusiveRange(entry.entryDate, companion.startDate, companion.endDate),
  );
  const periodContribution = periodEntries
    .filter((entry) => entry.entryType === "contribution")
    .reduce((sum, entry) => sum + entry.baseAmount, 0);
  const periodWithdrawal = periodEntries
    .filter((entry) => entry.entryType === "withdrawal")
    .reduce((sum, entry) => sum + entry.baseAmount, 0);

  let periodActivityLabel: string | null = null;
  if (periodContribution > 0 && periodWithdrawal <= 0) {
    periodActivityLabel = `Recorded contribution ${formatEur(periodContribution)}`;
  } else if (periodWithdrawal > 0 && periodContribution <= 0) {
    periodActivityLabel = `Recorded withdrawal ${formatEur(periodWithdrawal)}`;
  } else if (periodContribution > 0 || periodWithdrawal > 0) {
    periodActivityLabel = `Recorded activity: contributions ${formatEur(periodContribution)}, withdrawals ${formatEur(periodWithdrawal)}`;
  }

  const coverageNote =
    funding && funding.historyCoverage === "partial"
      ? INCOMPLETE_HISTORY_NOTE
      : funding && funding.historyCoverage === "none"
        ? null
        : funding && !funding.historyComplete
          ? INCOMPLETE_HISTORY_NOTE
          : null;

  const priceLabels = uniqueLines(
    holdings.map((holding) =>
      holdingPriceStatusUserLabel(resolveHoldingPriceTrustStatus(holding)),
    ),
    6,
  );

  const holdingRows: PeriodReportHoldingRow[] = holdings
    .map((holding) => {
      const value = getHoldingMarketValue(holding) ?? 0;
      const weight =
        endingValue && endingValue > 0 ? (value / endingValue) * 100 : 0;
      const attr = attribution?.holdings.find(
        (row) => row.holdingId === holding.id || row.symbol === holding.symbol,
      );
      const exposure = classifyHoldingExposure(holding);
      return {
        symbol: holding.symbol,
        name: holding.name,
        weightLabel: formatAllocationPercent(weight),
        periodMoveLabel:
          attr?.returnPercent != null
            ? formatSignedPercent(attr.returnPercent)
            : null,
        impactLabel:
          attr?.contributionPp != null ? formatPp(attr.contributionPp) : null,
        statusLabel: holdingPriceStatusUserLabel(
          resolveHoldingPriceTrustStatus(holding),
        ),
        exposureLabel: exposure.displayLabel,
        weight,
      };
    })
    .sort((left, right) => right.weight - left.weight)
    .slice(0, monthly ? 8 : 5)
    .map((row) => ({
      symbol: row.symbol,
      name: row.name,
      weightLabel: row.weightLabel,
      periodMoveLabel: row.periodMoveLabel,
      impactLabel: row.impactLabel,
      statusLabel: row.statusLabel,
      exposureLabel: row.exposureLabel,
    }));

  const largestSlice = slices[0] ?? null;
  const concentration =
    input.review.period && largestSlice && largestSlice.rawPercent >= 40
      ? `${largestSlice.label} is your largest allocation at ${formatAllocationPercent(largestSlice.rawPercent)}.`
      : allocationIntel?.insight.sentence ?? null;

  const thirtySeconds = uniqueLines(
    [
      periodChangePercent != null && endingValue != null
        ? `Portfolio ${formatSignedPercent(periodChangePercent)} this ${kind === "monthly" ? "month" : "week"} to ${formatEur(endingValue)}.`
        : endingValue != null
          ? `Your portfolio is ${formatEur(endingValue)}.`
          : null,
      contributors[0]
        ? `${contributors[0].symbol} was the largest contributor (${contributors[0].contributionPpLabel} portfolio impact).`
        : review.executiveSummary.find((point) => /contributor/i.test(point)) ??
          null,
      detractors[0]
        ? `${detractors[0].symbol} was the largest detractor (${detractors[0].contributionPpLabel} portfolio impact).`
        : review.executiveSummary.find((point) => /detractor/i.test(point)) ??
          null,
      concentration,
      goalVisual.hasGoal ? `Goal status: ${goalVisual.statusLabel}.` : null,
      input.resilienceProfile?.mostSensitive
        ? `Most sensitive modeled scenario: ${input.resilienceProfile.mostSensitive.scenarioName}.`
        : null,
      periodActivityLabel,
      review.ahead?.headline ?? null,
    ],
    monthly ? 3 : 3,
  );

  const methodologyNotes = uniqueLines(
    [
      "This brief uses the same canonical Tobailey intelligence as the app.",
      attribution
        ? "Holding contribution is portfolio impact in percentage points, not article volume."
        : "Period contribution by holding is shown only when period attribution is available.",
      coverageNote,
      priceLabels.length > 0
        ? `Price status in this report: ${priceLabels.join(", ")}. Tobailey never labels delayed or last-session prices as live.`
        : "Prices follow Tobailey trust labels: Current, Delayed, Last session, Estimated, or Price unavailable.",
      "Modeled scenarios are educational stress estimates, not forecasts.",
      "Information and analysis only - not financial advice.",
      questionTitle("what_happened")
        ? "Four Questions are mapped from the canonical weekly/monthly review."
        : null,
    ],
    6,
  );

  const extraAhead: PeriodReportAheadItem[] = [];
  if (input.resilienceProfile?.mostSensitive) {
    extraAhead.push({
      title: input.resilienceProfile.mostSensitive.scenarioName,
      whyItMatters: `Modeled sensitivity is about ${Math.abs(input.resilienceProfile.mostSensitive.estimatedPortfolioImpactPercent).toFixed(1)}% of portfolio value. This is not a forecast.`,
    });
  }

  return {
    generatedAtLabel: `Generated ${formatTimestamp(generatedAt)} UTC`,
    dataAsOfLabel: review.dataAsOf
      ? `Data as of ${formatDayLabel(review.dataAsOf)}`
      : null,
    coverTitle: kind === "monthly" ? "Your Monthly Review" : "Your Weekly Review",
    portfolioValueLabel: endingValue != null ? formatEur(endingValue) : null,
    periodChangeLabel:
      periodChangePercent != null ? formatSignedPercent(periodChangePercent) : null,
    coverHighlights: (() => {
      const chips: PeriodReportCoverHighlight[] = [];
      if (contributors[0]) {
        chips.push({
          label: "Largest contributor",
          value: contributors[0].symbol,
          detail: `${contributors[0].contributionPpLabel} portfolio impact`,
        });
      }
      if (largestSlice) {
        chips.push({
          label: "Largest allocation",
          value: largestSlice.label,
          detail: largestSlice.percentLabel,
        });
      }
      if (goalVisual.hasGoal && goalVisual.statusLabel) {
        chips.push({
          label: "Goal",
          value: goalVisual.statusLabel,
          detail: `${Math.round(goalVisual.progressPercent)}% of target`,
        });
      }
      if (periodActivityLabel && chips.length < 3) {
        chips.push({
          label: "Recorded activity",
          value: periodActivityLabel.replace(/^Recorded /i, ""),
          detail: null,
        });
      }
      return chips.slice(0, 3);
    })(),
    headline,
    thirtySeconds: thirtySeconds.length > 0 ? thirtySeconds : review.executiveSummary.slice(0, 3),
    performanceChart: buildPerformanceChart(input.chartPoints, endingValue, asOfDay),
    contributors,
    detractors,
    showAllocation: monthly && slices.length > 0,
    allocation: slices,
    allocationInsight: allocationIntel?.insight.sentence ?? null,
    allocationScenarioLink: allocationIntel?.scenarioLink?.sentence ?? null,
    showGoalVisual: Boolean(
      goalEngine?.hasGoal && goalEngine.portfolioValueAvailable,
    ),
    goal: goalVisual,
    showResilience: monthly && resilience != null,
    resilience,
    showScenarios: monthly && scenarios.length > 0,
    scenarios,
    aheadItems: aheadItemsFromReview(review, extraAhead),
    showHoldings: monthly && holdingRows.length > 0,
    holdings: holdingRows,
    funding:
      periodActivityLabel || coverageNote
        ? { periodActivityLabel, coverageNote }
        : null,
    methodologyNotes,
  };
}
