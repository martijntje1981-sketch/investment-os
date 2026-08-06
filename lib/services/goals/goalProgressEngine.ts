import type { GoalSettings } from "@/lib/types/portfolioStorage";

export type PortfolioHistoryPoint = {
  date: string;
  value: number;
};

export type GoalProgressEngineInput = {
  currentPortfolioValue: number;
  goal: GoalSettings | null;
  hasSavedGoal: boolean;
  portfolioHistory?: PortfolioHistoryPoint[];
  generatedAt?: string;
};

export type GoalTrajectory = "Ahead" | "On track" | "Behind" | "Unknown";

export type GoalProgressStatus =
  | "Ahead of schedule"
  | "On track"
  | "Slightly behind"
  | "Behind schedule"
  | "Unknown";

export type GoalProgress = {
  currentProgressPercent: number;
  currentValue: number;
  targetValue: number;
  remainingAmount: number;
  estimatedCompletionDate: string | null;
  estimatedCompletionLabel: string;
  requiredMonthlyGrowth: number | null;
  currentTrajectory: GoalTrajectory;
  status: GoalProgressStatus;
  summary: string;
  generatedAt: string;
  hasGoal: boolean;
  goalReached: boolean;
};

/** Reserved for future scenario UI — not exposed yet. */
export type GoalScenarioEstimate = {
  estimatedCompletionDate: string | null;
  requiredMonthlyContribution: number | null;
};

export type GoalMilestone = {
  percent: number;
  label: string;
  estimatedDate: string | null;
};

/** Reserved for future reports, notifications, and analyst views. */
export type GoalProgressScenarioPlan = {
  bear: GoalScenarioEstimate;
  base: GoalScenarioEstimate;
  bull: GoalScenarioEstimate;
  probabilityScore: number | null;
  milestones: GoalMilestone[];
};

export function buildGoalProgressEngine(input: GoalProgressEngineInput): GoalProgress {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const currentValue = Math.max(0, input.currentPortfolioValue);

  if (!input.hasSavedGoal || !input.goal) {
    return {
      currentProgressPercent: 0,
      currentValue,
      targetValue: 0,
      remainingAmount: 0,
      estimatedCompletionDate: null,
      estimatedCompletionLabel: "Insufficient history",
      requiredMonthlyGrowth: null,
      currentTrajectory: "Unknown",
      status: "Unknown",
      summary: "Save a financial goal to begin tracking progress.",
      generatedAt,
      hasGoal: false,
      goalReached: false,
    };
  }

  const goal = input.goal;
  const targetValue = goal.targetValue;
  const remainingAmount = Math.max(0, targetValue - currentValue);
  const currentProgressPercent =
    targetValue > 0 ? Math.min((currentValue / targetValue) * 100, 100) : 0;
  const goalReached = targetValue > 0 && currentValue >= targetValue;

  if (goalReached) {
    return {
      currentProgressPercent: 100,
      currentValue,
      targetValue,
      remainingAmount: 0,
      estimatedCompletionDate: formatMonthYear(new Date()),
      estimatedCompletionLabel: formatMonthYear(new Date()),
      requiredMonthlyGrowth: 0,
      currentTrajectory: "Ahead",
      status: "Ahead of schedule",
      summary: "Your portfolio has reached the saved target value.",
      generatedAt,
      hasGoal: true,
      goalReached: true,
    };
  }

  const monthsToTargetDate = monthsUntilTargetYear(goal.targetYear);
  const historyGrowth = estimateMonthlyGrowthFromHistory(input.portfolioHistory ?? []);
  const projectedAtTargetDate = projectPortfolioValue(
    currentValue,
    goal.monthlyContribution,
    goal.expectedAnnualReturn,
    monthsToTargetDate,
  );

  const monthsToComplete = estimateMonthsToReachTarget(
    currentValue,
    targetValue,
    goal.monthlyContribution,
    goal.expectedAnnualReturn,
  );

  const estimatedCompletionDate =
    monthsToComplete === null
      ? historyGrowth !== null
        ? estimateCompletionFromLinearGrowth(
            currentValue,
            targetValue,
            historyGrowth,
            goal.monthlyContribution,
          )
        : null
      : addMonths(new Date(), monthsToComplete);

  const estimatedCompletionLabel = estimatedCompletionDate
    ? formatMonthYear(estimatedCompletionDate)
    : "Insufficient history";

  const requiredMonthlyGrowth =
    monthsToTargetDate > 0
      ? computeRequiredMonthlyGrowth(
          currentValue,
          targetValue,
          monthsToTargetDate,
          goal.monthlyContribution,
          goal.expectedAnnualReturn,
        )
      : null;

  const status = deriveGoalStatus({
    projectedAtTargetDate,
    targetValue,
    monthsToComplete,
    monthsToTargetDate,
    hasHistory: (input.portfolioHistory?.length ?? 0) >= 2,
    historyGrowth,
  });

  const currentTrajectory = mapStatusToTrajectory(status);

  return {
    currentProgressPercent,
    currentValue,
    targetValue,
    remainingAmount,
    estimatedCompletionDate: estimatedCompletionDate?.toISOString() ?? null,
    estimatedCompletionLabel,
    requiredMonthlyGrowth,
    currentTrajectory,
    status,
    summary: buildGoalSummary({
      status,
      hasHistory: (input.portfolioHistory?.length ?? 0) >= 2,
      historyGrowth,
      projectedAtTargetDate,
      targetValue,
    }),
    generatedAt,
    hasGoal: true,
    goalReached: false,
  };
}

