/**
 * Deterministic, non-advisory score context for Portfolio Scorecard + Dashboard.
 * Explains factual drivers only — never allocation or trade recommendations.
 */

import {
  DIVERSIFICATION_COUNTABLE_GROUPS,
  DIVERSIFICATION_MIN_GROUP_WEIGHT_PERCENT,
} from "@/lib/services/portfolio/healthScore/config";
import type { PortfolioAnalysisSnapshot } from "@/lib/client/portfolioAnalysis";
import { summarizeDailyPerformance } from "@/lib/client/dailyPerformance";
import {
  resolvePortfolioMovePeriod,
  type PerformancePeriodKind,
} from "@/lib/client/performancePeriod";
import type { PortfolioExposureAllocation } from "@/lib/services/classification";
import type { GoalProgress } from "@/lib/services/goals/goalProgressEngine";
import type { GoalSettings, StoredPortfolioHolding } from "@/lib/types/portfolioStorage";
import type { PortfolioHealthScoreResult } from "@/lib/services/portfolio/healthScore";
import type {
  PortfolioScore,
  ScoreContext,
} from "@/lib/services/portfolio/scorecard/types";
import { guardScoreContext } from "@/lib/services/portfolio/scorecard/scoreContextGuardrail";
import type { BuildMomentumScoreInput } from "@/lib/services/portfolio/scorecard/buildMomentumScore";
import { DASHBOARD_DEEP_LINKS } from "@/lib/navigation/deepLinks";
import { GOALS_PATH, PORTFOLIO_PATH } from "@/lib/navigation/appRoutes";

const EXPOSURE_GROUP_TOTAL = 9;
const CONCENTRATION_PRIMARY_THRESHOLD = 35;
const GROUP_DOMINANCE_THRESHOLD = 35;
const UNCLASSIFIED_ATTENTION_THRESHOLD = 10;
const LIMITED_GROUP_COUNT = 5;

const MARKET_PULSE_PATH = "/market-pulse";
const SUPPORTED_INSTRUMENTS_PATH = "/supported-instruments";
const UPLOAD_PATH = "/upload";

export type BuildScoreContextsInput = {
  health: PortfolioHealthScoreResult;
  analysis: PortfolioAnalysisSnapshot;
  exposure: PortfolioExposureAllocation;
  goal: GoalSettings | null;
  hasSavedGoal: boolean;
  goalProgress: GoalProgress;
  goalScore: PortfolioScore;
  momentum: BuildMomentumScoreInput;
  momentumScore: PortfolioScore;
  readinessScore: PortfolioScore;
  hasPerformanceHistory?: boolean;
  holdings?: StoredPortfolioHolding[];
};

function roundPct(value: number): number {
  return Math.round(value);
}

function formatSignedPercent(value: number): string {
  const rounded = Math.abs(value) >= 10 ? value.toFixed(0) : value.toFixed(1);
  return `${value >= 0 ? "+" : ""}${rounded}%`;
}

function countableRepresentedGroups(
  exposure: PortfolioExposureAllocation,
): number {
  return exposure.groups.filter(
    (group) =>
      (DIVERSIFICATION_COUNTABLE_GROUPS as readonly string[]).includes(
        group.groupId,
      ) && group.displayPercent >= DIVERSIFICATION_MIN_GROUP_WEIGHT_PERCENT,
  ).length;
}

function representedGroupCount(exposure: PortfolioExposureAllocation): number {
  return exposure.groups.filter((group) => group.displayPercent > 0).length;
}

function largestClassifiedGroup(exposure: PortfolioExposureAllocation) {
  return (
    exposure.groups
      .filter((group) => group.groupId !== "other_unclassified")
      .sort((a, b) => b.displayPercent - a.displayPercent)[0] ?? null
  );
}

function unclassifiedPercent(exposure: PortfolioExposureAllocation): number {
  return (
    exposure.groups.find((group) => group.groupId === "other_unclassified")
      ?.displayPercent ?? 0
  );
}

