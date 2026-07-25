import { summarizeAuthenticatedHomePortfolio } from "@/lib/client/authenticatedHomePortfolio";
import {
  buildPortfolioAnalysis,
} from "@/lib/client/portfolioAnalysis";
import {
  formatDailyPerformanceCoverageMessage,
  pickBestAndWorstMovers,
  pickTopAndLowestMovers,
  resolveDailyMoveHeroLabel,
  resolveDailyMovePeriodDetail,
  summarizeDailyMovePeriods,
  summarizeDailyPerformance,
  type HeroMover,
} from "@/lib/client/dailyPerformance";
import { buildPortfolioPerformance } from "@/lib/client/portfolioPerformance";
import {
  computeGoalProgress,
  isGoalAchieved,
} from "@/lib/client/userGoalStorage";
import type { GoalSettings } from "@/lib/types/portfolioStorage";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

export type DashboardMover = {
  name: string;
  symbol: string;
  changePercent: number;
  changeAmount: number;
};

export type DashboardSummary = {
  portfolioValue: number;
  portfolioValueAvailable: boolean;
  portfolioValuePartial: boolean;
  portfolioValueCoverageMessage: string | null;
  investedCapital: number;
  totalReturn: number;
  totalReturnPercent: number;
  canShowPerformance: boolean;
  hasUnvaluedInvestments: boolean;
  todayChange: number;
  todayPercent: number;
  hasDailyData: boolean;
  validPerformanceCount: number;
  eligibleMarketHoldingCount: number;
  performanceCoverageComplete: boolean;
  dailyPerformanceCoverageMessage: string | null;
  dailyMoveHeroLabel: string;
  dailyMovePeriodDetail: string | null;
  bestMover: DashboardMover | null;
  worstMover: DashboardMover | null;
  heroTopMover: HeroMover | null;
  heroLowestMover: HeroMover | null;
  hasReliableHeroMoverData: boolean;
  lastUpdatedAt: string | null;
  holdingCount: number;
  goalProgress: number;
  goalCompleted: boolean;
  hasSavedGoal: boolean;
  goalTarget: number | null;
  topDailyDriver: { symbol: string; name: string; move: number } | null;
  concentrationSymbol: string | null;
  concentrationWeightPercent: number;
  observations: string[];
};

function buildMover(
  holding: StoredPortfolioHolding,
  move: number,
  changePercent: number,
): DashboardMover {
  return {
    name: holding.name || holding.symbol,
    symbol: holding.symbol,
    changePercent,
    changeAmount: move,
  };
}

export function buildDashboardSummary(
  holdings: StoredPortfolioHolding[],
  goal: GoalSettings | null,
  hasSavedGoal: boolean,
): DashboardSummary {
  const snapshot = summarizeAuthenticatedHomePortfolio(holdings);
  const daily = summarizeDailyPerformance(holdings);
  const analysis = buildPortfolioAnalysis(holdings);
  const performance = buildPortfolioPerformance(holdings);
  const investedCapital = performance.investedCapital;
  const totalReturn = performance.totalReturn;
  const totalReturnPercent = performance.totalReturnPercent;

  const { bestMover: bestPerformer, worstMover: worstPerformer } =
    pickBestAndWorstMovers(daily);
  const heroMovers = pickTopAndLowestMovers(daily);
  const movePeriods = summarizeDailyMovePeriods(daily.performers);

  const topDailyDriver = [...daily.performers].sort(
    (a, b) => Math.abs(b.move) - Math.abs(a.move),
  )[0];

  const goalProgress =
    goal && hasSavedGoal ? computeGoalProgress(snapshot.totalValue, goal) : 0;
  const goalCompleted =
    goal && hasSavedGoal ? isGoalAchieved(snapshot.totalValue, goal) : false;

  return {
    portfolioValue: performance.totalValueAvailable ? performance.totalValue : 0,
    portfolioValueAvailable: performance.totalValueAvailable,
    portfolioValuePartial: performance.totalValuePartial,
    portfolioValueCoverageMessage: performance.totalValueCoverageMessage,
    investedCapital,
    totalReturn,
    totalReturnPercent,
    canShowPerformance: performance.canShowPerformance,
    hasUnvaluedInvestments: performance.hasUnvaluedInvestments,
    todayChange: snapshot.todayChange,
    todayPercent: snapshot.todayPercent,
    hasDailyData: daily.hasDailyData,
    validPerformanceCount: daily.validPerformanceCount,
    eligibleMarketHoldingCount: daily.eligibleMarketHoldingCount,
    performanceCoverageComplete: daily.performanceCoverageComplete,
    dailyPerformanceCoverageMessage: formatDailyPerformanceCoverageMessage(daily),
    dailyMoveHeroLabel: resolveDailyMoveHeroLabel(movePeriods),
    dailyMovePeriodDetail: resolveDailyMovePeriodDetail(movePeriods),
    bestMover: bestPerformer
      ? buildMover(
          bestPerformer.holding,
          bestPerformer.move,
          bestPerformer.changePercent,
        )
      : null,
    worstMover: worstPerformer
      ? buildMover(
          worstPerformer.holding,
          worstPerformer.move,
          worstPerformer.changePercent,
        )
      : null,
    heroTopMover: heroMovers.topMover,
    heroLowestMover: heroMovers.lowestMover,
    hasReliableHeroMoverData: heroMovers.hasReliableMoverData,
    lastUpdatedAt: analysis.lastUpdatedAt ?? snapshot.latestUpdatedAt,
    holdingCount: snapshot.holdingCount,
    goalProgress,
    goalCompleted,
    hasSavedGoal,
    goalTarget: goal && hasSavedGoal ? goal.targetValue : null,
    topDailyDriver: topDailyDriver
      ? {
          symbol: topDailyDriver.holding.symbol,
          name: topDailyDriver.holding.name || topDailyDriver.holding.symbol,
          move: topDailyDriver.move,
        }
      : null,
    concentrationSymbol: analysis.largestPosition?.holding.symbol ?? null,
    concentrationWeightPercent:
      analysis.largestPosition?.weightPercent ?? 0,
    observations: analysis.observations,
  };
}