export function buildGoalProgressScenarioPlan(
  input: GoalProgressEngineInput,
): GoalProgressScenarioPlan {
  if (!input.hasSavedGoal || !input.goal) {
    return emptyScenarioPlan();
  }

  const goal = input.goal;
  const currentValue = Math.max(0, input.currentPortfolioValue);
  const monthsToTargetDate = monthsUntilTargetYear(goal.targetYear);

  const bearReturn = Math.max(0, goal.expectedAnnualReturn * 0.6);
  const bullReturn = goal.expectedAnnualReturn * 1.25;

  const baseMonths = estimateMonthsToReachTarget(
    currentValue,
    goal.targetValue,
    goal.monthlyContribution,
    goal.expectedAnnualReturn,
  );
  const bearMonths = estimateMonthsToReachTarget(
    currentValue,
    goal.targetValue,
    goal.monthlyContribution,
    bearReturn,
  );
  const bullMonths = estimateMonthsToReachTarget(
    currentValue,
    goal.targetValue,
    goal.monthlyContribution,
    bullReturn,
  );

  const probabilityScore =
    baseMonths === null || monthsToTargetDate <= 0
      ? null
      : clamp(
          100 - ((baseMonths - monthsToTargetDate) / Math.max(monthsToTargetDate, 1)) * 35,
          5,
          95,
        );

  return {
    bear: {
      estimatedCompletionDate: completionIso(bearMonths),
      requiredMonthlyContribution: solveRequiredMonthlyContribution(
        currentValue,
        goal.targetValue,
        monthsToTargetDate,
        bearReturn,
      ),
    },
    base: {
      estimatedCompletionDate: completionIso(baseMonths),
      requiredMonthlyContribution: goal.monthlyContribution,
    },
    bull: {
      estimatedCompletionDate: completionIso(bullMonths),
      requiredMonthlyContribution: solveRequiredMonthlyContribution(
        currentValue,
        goal.targetValue,
        monthsToTargetDate,
        bullReturn,
      ),
    },
    probabilityScore,
    milestones: buildGoalMilestones(currentValue, goal.targetValue, baseMonths),
  };
}