function trimFactors(
  factors: NonNullable<ScoreContext["factors"]>,
): NonNullable<ScoreContext["factors"]> {
  return factors.slice(0, 3);
}

export function buildHealthScoreContext(input: {
  analysis: PortfolioAnalysisSnapshot;
  exposure: PortfolioExposureAllocation;
  health: PortfolioHealthScoreResult;
}): ScoreContext {
  const largest = input.analysis.largestPosition;
  const largestWeight = largest?.weightPercent ?? 0;
  const symbol = largest?.holding.symbol ?? "largest position";
  const represented = representedGroupCount(input.exposure);
  const countable = countableRepresentedGroups(input.exposure);
  const topGroup = largestClassifiedGroup(input.exposure);
  const unclassified = unclassifiedPercent(input.exposure);
  const unvaluedShare = input.health.confidence.unvaluedSharePercent;

  const factors: NonNullable<ScoreContext["factors"]> = [];

  if (countable >= 3) {
    factors.push({
      label: "Multiple asset groups represented",
      tone: "positive",
    });
  }
  if (largest) {
    factors.push({
      label: `Largest position: ${roundPct(largestWeight)}%`,
      tone:
        largestWeight >= CONCENTRATION_PRIMARY_THRESHOLD
          ? "attention"
          : "neutral",
    });
  }
  if (unclassified >= UNCLASSIFIED_ATTENTION_THRESHOLD) {
    factors.push({
      label: `Unclassified exposure: ${roundPct(unclassified)}%`,
      tone: "attention",
    });
  } else if (unvaluedShare >= UNCLASSIFIED_ATTENTION_THRESHOLD) {
    factors.push({
      label: `Unvalued holdings: ${roundPct(unvaluedShare)}%`,
      tone: "attention",
    });
  }

  // Priority 1 — largest-position concentration
  if (
    largest &&
    (largestWeight >= CONCENTRATION_PRIMARY_THRESHOLD ||
      input.analysis.concentrationLevel === "highly_concentrated")
  ) {
    return guardScoreContext({
      headline: `Concentration is high: ${roundPct(largestWeight)}% is held in the largest position.`,
      detail: `${symbol} is the largest holding by portfolio value.`,
      status: "attention",
      href: DASHBOARD_DEEP_LINKS.scorecardHealth,
      linkLabel: "View allocation",
      factors: trimFactors(factors),
    });
  }

  // Priority 2 — limited represented exposure groups
  if (represented > 0 && represented < LIMITED_GROUP_COUNT) {
    return guardScoreContext({
      headline: `The portfolio is represented across ${represented} of ${EXPOSURE_GROUP_TOTAL} exposure groups.`,
      detail: "Fewer exposure groups are currently represented in valued holdings.",
      status: "neutral",
      href: DASHBOARD_DEEP_LINKS.scorecardHealth,
      linkLabel: "View allocation",
      factors: trimFactors(factors),
    });
  }

  // Priority 3 — high share in one exposure group
  if (topGroup && topGroup.displayPercent >= GROUP_DOMINANCE_THRESHOLD) {
    return guardScoreContext({
      headline: `${topGroup.displayLabel} is the largest exposure group at ${roundPct(topGroup.displayPercent)}%.`,
      detail: "One exposure group accounts for a large share of portfolio value.",
      status: "neutral",
      href: DASHBOARD_DEEP_LINKS.scorecardHealth,
      linkLabel: "View allocation",
      factors: trimFactors(factors),
    });
  }

  // Priority 4 — missing or unclassified data
  if (
    unclassified >= UNCLASSIFIED_ATTENTION_THRESHOLD ||
    unvaluedShare >= UNCLASSIFIED_ATTENTION_THRESHOLD
  ) {
    const share =
      unclassified >= unvaluedShare ? unclassified : unvaluedShare;
    const kind =
      unclassified >= unvaluedShare
        ? "could not be classified"
        : "lacks a reliable market value";
    return guardScoreContext({
      headline: `${roundPct(share)}% of portfolio value ${kind}.`,
      detail:
        unclassified >= unvaluedShare
          ? "Some holdings remain outside verified exposure groups."
          : "Some holdings are missing usable price data.",
      status: "attention",
      href: DASHBOARD_DEEP_LINKS.scorecardHealth,
      linkLabel: "View allocation",
      factors: trimFactors(factors),
    });
  }

  // Priority 5 — positive diversification summary
  return guardScoreContext({
    headline:
      "Exposure is spread across multiple positions and asset groups.",
    detail:
      represented > 0
        ? `Represented across ${represented} of ${EXPOSURE_GROUP_TOTAL} exposure groups.`
        : "Portfolio structure is measurable from available holdings.",
    status: "positive",
    href: DASHBOARD_DEEP_LINKS.scorecardHealth,
    linkLabel: "View allocation",
    factors: trimFactors(
      factors.length > 0
        ? factors
        : [{ label: "Multiple asset groups represented", tone: "positive" }],
    ),
  });
}

