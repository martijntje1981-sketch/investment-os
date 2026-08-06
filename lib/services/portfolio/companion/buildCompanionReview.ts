/**
 * Deterministic Investment Companion reviews.
 * Composes existing performance, contributions, goals and daily snapshot fields.
 * No AI. No new network. No fabricated causality.
 */

import {
  defaultCompanionMoneyFormatter,
  formatSignedMoney,
  formatSignedPercent,
  movementTone,
  type CompanionMoneyFormatter,
} from "@/lib/services/portfolio/companion/format";
import {
  estimatePeriodInvestmentReturn,
  filterSeriesToRange,
  sumDividendAmountInRange,
  sumFlowsInRange,
} from "@/lib/services/portfolio/companion/flows";
import { detectCompanionMilestone } from "@/lib/services/portfolio/companion/milestones";
import { resolveCompanionPeriodWindow } from "@/lib/services/portfolio/companion/periodWindows";
import {
  resolveCompanionReadiness,
  resolveDefaultCompanionPeriod,
} from "@/lib/services/portfolio/companion/readiness";
import type {
  CompanionBundle,
  CompanionFocus,
  CompanionPeriod,
  CompanionReview,
  CompanionReviewFact,
} from "@/lib/services/portfolio/companion/types";
import type { PortfolioPerformancePoint } from "@/lib/client/performance/types";
import type { PortfolioContributionEntry } from "@/lib/services/contributions/types";
import type { GoalProgress } from "@/lib/services/goals/goalProgressEngine";
import {
  ANALYSIS_PATH,
  GOALS_PATH,
  PORTFOLIO_HISTORY_PATH,
} from "@/lib/navigation/appRoutes";
import { DASHBOARD_DEEP_LINKS } from "@/lib/navigation/deepLinks";

const CONCENTRATION_WEIGHT_THRESHOLD = 40;
const CALM_MOVE_PERCENT = 0.35;

export type CompanionBuildInput = {
  now?: Date;
  holdingCount: number;
  isDemo?: boolean;
  formatMoney?: CompanionMoneyFormatter;

  // Daily / session
  hasDailyData?: boolean;
  todayChange?: number | null;
  todayPercent?: number | null;
  usesPreviousClose?: boolean;
  previousClosePhrase?: string | null;
  strongestContributorName?: string | null;
  weakestContributorName?: string | null;

  // Series for week / month (existing performance history chart points)
  weekSeries?: PortfolioPerformancePoint[] | null;
  monthSeries?: PortfolioPerformancePoint[] | null;
  /** Optional pre-resolved leaders from performance API (week/month). */
  weekBestHoldingName?: string | null;
  weekWorstHoldingName?: string | null;
  monthBestHoldingName?: string | null;
  monthWorstHoldingName?: string | null;

  // Flows & dividends
  contributionEntries?: PortfolioContributionEntry[] | null;
  dividendPayments?: Array<{
    paymentDate: string;
    amountBase?: number | null;
  }> | null;

  // Goals
  hasSavedGoal?: boolean;
  goalStatus?: GoalProgress["status"] | null;
  goalProgressPercent?: number | null;
  goalReached?: boolean;
  goalProgressAtPeriodStart?: number | null;

  // Structure / market context (one focus max)
  concentrationWeightPercent?: number | null;
  marketContextLabel?: string | null;
  marketContextHref?: string | null;

  // Milestone extras
  historyMonthsAvailable?: number | null;
  firstHoldingInPeriod?: boolean;
  firstContributionInPeriod?: boolean;
};

function emptyReview(
  period: CompanionPeriod,
  reason: string,
  isDemo: boolean,
): CompanionReview {
  const window = resolveCompanionPeriodWindow(period);
  return {
    period,
    ready: false,
    readinessReason: reason,
    periodKind: window.periodKind,
    periodLabel: window.periodLabel,
    dateRangeLabel: window.dateRangeLabel,
    startDate: window.startDate,
    endDate: window.endDate,
    lead: reason,
    supportingFacts: [],
    focus: null,
    milestone: null,
    closingStatement: null,
    goalStatusLabel: null,
    freshnessNote: null,
    links: defaultLinks(),
    isDemo,
    metrics: null,
  };
}

