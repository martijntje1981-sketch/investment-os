import type { ConcentrationLevel } from "@/lib/client/portfolioAnalysis";
import type { GoalProgress } from "@/lib/services/goals/goalProgressEngine";
import type { PortfolioStatus } from "@/lib/services/news/investmentIntelligence";

export type PortfolioHealthIndicatorLevel = "good" | "moderate" | "needs_attention";

export type PortfolioHealthIndicator = {
  id: string;
  label: string;
  level: PortfolioHealthIndicatorLevel;
  score: number;
};

export type PortfolioHealthScore = {
  score: number;
  indicators: PortfolioHealthIndicator[];
  summary: string;
};

export type PortfolioHealthInput = {
  concentrationLevel: ConcentrationLevel;
  investmentCount: number;
  largestPositionWeightPercent: number | null;
  cashWeightPercent: number;
  goalProgress: Pick<
    GoalProgress,
    "hasGoal" | "goalReached" | "status" | "currentTrajectory"
  >;
  isStale: boolean;
  portfolioStatus: PortfolioStatus;
  quietMarket: boolean;
};

const LEVEL_SCORE: Record<PortfolioHealthIndicatorLevel, number> = {
  good: 90,
  moderate: 65,
  needs_attention: 35,
};

function scoreDiversification(
  concentrationLevel: ConcentrationLevel,
  investmentCount: number,
): PortfolioHealthIndicator {
  let level: PortfolioHealthIndicatorLevel;

  if (concentrationLevel === "highly_concentrated") {
    level = "needs_attention";
  } else if (
    concentrationLevel === "moderately_concentrated" ||
    investmentCount < 4
  ) {
    level = "moderate";
  } else {
    level = "good";
  }

  return {
    id: "diversification",
    label: "Diversification",
    level,
    score: LEVEL_SCORE[level],
  };
}

function scoreConcentration(
  largestPositionWeightPercent: number | null,
): PortfolioHealthIndicator {
  let level: PortfolioHealthIndicatorLevel;

  if (
    largestPositionWeightPercent === null ||
    largestPositionWeightPercent < 25
  ) {
    level = "good";
  } else if (largestPositionWeightPercent <= 40) {
    level = "moderate";
  } else {
    level = "needs_attention";
  }

  return {
    id: "concentration",
    label: "Concentration",
    level,
    score: LEVEL_SCORE[level],
  };
}

function scoreGoalProgress(
  goalProgress: PortfolioHealthInput["goalProgress"],
): PortfolioHealthIndicator {
  let level: PortfolioHealthIndicatorLevel;

  if (!goalProgress.hasGoal) {
    level = "moderate";
  } else if (
    goalProgress.goalReached ||
    goalProgress.status === "Ahead of schedule" ||
    goalProgress.status === "On track" ||
    goalProgress.currentTrajectory === "Ahead" ||
    goalProgress.currentTrajectory === "On track"
  ) {
    level = "good";
  } else if (goalProgress.status === "Slightly behind") {
    level = "moderate";
  } else {
    level = "needs_attention";
  }

  return {
    id: "goal_progress",
    label: "Goal Progress",
    level,
    score: LEVEL_SCORE[level],
  };
}

function scoreCashAllocation(cashWeightPercent: number): PortfolioHealthIndicator {
  let level: PortfolioHealthIndicatorLevel;

  if (cashWeightPercent >= 5 && cashWeightPercent <= 25) {
    level = "good";
  } else if (cashWeightPercent <= 40) {
    level = "moderate";
  } else {
    level = "needs_attention";
  }

  return {
    id: "cash_allocation",
    label: "Cash Allocation",
    level,
    score: LEVEL_SCORE[level],
  };
}

function scoreMarketData(isStale: boolean): PortfolioHealthIndicator {
  const level: PortfolioHealthIndicatorLevel = isStale
    ? "needs_attention"
    : "good";

  return {
    id: "market_data",
    label: "Market Data",
    level,
    score: LEVEL_SCORE[level],
  };
}

function scorePortfolioMonitoring(input: {
  portfolioStatus: PortfolioStatus;
  quietMarket: boolean;
}): PortfolioHealthIndicator {
  let level: PortfolioHealthIndicatorLevel;

  if (
    input.portfolioStatus === "Stable" ||
    (input.portfolioStatus === "Watching" && input.quietMarket)
  ) {
    level = "good";
  } else if (input.portfolioStatus === "High Attention") {
    level = "needs_attention";
  } else {
    level = "moderate";
  }

  return {
    id: "portfolio_monitoring",
    label: "Portfolio Monitoring",
    level,
    score: LEVEL_SCORE[level],
  };
}

function buildPortfolioHealthSummary(
  score: number,
  indicators: PortfolioHealthIndicator[],
): string {
  const byId = Object.fromEntries(indicators.map((indicator) => [indicator.id, indicator]));
  const concentration = byId.concentration;
  const goalProgress = byId.goal_progress;
  const marketData = byId.market_data;
  const monitoring = byId.portfolio_monitoring;

  let base: string;
  if (score >= 85) {
    base = "Your portfolio remains in excellent health.";
  } else if (score >= 70) {
    base = "Your portfolio remains in good health.";
  } else if (score >= 55) {
    base = "Your portfolio is generally stable, but a few areas need attention.";
  } else {
    base = "Several portfolio health factors need attention.";
  }

  if (
    score >= 70 &&
    concentration?.level === "moderate" &&
    goalProgress?.level === "good"
  ) {
    return `${base} Concentration is slightly elevated, but your long-term goal remains on track.`;
  }

  const clauses: string[] = [];

  if (concentration?.level === "moderate") {
    clauses.push("concentration is slightly elevated");
  } else if (concentration?.level === "needs_attention") {
    clauses.push("concentration is elevated");
  }

  if (goalProgress?.level === "good") {
    clauses.push("your long-term goal remains on track");
  } else if (goalProgress?.level === "needs_attention") {
    clauses.push("goal progress may need a closer look");
  }

  if (marketData?.level === "needs_attention") {
    clauses.push("market data should be refreshed");
  }

  if (monitoring?.level === "needs_attention") {
    clauses.push("portfolio monitoring suggests elevated attention");
  } else if (monitoring?.level === "moderate") {
    clauses.push("news flow warrants closer monitoring");
  }

  if (clauses.length === 0) {
    return base;
  }

  if (clauses.length === 1) {
    return `${base} ${capitalize(clauses[0])}.`;
  }

  const last = clauses[clauses.length - 1];
  const rest = clauses.slice(0, -1).join(", ");
  return `${base} ${capitalize(rest)}, but ${last}.`;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function buildPortfolioHealthScore(
  input: PortfolioHealthInput,
): PortfolioHealthScore {
  const indicators = [
    scoreDiversification(input.concentrationLevel, input.investmentCount),
    scoreConcentration(input.largestPositionWeightPercent),
    scoreGoalProgress(input.goalProgress),
    scoreCashAllocation(input.cashWeightPercent),
    scoreMarketData(input.isStale),
    scorePortfolioMonitoring({
      portfolioStatus: input.portfolioStatus,
      quietMarket: input.quietMarket,
    }),
  ];

  const score = Math.round(
    indicators.reduce((sum, indicator) => sum + indicator.score, 0) /
      indicators.length,
  );

  return {
    score,
    indicators,
    summary: buildPortfolioHealthSummary(score, indicators),
  };
}