function periodPhrase(kind: PerformancePeriodKind): string {
  if (kind === "rolling_24h") return "over 24h";
  if (kind === "mixed") return "in the latest portfolio move";
  if (kind === "last_session" || kind === "latest_sessions") {
    return "in the latest session";
  }
  if (kind === "latest_available") return "in the latest available session";
  return "in the latest portfolio move";
}

function isSessionLikelyClosed(
  periodKind: PerformancePeriodKind,
  sessionDateLabel: string | null,
): boolean {
  if (
    periodKind !== "last_session" &&
    periodKind !== "latest_sessions" &&
    periodKind !== "latest_available"
  ) {
    return false;
  }
  if (!sessionDateLabel) return true;
  const todayLabel = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "Europe/Amsterdam",
  }).format(new Date());
  return !sessionDateLabel.includes(todayLabel.replace(",", ""));
}

export function buildMomentumScoreContext(input: {
  momentum: BuildMomentumScoreInput;
  momentumScore: PortfolioScore;
  holdings?: StoredPortfolioHolding[];
}): ScoreContext {
  const href = MARKET_PULSE_PATH;
  const linkLabel = "View Market Pulse";
  const fallbackHref = DASHBOARD_DEEP_LINKS.portfolioPerformance;
  const fallbackLabel = "View performance";

  if (!input.momentumScore.available) {
    return guardScoreContext({
      headline: "No meaningful recent movement is available yet.",
      detail: input.momentumScore.unavailableReason ?? "More history needed.",
      status: "neutral",
      href: fallbackHref,
      linkLabel: fallbackLabel,
      factors: [
        { label: "Primary factor: history coverage", tone: "neutral" },
      ],
    });
  }

  const holdings = input.holdings ?? [];
  const daily = holdings.length > 0 ? summarizeDailyPerformance(holdings) : null;
  const period = resolvePortfolioMovePeriod(
    daily?.performers.map((p) => p.holding) ?? holdings,
  );

  const factors: NonNullable<ScoreContext["factors"]> = [];
  if (input.momentum.week?.available && input.momentum.week.returnPercent != null) {
    factors.push({
      label: `1W return: ${formatSignedPercent(input.momentum.week.returnPercent)}`,
      tone:
        input.momentum.week.returnPercent >= 0 ? "positive" : "attention",
    });
  }
  if (input.momentum.month?.available && input.momentum.month.returnPercent != null) {
    factors.push({
      label: `1M return: ${formatSignedPercent(input.momentum.month.returnPercent)}`,
      tone:
        input.momentum.month.returnPercent >= 0 ? "positive" : "attention",
    });
  }

  const scoreValue = input.momentumScore.value ?? 50;
  const weak = scoreValue < 55;
  const strong = scoreValue >= 70;

  const byAbsMove = daily
    ? [...daily.performers].sort(
        (a, b) => Math.abs(b.move) - Math.abs(a.move),
      )
    : [];
  const largestAbs = byAbsMove[0] ?? null;
  const largestNegative =
    daily?.performers
      .filter((p) => p.move < 0 || p.changePercent < 0)
      .sort((a, b) => a.move - b.move)[0] ?? null;
  const largestPositive =
    daily?.performers
      .filter((p) => p.move > 0 || p.changePercent > 0)
      .sort((a, b) => b.move - a.move)[0] ?? null;

  if (largestAbs) {
    factors.push({
      label: `Largest influence: ${largestAbs.holding.symbol} (${formatSignedPercent(largestAbs.changePercent)})`,
      tone: largestAbs.changePercent >= 0 ? "positive" : "attention",
    });
  }

  // Priority 4 — market data / session limitation (before empty performers)
  if (
    daily &&
    (!daily.hasDailyData || daily.performers.length === 0)
  ) {
    return guardScoreContext({
      headline: "No meaningful recent movement is available yet.",
      detail: "Holding-level contribution data is not available for this window.",
      status: "neutral",
      href,
      linkLabel,
      factors: trimFactors(factors),
    });
  }

  if (
    daily &&
    period.hasExchangeTraded &&
    isSessionLikelyClosed(period.kind, period.sessionDateLabel)
  ) {
    // Prefer closed-market note when it is the clearest limitation signal
    // and contribution is thin or incomplete.
    if (!daily.performanceCoverageComplete || daily.performers.length < 2) {
      return guardScoreContext({
        headline:
          "Some markets are closed; values reflect the latest available session.",
        detail: period.detail ?? period.accessibleDescription,
        status: "neutral",
        href,
        linkLabel,
        factors: trimFactors(factors),
      });
    }
  }

  // Priority 1 — largest negative when momentum weak
  if (weak && largestNegative) {
    return guardScoreContext({
      headline: `Recent performance was mainly influenced by ${largestNegative.holding.symbol} (${formatSignedPercent(largestNegative.changePercent)}).`,
      detail: `Period: ${period.primaryLabel || "latest portfolio move"}.`,
      status: "attention",
      href,
      linkLabel,
      factors: trimFactors(factors),
    });
  }

  // Priority 2 — largest positive when momentum strong
  if (strong && largestPositive) {
    return guardScoreContext({
      headline: `${largestPositive.holding.symbol} was the largest positive contributor ${periodPhrase(period.kind)} (${formatSignedPercent(largestPositive.changePercent)}).`,
      detail: `Period: ${period.primaryLabel || "latest portfolio move"}.`,
      status: "positive",
      href,
      linkLabel,
      factors: trimFactors(factors),
    });
  }

  // Priority 3 — mixed contribution summary
  if (
    largestPositive &&
    largestNegative &&
    daily &&
    daily.performers.length >= 2
  ) {
    return guardScoreContext({
      headline: "Positive and negative contributions are currently mixed.",
      detail: `Largest influence: ${largestAbs?.holding.symbol ?? "n/a"} (${formatSignedPercent(largestAbs?.changePercent ?? 0)}).`,
      status: "neutral",
      href,
      linkLabel,
      factors: trimFactors(factors),
    });
  }

  // Closed-market wording when exchange data is not same-day
  if (
    period.hasExchangeTraded &&
    isSessionLikelyClosed(period.kind, period.sessionDateLabel)
  ) {
    return guardScoreContext({
      headline:
        "Some markets are closed; values reflect the latest available session.",
      detail: largestAbs
        ? `Largest influence: ${largestAbs.holding.symbol} (${formatSignedPercent(largestAbs.changePercent)}).`
        : period.accessibleDescription,
      status: "neutral",
      href,
      linkLabel,
      factors: trimFactors(factors),
    });
  }

  // Fallback
  if (largestAbs) {
    return guardScoreContext({
      headline: `Recent performance was mainly influenced by ${largestAbs.holding.symbol} (${formatSignedPercent(largestAbs.changePercent)}).`,
      detail: `Period: ${period.primaryLabel || "latest portfolio move"}.`,
      status: "neutral",
      href,
      linkLabel,
      factors: trimFactors(factors),
    });
  }

  return guardScoreContext({
    headline: "No meaningful recent movement is available yet.",
    detail: "Contribution detail will appear when session data is present.",
    status: "neutral",
    href: fallbackHref,
    linkLabel: fallbackLabel,
    factors: trimFactors(factors),
  });
}