function defaultLinks() {
  return [
    { href: PORTFOLIO_HISTORY_PATH, label: "Open Portfolio History" },
    { href: GOALS_PATH, label: "Open Goals" },
    { href: ANALYSIS_PATH, label: "Open Analysis" },
  ];
}

function goalStatusLabel(
  hasSavedGoal: boolean,
  goalReached: boolean,
  status: GoalProgress["status"] | null | undefined,
): string | null {
  if (!hasSavedGoal) return null;
  if (goalReached) return "Goal reached";
  if (!status || status === "Unknown") return "Goal status unavailable";
  return status;
}

function pickFocus(input: {
  largeMove: boolean;
  moveLabel: string | null;
  netContributionSignificant: boolean;
  contributionLabel: string | null;
  dividendLabel: string | null;
  concentrationLabel: string | null;
  marketContextLabel: string | null;
  marketContextHref: string | null;
}): CompanionFocus | null {
  // Milestones render separately — focus is the single “one thing to know”.
  if (input.largeMove && input.moveLabel) {
    return { label: input.moveLabel, href: DASHBOARD_DEEP_LINKS.portfolioPerformance };
  }
  if (input.netContributionSignificant && input.contributionLabel) {
    return { label: input.contributionLabel, href: PORTFOLIO_HISTORY_PATH };
  }
  if (input.dividendLabel) {
    return { label: input.dividendLabel, href: PORTFOLIO_HISTORY_PATH };
  }
  if (input.concentrationLabel) {
    return { label: input.concentrationLabel, href: ANALYSIS_PATH };
  }
  if (input.marketContextLabel?.trim()) {
    return {
      label: input.marketContextLabel.trim(),
      href: input.marketContextHref ?? "/news",
    };
  }
  return null;
}

function buildDailyReview(input: CompanionBuildInput): CompanionReview {
  const isDemo = Boolean(input.isDemo);
  const formatMoney = input.formatMoney ?? defaultCompanionMoneyFormatter;
  const window = resolveCompanionPeriodWindow("daily", input.now);
  const readiness = resolveCompanionReadiness({
    period: "daily",
    holdingCount: input.holdingCount,
    hasDailyData: input.hasDailyData,
  });

  if (!readiness.ready) {
    return emptyReview("daily", readiness.reason ?? "Daily story unavailable.", isDemo);
  }

  const percent = input.todayPercent ?? 0;
  const change = input.todayChange;
  const calm = Math.abs(percent) < CALM_MOVE_PERCENT;
  const lead = calm
    ? "Your portfolio remains broadly unchanged."
    : change != null && Number.isFinite(change)
      ? `Your latest portfolio move was ${formatSignedMoney(change, formatMoney)} (${formatSignedPercent(percent)}).`
      : `Your latest portfolio move was ${formatSignedPercent(percent)}.`;

  const facts: CompanionReviewFact[] = [];
  const strongest = input.strongestContributorName?.trim();
  if (strongest && !calm) {
    facts.push({
      id: "strongest",
      label: "Strongest contributor",
      value: strongest,
      tone: movementTone(percent),
      detail:
        percent >= 0
          ? `${strongest} contributed most to the move.`
          : `${strongest} weighed most on the move.`,
    });
  }

  const goalLabel = goalStatusLabel(
    Boolean(input.hasSavedGoal),
    Boolean(input.goalReached),
    input.goalStatus,
  );
  if (goalLabel) {
    facts.push({
      id: "goal",
      label: "Goal status",
      value: goalLabel,
      tone: "neutral",
    });
  }

  const milestone = detectCompanionMilestone({
    startingValue: null,
    endingValue: null,
    goalProgressPercent: input.goalProgressPercent,
    goalReached: input.goalReached,
    formatMoney,
  });

  const concentration =
    input.concentrationWeightPercent != null &&
    input.concentrationWeightPercent >= CONCENTRATION_WEIGHT_THRESHOLD
      ? `Largest holding is ${Math.round(input.concentrationWeightPercent)}% of the portfolio.`
      : null;

  const focus = pickFocus({
    largeMove: Math.abs(percent) >= 1.5,
    moveLabel: `Large move: ${formatSignedPercent(percent)}.`,
    netContributionSignificant: false,
    contributionLabel: null,
    dividendLabel: null,
    concentrationLabel: concentration,
    marketContextLabel: input.marketContextLabel ?? null,
    marketContextHref: input.marketContextHref ?? null,
  });

  // Quiet day: ensure a calm supporting line when little else exists.
  if (facts.length === 0 && !focus) {
    facts.push({
      id: "attention",
      label: "Attention",
      value: "Nothing else requires attention today.",
      tone: "muted",
    });
  }

  const freshnessNote = input.usesPreviousClose
    ? `Prices reflect ${input.previousClosePhrase?.trim() || "the previous market close"}.`
    : null;

  return {
    period: "daily",
    ready: true,
    readinessReason: null,
    periodKind: window.periodKind,
    periodLabel: window.periodLabel,
    dateRangeLabel: window.dateRangeLabel,
    startDate: window.startDate,
    endDate: window.endDate,
    lead,
    supportingFacts: facts.slice(0, 3),
    focus: focus
      ? { label: focus.label.replace(/^Today’s focus:\s*/i, ""), href: focus.href }
      : null,
    milestone,
    closingStatement: goalLabel
      ? `Your main goal: ${goalLabel}.`
      : "Nothing else requires attention today.",
    goalStatusLabel: goalLabel,
    freshnessNote,
    links: defaultLinks(),
    isDemo,
    metrics: null,
  };
}