export function projectPortfolioValue(
  startingValue: number,
  monthlyContribution: number,
  annualReturnPercent: number,
  months: number,
): number {
  const monthlyRate = Math.pow(1 + annualReturnPercent / 100, 1 / 12) - 1;
  let value = Math.max(0, startingValue);

  for (let month = 0; month < months; month += 1) {
    value = value * (1 + monthlyRate) + Math.max(0, monthlyContribution);
  }

  return value;
}

function estimateMonthsToReachTarget(
  currentValue: number,
  targetValue: number,
  monthlyContribution: number,
  annualReturnPercent: number,
  maxMonths = 1200,
): number | null {
  if (currentValue >= targetValue) {
    return 0;
  }

  const monthlyRate = Math.pow(1 + annualReturnPercent / 100, 1 / 12) - 1;
  let value = currentValue;

  for (let month = 1; month <= maxMonths; month += 1) {
    value = value * (1 + monthlyRate) + Math.max(0, monthlyContribution);
    if (value >= targetValue) {
      return month;
    }
  }

  return null;
}

function estimateMonthlyGrowthFromHistory(
  history: PortfolioHistoryPoint[],
): number | null {
  if (history.length < 2) {
    return null;
  }

  const sorted = [...history].sort(
    (a, b) => Date.parse(a.date) - Date.parse(b.date),
  );
  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  if (!first || !last) {
    return null;
  }

  const elapsedMonths = Math.max(
    1,
    (Date.parse(last.date) - Date.parse(first.date)) / (30.4375 * 24 * 60 * 60 * 1000),
  );

  return (last.value - first.value) / elapsedMonths;
}

function estimateCompletionFromLinearGrowth(
  currentValue: number,
  targetValue: number,
  monthlyGrowth: number,
  monthlyContribution: number,
): Date | null {
  const netMonthly = monthlyGrowth + Math.max(0, monthlyContribution);
  if (netMonthly <= 0) {
    return null;
  }

  const months = Math.ceil((targetValue - currentValue) / netMonthly);
  if (!Number.isFinite(months) || months <= 0 || months > 1200) {
    return null;
  }

  return addMonths(new Date(), months);
}

function computeRequiredMonthlyGrowth(
  currentValue: number,
  targetValue: number,
  monthsRemaining: number,
  monthlyContribution: number,
  annualReturnPercent: number,
): number | null {
  if (monthsRemaining <= 0) {
    return null;
  }

  const projectedContributions = projectPortfolioValue(
    0,
    monthlyContribution,
    annualReturnPercent,
    monthsRemaining,
  );
  const projectedCurrent = projectPortfolioValue(
    currentValue,
    0,
    annualReturnPercent,
    monthsRemaining,
  );
  const gap = targetValue - projectedCurrent - projectedContributions;

  if (gap <= 0) {
    return 0;
  }

  return gap / monthsRemaining;
}

function deriveGoalStatus(input: {
  projectedAtTargetDate: number;
  targetValue: number;
  monthsToComplete: number | null;
  monthsToTargetDate: number;
  hasHistory: boolean;
  historyGrowth: number | null;
}): GoalProgressStatus {
  if (input.targetValue <= 0) {
    return "Unknown";
  }

  const projectionRatio = input.projectedAtTargetDate / input.targetValue;

  if (projectionRatio >= 1.05) {
    return "Ahead of schedule";
  }

  if (projectionRatio >= 0.98) {
    return "On track";
  }

  if (projectionRatio >= 0.85) {
    return "Slightly behind";
  }

  if (input.monthsToComplete !== null && input.monthsToTargetDate > 0) {
    if (input.monthsToComplete <= input.monthsToTargetDate * 0.95) {
      return "Ahead of schedule";
    }
    if (input.monthsToComplete <= input.monthsToTargetDate * 1.08) {
      return "On track";
    }
    if (input.monthsToComplete <= input.monthsToTargetDate * 1.2) {
      return "Slightly behind";
    }
  }

  if (input.hasHistory && input.historyGrowth !== null && input.historyGrowth > 0) {
    return projectionRatio >= 0.9 ? "Slightly behind" : "Behind schedule";
  }

  return "Behind schedule";
}