function largestGoalAssumptionDetail(
  goal: GoalSettings,
  progress: GoalProgress,
): string | undefined {
  const monthsLeft = Math.max(
    0,
    (goal.targetYear - new Date().getFullYear()) * 12,
  );
  const contributionMass = goal.monthlyContribution * Math.max(monthsLeft, 1);
  const returnMass =
    progress.currentValue * (Math.max(0, goal.expectedAnnualReturn) / 100) *
    Math.max(monthsLeft / 12, 0.25);

  if (contributionMass >= returnMass && goal.monthlyContribution > 0) {
    return "Monthly contribution is the largest input in this projection.";
  }
  if (goal.expectedAnnualReturn > 0 && returnMass > contributionMass) {
    return "Expected annual return is the largest input in this projection.";
  }
  if (monthsLeft > 0) {
    return "Remaining time is a primary factor in this projection.";
  }
  return undefined;
}

export function buildGoalScoreContext(input: {
  goal: GoalSettings | null;
  hasSavedGoal: boolean;
  goalProgress: GoalProgress;
  goalScore: PortfolioScore;
}): ScoreContext {
  const href = GOALS_PATH;
  const linkLabel = "View scenarios";

  if (!input.hasSavedGoal || !input.goal) {
    return guardScoreContext({
      headline:
        "The goal calculation needs a target date or contribution amount.",
      detail: "A saved goal unlocks projection status on this score.",
      status: "attention",
      href,
      linkLabel,
      factors: [
        { label: "Primary factor: goal setup", tone: "attention" },
      ],
    });
  }

  const goal = input.goal;
  const progress = input.goalProgress;
  const incomplete =
    !(goal.targetValue > 0) ||
    !(goal.targetYear > 0) ||
    goal.monthlyContribution == null;

  if (incomplete) {
    return guardScoreContext({
      headline:
        "The goal calculation needs a target date or contribution amount.",
      detail: "Current goal settings are incomplete for a full projection.",
      status: "attention",
      href,
      linkLabel,
      factors: [
        { label: "Primary factor: goal inputs", tone: "attention" },
      ],
    });
  }

  const months = Math.max(
    0,
    (goal.targetYear - new Date().getFullYear()) * 12,
  );
  const monthlyRate = Math.pow(1 + goal.expectedAnnualReturn / 100, 1 / 12) - 1;
  let projected = progress.currentValue;
  for (let i = 0; i < months; i += 1) {
    projected = projected * (1 + monthlyRate) + Math.max(0, goal.monthlyContribution);
  }
  const onPath =
    progress.goalReached ||
    projected >= goal.targetValue * 0.98 ||
    progress.status === "On track" ||
    progress.status === "Ahead of schedule";
  const belowPath =
    !progress.goalReached &&
    projected < goal.targetValue * 0.98 &&
    (progress.status === "Behind schedule" ||
      progress.status === "Slightly behind" ||
      projected < goal.targetValue);

  const assumption = largestGoalAssumptionDetail(goal, progress);
  const factors = trimFactors([
    {
      label: `Plan status: ${progress.status}`,
      tone: onPath ? "positive" : belowPath ? "attention" : "neutral",
    },
    {
      label: `Progress: ${progress.currentProgressPercent.toFixed(0)}% of target`,
      tone: "neutral",
    },
    ...(assumption
      ? [{ label: assumption, tone: "neutral" as const }]
      : []),
  ]);

  if (onPath) {
    return guardScoreContext({
      headline: "The current projection is within the goal path.",
      detail: assumption ?? "The goal projection is based on the current assumptions.",
      status: "positive",
      href,
      linkLabel,
      factors,
    });
  }

  if (belowPath) {
    return guardScoreContext({
      headline: "The projected outcome is below the current target path.",
      detail: assumption ?? "The goal projection is based on the current assumptions.",
      status: "attention",
      href,
      linkLabel,
      factors,
    });
  }

  return guardScoreContext({
    headline: "The goal projection is based on the current assumptions.",
    detail: assumption,
    status: "neutral",
    href,
    linkLabel,
    factors,
  });
}