function buildPeriodReview(
  period: "weekly" | "monthly",
  input: CompanionBuildInput,
): CompanionReview {
  const isDemo = Boolean(input.isDemo);
  const formatMoney = input.formatMoney ?? defaultCompanionMoneyFormatter;
  const window = resolveCompanionPeriodWindow(period, input.now);
  const series =
    period === "weekly"
      ? filterSeriesToRange(input.weekSeries, window.startDate, window.endDate)
      : filterSeriesToRange(input.monthSeries, window.startDate, window.endDate);

  // If calendar-month filter leaves too few points, fall back to full provided series
  // but keep the labelled window (month-to-date / completed month wording stays honest).
  const points =
    series.length >= 2
      ? series
      : period === "weekly"
        ? [...(input.weekSeries ?? [])].sort((a, b) => a.date.localeCompare(b.date))
        : [...(input.monthSeries ?? [])].sort((a, b) => a.date.localeCompare(b.date));

  const readiness = resolveCompanionReadiness({
    period,
    holdingCount: input.holdingCount,
    seriesPoints: points,
  });

  if (!readiness.ready) {
    return emptyReview(
      period,
      readiness.reason ?? "Review unavailable.",
      isDemo,
    );
  }

  const startingValue = points[0]?.portfolioValue ?? null;
  const endingValue = points[points.length - 1]?.portfolioValue ?? null;
  const flowStart = points[0]?.date ?? window.startDate;
  const flowEnd = points[points.length - 1]?.date ?? window.endDate;
  const flows = sumFlowsInRange(
    input.contributionEntries,
    flowStart,
    flowEnd,
  );
  const { investmentReturn, portfolioMovement } = estimatePeriodInvestmentReturn({
    startingValue,
    endingValue,
    netContributions: flows.netContributions,
    hasFlowData: flows.hasFlowData,
  });

  const movementPercent =
    startingValue != null &&
    startingValue > 0 &&
    portfolioMovement != null
      ? (portfolioMovement / startingValue) * 100
      : null;

  const lead =
    portfolioMovement == null
      ? `${window.periodLabel} review is ready.`
      : Math.abs(portfolioMovement) < 1 &&
          (movementPercent == null || Math.abs(movementPercent) < CALM_MOVE_PERCENT)
        ? `Your portfolio remained broadly steady over ${window.periodLabel.toLowerCase()}.`
        : `Portfolio movement ${formatSignedMoney(portfolioMovement, formatMoney)}${
            movementPercent != null
              ? ` (${formatSignedPercent(movementPercent)})`
              : ""
          }.`;

  const facts: CompanionReviewFact[] = [];

  if (period === "monthly" && startingValue != null) {
    facts.push({
      id: "starting-value",
      label: "Starting portfolio value",
      value: formatMoney(startingValue),
      tone: "neutral",
    });
  }
  if (period === "monthly" && endingValue != null) {
    facts.push({
      id: "ending-value",
      label: "Ending portfolio value",
      value: formatMoney(endingValue),
      tone: "neutral",
    });
  }

  if (portfolioMovement != null) {
    facts.push({
      id: "movement",
      label: "Portfolio movement",
      value:
        movementPercent != null
          ? `${formatSignedMoney(portfolioMovement, formatMoney)} (${formatSignedPercent(movementPercent)})`
          : formatSignedMoney(portfolioMovement, formatMoney),
      tone: movementTone(portfolioMovement),
    });
  }

  if (investmentReturn != null) {
    facts.push({
      id: "investment-return",
      label: "Investment return",
      value: formatSignedMoney(investmentReturn, formatMoney),
      tone: movementTone(investmentReturn),
      detail: "Portfolio movement after net contributions.",
    });
  }

  if (flows.hasFlowData) {
    facts.push({
      id: "net-contributions",
      label: "Net contributions",
      value: formatSignedMoney(flows.netContributions, formatMoney),
      tone: movementTone(flows.netContributions),
    });
    if (flows.withdrawn > 0) {
      facts.push({
        id: "withdrawals",
        label: "Withdrawals",
        value: formatMoney(flows.withdrawn),
        tone: "negative",
      });
    }
    if (period === "monthly" && flows.contributed > 0) {
      facts.push({
        id: "invested",
        label: "You invested",
        value: formatMoney(flows.contributed),
        tone: "neutral",
      });
    }
  }

  const dividends = sumDividendAmountInRange(
    input.dividendPayments,
    flowStart,
    flowEnd,
  );
  if (dividends != null && dividends > 0) {
    facts.push({
      id: "dividends",
      label: "Dividends received",
      value: formatMoney(dividends),
      tone: "positive",
    });
  }

  const best =
    (period === "weekly"
      ? input.weekBestHoldingName
      : input.monthBestHoldingName)?.trim() || null;
  const worst =
    (period === "weekly"
      ? input.weekWorstHoldingName
      : input.monthWorstHoldingName)?.trim() || null;

  if (best) {
    facts.push({
      id: "strongest",
      label: "Strongest contributor",
      value: best,
      tone: "positive",
    });
  }
  if (worst && worst !== best) {
    facts.push({
      id: "weakest",
      label: "Weakest contributor",
      value: worst,
      tone: "negative",
    });
  }

  const goalLabel = goalStatusLabel(
    Boolean(input.hasSavedGoal),
    Boolean(input.goalReached),
    input.goalStatus,
  );
  if (goalLabel) {
    facts.push({
      id: "goal",
      label: "Goal status",
      value: goalLabel,
      tone: "neutral",
    });
  }

  const milestone = detectCompanionMilestone({
    startingValue,
    endingValue,
    goalProgressPercent: input.goalProgressPercent,
    goalReached: input.goalReached,
    goalProgressAtStart: input.goalProgressAtPeriodStart,
    historyMonthsAvailable: input.historyMonthsAvailable,
    firstHoldingInPeriod: input.firstHoldingInPeriod,
    firstContributionInPeriod:
      input.firstContributionInPeriod ||
      (flows.contributed > 0 &&
        (input.contributionEntries?.filter((e) => e.entryType === "contribution")
          .length ?? 0) === 1),
    firstDividendInPeriod: Boolean(dividends && dividends > 0 && (input.dividendPayments?.length ?? 0) === 1),
    formatMoney,
  });

  const concentration =
    input.concentrationWeightPercent != null &&
    input.concentrationWeightPercent >= CONCENTRATION_WEIGHT_THRESHOLD
      ? `Largest holding is ${Math.round(input.concentrationWeightPercent)}% of the portfolio.`
      : null;

  const focus = pickFocus({
    largeMove:
      movementPercent != null && Math.abs(movementPercent) >= 3,
    moveLabel:
      movementPercent != null
        ? `Notable portfolio move: ${formatSignedPercent(movementPercent)}.`
        : null,
    netContributionSignificant:
      flows.hasFlowData &&
      portfolioMovement != null &&
      Math.abs(flows.netContributions) >
        Math.abs(portfolioMovement) * 0.55,
    contributionLabel: flows.hasFlowData
      ? "Most of this period’s increase came from new contributions."
      : null,
    dividendLabel:
      dividends != null && dividends > 0
        ? `Dividends received: ${formatMoney(dividends)}.`
        : null,
    concentrationLabel: concentration,
    marketContextLabel: input.marketContextLabel ?? null,
    marketContextHref: input.marketContextHref ?? null,
  });

  const periodWord = period === "weekly" ? "week" : "month";
  let closingStatement: string | null = null;
  if (
    investmentReturn != null &&
    flows.hasFlowData &&
    Math.abs(investmentReturn) > Math.abs(flows.netContributions) &&
    investmentReturn > 0
  ) {
    closingStatement = `Your portfolio grew mainly through investment return this ${periodWord}.`;
  } else if (
    flows.hasFlowData &&
    portfolioMovement != null &&
    portfolioMovement > 0 &&
    flows.netContributions > 0 &&
    flows.netContributions >= portfolioMovement * 0.55
  ) {
    closingStatement = `Most of this ${periodWord}’s increase came from net contributions.`;
  } else if (goalLabel) {
    closingStatement = `Your main goal remains: ${goalLabel}.`;
  } else if (milestone) {
    closingStatement = milestone.label;
  }

  // Cap facts — weekly ~7–9, monthly ~8–12.
  const cappedFacts = facts.slice(0, period === "monthly" ? 12 : 9);

  return {
    period,
    ready: true,
    readinessReason: null,
    periodKind: window.periodKind,
    periodLabel: window.periodLabel,
    dateRangeLabel: window.dateRangeLabel,
    startDate: window.startDate,
    endDate: window.endDate,
    lead,
    supportingFacts: cappedFacts,
    focus,
    milestone,
    closingStatement,
    goalStatusLabel: goalLabel,
    freshnessNote: null,
    links: defaultLinks(),
    isDemo,
    metrics: {
      startingValue,
      endingValue,
      portfolioMovement,
      investmentReturn,
      netContributions: flows.hasFlowData ? flows.netContributions : null,
      contributed: flows.hasFlowData ? flows.contributed : null,
      withdrawn: flows.hasFlowData ? flows.withdrawn : null,
      dividends,
      baseCurrency: "EUR",
      strongestContributor: best,
      weakestContributor: worst && worst !== best ? worst : null,
    },
  };
}