function mapStatusToTrajectory(status: GoalProgressStatus): GoalTrajectory {
  switch (status) {
    case "Ahead of schedule":
      return "Ahead";
    case "On track":
      return "On track";
    case "Slightly behind":
    case "Behind schedule":
      return "Behind";
    default:
      return "Unknown";
  }
}

function buildGoalSummary(input: {
  status: GoalProgressStatus;
  hasHistory: boolean;
  historyGrowth: number | null;
  projectedAtTargetDate: number;
  targetValue: number;
}): string {
  if (input.status === "Unknown") {
    return "More history is required before projections become available.";
  }

  if (input.status === "Ahead of schedule") {
    if (input.hasHistory && input.historyGrowth !== null && input.historyGrowth > 0) {
      return "Recent portfolio growth has improved your trajectory.";
    }
    return "You remain ahead of schedule toward your target.";
  }

  if (input.status === "On track") {
    return "You remain on track toward your target.";
  }

  if (input.status === "Slightly behind") {
    return "Your current trajectory is slightly behind the saved target date.";
  }

  if (input.projectedAtTargetDate < input.targetValue * 0.85) {
    return "Current inputs suggest more contributions or time may be needed to reach the target.";
  }

  return "More history is required before projections become available.";
}

function monthsUntilTargetYear(targetYear: number, now = new Date()): number {
  const targetDate = new Date(Date.UTC(targetYear, 11, 31));
  const diffMs = targetDate.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diffMs / (30.4375 * 24 * 60 * 60 * 1000)));
}

function addMonths(date: Date, months: number): Date {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function formatMonthYear(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function completionIso(months: number | null): string | null {
  if (months === null) {
    return null;
  }
  return addMonths(new Date(), months).toISOString();
}

function solveRequiredMonthlyContribution(
  currentValue: number,
  targetValue: number,
  months: number,
  annualReturnPercent: number,
): number | null {
  if (months <= 0 || targetValue <= currentValue) {
    return 0;
  }

  let low = 0;
  let high = Math.max(targetValue, 1);
  let answer = high;

  for (let iteration = 0; iteration < 40; iteration += 1) {
    const mid = (low + high) / 2;
    const projected = projectPortfolioValue(
      currentValue,
      mid,
      annualReturnPercent,
      months,
    );

    if (projected >= targetValue) {
      answer = mid;
      high = mid;
    } else {
      low = mid;
    }
  }

  return Math.ceil(answer);
}

function buildGoalMilestones(
  currentValue: number,
  targetValue: number,
  baseMonths: number | null,
): GoalMilestone[] {
  const percents = [25, 50, 75, 100];
  return percents.map((percent) => {
    const milestoneValue = (targetValue * percent) / 100;
    const label = `${percent}%`;
    if (currentValue >= milestoneValue) {
      return { percent, label, estimatedDate: new Date().toISOString() };
    }
    if (baseMonths === null || targetValue <= 0) {
      return { percent, label, estimatedDate: null };
    }
    const ratio = Math.max(0, (milestoneValue - currentValue) / Math.max(targetValue - currentValue, 1));
    return {
      percent,
      label,
      estimatedDate: addMonths(new Date(), Math.ceil(baseMonths * ratio)).toISOString(),
    };
  });
}

function emptyScenarioPlan(): GoalProgressScenarioPlan {
  return {
    bear: { estimatedCompletionDate: null, requiredMonthlyContribution: null },
    base: { estimatedCompletionDate: null, requiredMonthlyContribution: null },
    bull: { estimatedCompletionDate: null, requiredMonthlyContribution: null },
    probabilityScore: null,
    milestones: [],
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** @deprecated Use buildGoalProgressEngine */
export const buildGoalProgress = buildGoalProgressEngine;