export function buildReadinessScoreContext(input: {
  analysis: PortfolioAnalysisSnapshot;
  exposure: PortfolioExposureAllocation;
  health: PortfolioHealthScoreResult;
  readinessScore: PortfolioScore;
  hasPerformanceHistory?: boolean;
  hasSavedGoal: boolean;
  holdings?: StoredPortfolioHolding[];
}): ScoreContext {
  const holdings = input.holdings ?? [];
  const staleHoldings = holdings.filter(
    (h) => h.priceDataStatus === "stale",
  );
  const unmatched = holdings.filter(
    (h) =>
      h.assetType !== "cash" &&
      (h.requiresConfirmation === true ||
        !(typeof h.providerSymbol === "string" && h.providerSymbol.trim())),
  );
  const unvalued = input.analysis.unvaluedHoldings.length;
  const emptyPortfolio =
    input.analysis.totalValue <= 0 &&
    input.analysis.valuedPositions.length === 0;
  const historyIncomplete = input.hasPerformanceHistory === false;
  const unclassified = input.exposure.unclassifiedHoldingCount;

  const factors: NonNullable<ScoreContext["factors"]> = [];

  if (staleHoldings.length > 0 || input.health.confidence.stalePrices) {
    factors.push({
      label:
        staleHoldings.length > 0
          ? `Stale prices: ${staleHoldings.length}`
          : "Some price data is older than expected",
      tone: "attention",
    });
  }
  if (unmatched.length > 0) {
    factors.push({
      label: `Unmatched holdings: ${unmatched.length}`,
      tone: "attention",
    });
  }
  if (unclassified > 0) {
    factors.push({
      label: `Unclassified holdings: ${unclassified}`,
      tone: "attention",
    });
  }
  if (historyIncomplete) {
    factors.push({
      label: "Historical data incomplete",
      tone: "attention",
    });
  }

  if (emptyPortfolio) {
    return guardScoreContext({
      headline: "Portfolio setup is incomplete.",
      detail: "Valued holdings are needed before readiness checks can pass.",
      status: "attention",
      href: UPLOAD_PATH,
      linkLabel: "View data status",
      factors: trimFactors([
        { label: "Primary factor: portfolio setup", tone: "attention" },
        ...factors,
      ]),
    });
  }

  if (staleHoldings.length > 0) {
    return guardScoreContext({
      headline: `${staleHoldings.length} holding${staleHoldings.length === 1 ? "" : "s"} have stale price data.`,
      detail: "Some price data is older than expected.",
      status: "attention",
      href: PORTFOLIO_PATH,
      linkLabel: "Review holdings",
      factors: trimFactors(factors),
    });
  }

  if (input.health.confidence.stalePrices) {
    return guardScoreContext({
      headline: "Some price data is older than expected.",
      detail: "Freshness checks flagged portfolio prices as stale.",
      status: "attention",
      href: PORTFOLIO_PATH,
      linkLabel: "Review holdings",
      factors: trimFactors(factors),
    });
  }

  if (unmatched.length > 0) {
    return guardScoreContext({
      headline: `${unmatched.length} holding${unmatched.length === 1 ? "" : "s"} ${unmatched.length === 1 ? "is" : "are"} missing a confirmed provider match.`,
      detail: "Provider matching limits some market and classification coverage.",
      status: "attention",
      href: SUPPORTED_INSTRUMENTS_PATH,
      linkLabel: "View supported instruments",
      factors: trimFactors(factors),
    });
  }

  if (unvalued > 0) {
    return guardScoreContext({
      headline: `${unvalued} holding${unvalued === 1 ? "" : "s"} lack a reliable market value.`,
      detail: "Analysis coverage is limited until prices are available.",
      status: "attention",
      href: PORTFOLIO_PATH,
      linkLabel: "Review holdings",
      factors: trimFactors(factors),
    });
  }

  if (historyIncomplete) {
    return guardScoreContext({
      headline:
        "Some analysis is limited because historical data is incomplete.",
      detail: "Multi-week momentum windows need additional history coverage.",
      status: "attention",
      href: DASHBOARD_DEEP_LINKS.scorecardReadiness,
      linkLabel: "View data status",
      factors: trimFactors(factors),
    });
  }

  if (!input.hasSavedGoal) {
    return guardScoreContext({
      headline: "Portfolio setup is incomplete.",
      detail: "A savings goal is not configured yet for full scorecard coverage.",
      status: "neutral",
      href: GOALS_PATH,
      linkLabel: "View scenarios",
      factors: trimFactors([
        { label: "Primary factor: goal configuration", tone: "neutral" },
        ...factors,
      ]),
    });
  }

  // All-clear — factual, not "no action needed" unless checks pass
  const checksPass =
    input.readinessScore.available &&
    (input.readinessScore.value ?? 0) >= 75 &&
    !input.health.confidence.stalePrices &&
    unmatched.length === 0 &&
    unvalued === 0;

  if (checksPass) {
    return guardScoreContext({
      headline: "Portfolio and market data are up to date.",
      detail: "Data checks passed.",
      status: "positive",
      href: DASHBOARD_DEEP_LINKS.scorecardReadiness,
      linkLabel: "View data status",
      factors: trimFactors([
        { label: "Data checks passed", tone: "positive" },
        { label: "Prices and classification coverage look complete", tone: "positive" },
      ]),
    });
  }

  return guardScoreContext({
    headline: "Portfolio and market data are up to date.",
    detail: "Readiness reflects current setup and data coverage.",
    status: "neutral",
    href: DASHBOARD_DEEP_LINKS.scorecardReadiness,
    linkLabel: "View data status",
    factors: trimFactors(
      factors.length > 0
        ? factors
        : [{ label: "Data coverage is measurable", tone: "neutral" }],
    ),
  });
}

export function buildAllScoreContexts(
  input: BuildScoreContextsInput,
): {
  health: ScoreContext;
  goal: ScoreContext;
  momentum: ScoreContext;
  readiness: ScoreContext;
} {
  return {
    health: buildHealthScoreContext({
      analysis: input.analysis,
      exposure: input.exposure,
      health: input.health,
    }),
    goal: buildGoalScoreContext({
      goal: input.goal,
      hasSavedGoal: input.hasSavedGoal,
      goalProgress: input.goalProgress,
      goalScore: input.goalScore,
    }),
    momentum: buildMomentumScoreContext({
      momentum: input.momentum,
      momentumScore: input.momentumScore,
      holdings: input.holdings,
    }),
    readiness: buildReadinessScoreContext({
      analysis: input.analysis,
      exposure: input.exposure,
      health: input.health,
      readinessScore: input.readinessScore,
      hasPerformanceHistory: input.hasPerformanceHistory,
      hasSavedGoal: input.hasSavedGoal,
      holdings: input.holdings,
    }),
  };
}