export function buildCompanionReview(
  period: CompanionPeriod,
  input: CompanionBuildInput,
): CompanionReview {
  if (period === "daily") return buildDailyReview(input);
  return buildPeriodReview(period, input);
}

export function buildCompanionBundle(input: CompanionBuildInput): CompanionBundle {
  const daily = buildCompanionReview("daily", input);
  const weekly = buildCompanionReview("weekly", input);
  const monthly = buildCompanionReview("monthly", input);

  return {
    daily,
    weekly,
    monthly,
    defaultPeriod: resolveDefaultCompanionPeriod({
      dailyReady: daily.ready,
      weeklyReady: weekly.ready,
      monthlyReady: monthly.ready,
    }),
  };
}

/** Compact dashboard teaser — only when a weekly/monthly review is ready. */
export function resolveCompanionDashboardTeaser(bundle: CompanionBundle): {
  label: string;
  href: string;
  period: CompanionPeriod;
} {
  if (bundle.weekly.ready) {
    return {
      label: "View your weekly review",
      href: "/review?period=weekly",
      period: "weekly",
    };
  }
  if (bundle.monthly.ready) {
    return {
      label: "Your monthly review is ready",
      href: "/review?period=monthly",
      period: "monthly",
    };
  }
  if (bundle.daily.ready) {
    return {
      label: "Open Your Review",
      href: "/review?period=daily",
      period: "daily",
    };
  }
  return {
    label: "Your Review",
    href: "/review",
    period: bundle.defaultPeriod,
  };
}
