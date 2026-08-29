import {
  projectPortfolioValue,
  type GoalProgress,
} from "@/lib/services/goals/goalProgressEngine";
import type { GoalSettings } from "@/lib/types/portfolioStorage";

export type GoalCoachResult = {
  headline: string;
  body: string;
  reason: string;
  actionLine?: string;
};

export type GoalCurrencyMilestone = {
  label: string;
  value: number;
  reached: boolean;
};

export type NextGoalMilestone = {
  lines: string[];
};

const PERCENT_MILESTONES = [25, 50, 75, 100] as const;

export type GoalScenarioRow = {
  id: "current" | "plus_contribution" | "plus_return";
  label: string;
  completionLabel: string;
};

export type GoalScenarioComparison = {
  rows: GoalScenarioRow[];
};

const CONTRIBUTION_BUMP = 100;
const RETURN_BUMP = 1;

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

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function estimateMonthsToReachTarget(
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

function completionLabelFromMonths(months: number | null): string {
  if (months === null) {
    return "Insufficient history";
  }
  if (months === 0) {
    return formatMonthYear(new Date());
  }
  return formatMonthYear(addMonths(new Date(), months));
}

function monthsAheadOfTargetDate(
  monthsToComplete: number | null,
  monthsToTargetDate: number,
): number | null {
  if (monthsToComplete === null || monthsToTargetDate <= 0) {
    return null;
  }
  return monthsToTargetDate - monthsToComplete;
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

function pickMilestoneStep(targetValue: number): number {
  if (targetValue <= 50_000) return 10_000;
  if (targetValue <= 150_000) return 25_000;
  if (targetValue <= 500_000) return 50_000;
  if (targetValue <= 1_500_000) return 100_000;
  return 250_000;
}

export function buildGoalCoach(input: {
  progress: GoalProgress;
  goal: GoalSettings;
  projectedValueAtTargetYear: number;
  now?: Date;
}): GoalCoachResult {
  const { progress, goal, projectedValueAtTargetYear } = input;
  const now = input.now ?? new Date();

  if (!progress.hasGoal) {
    return {
      headline: "Save a goal to begin coaching",
      body: "Set your target amount, date, and contribution plan to receive guidance.",
      reason: "Why: Goal Coach uses your saved inputs and current portfolio value.",
    };
  }

  if (progress.goalReached) {
    return {
      headline: "Your saved goal has been reached.",
      body: `Your portfolio value is above ${formatCurrency(goal.targetValue)}.`,
      reason: "Why: Current portfolio value meets or exceeds the saved target.",
      actionLine: "You can update your goal if your plans have changed.",
    };
  }

  const monthsToTargetDate = monthsUntilTargetYear(goal.targetYear, now);
  const monthsToComplete = estimateMonthsToReachTarget(
    progress.currentValue,
    goal.targetValue,
    goal.monthlyContribution,
    goal.expectedAnnualReturn,
  );
  const projectedCompletion = progress.estimatedCompletionLabel;
  const monthlyNeeded = solveRequiredMonthlyContribution(
    progress.currentValue,
    goal.targetValue,
    monthsToTargetDate,
    goal.expectedAnnualReturn,
  );
  const monthlyGap =
    monthlyNeeded === null
      ? null
      : Math.max(0, monthlyNeeded - goal.monthlyContribution);

  if (progress.status === "Ahead of schedule") {
    const monthsEarly = monthsAheadOfTargetDate(monthsToComplete, monthsToTargetDate);
    return {
      headline: "You're ahead of schedule.",
      body:
        monthsEarly && monthsEarly > 0
          ? `Current projection reaches your goal approximately ${monthsEarly} month${monthsEarly === 1 ? "" : "s"} early.`
          : `Projected completion: ${projectedCompletion}.`,
      reason: `Why: Your projected value of ${formatCurrency(projectedValueAtTargetYear)} exceeds the ${formatCurrency(goal.targetValue)} target by the saved date.`,
      actionLine: `Keep investing ${formatCurrency(goal.monthlyContribution)}/month.`,
    };
  }

  if (progress.status === "On track") {
    return {
      headline: "You're currently on track.",
      body: `Projected completion: ${projectedCompletion}.`,
      reason: `Why: Current inputs project ${formatCurrency(projectedValueAtTargetYear)} by ${goal.targetYear}.`,
      actionLine: `Keep investing ${formatCurrency(goal.monthlyContribution)}/month.`,
    };
  }

  if (progress.status === "Slightly behind") {
    const bumpCompletion = completionLabelFromMonths(
      estimateMonthsToReachTarget(
        progress.currentValue,
        goal.targetValue,
        goal.monthlyContribution + CONTRIBUTION_BUMP,
        goal.expectedAnnualReturn,
      ),
    );

    return {
      headline: "You're slightly behind schedule.",
      body:
        monthlyGap && monthlyGap > 0
          ? `Increasing monthly contributions by ${formatCurrency(Math.min(monthlyGap, CONTRIBUTION_BUMP))} would bring you back on track.`
          : `Adding ${formatCurrency(CONTRIBUTION_BUMP)}/month improves the projected completion to ${bumpCompletion}.`,
      reason: `Why: The current projection of ${formatCurrency(projectedValueAtTargetYear)} is below the ${formatCurrency(goal.targetValue)} target by ${goal.targetYear}.`,
      actionLine: `Current projected completion: ${projectedCompletion}.`,
    };
  }

  return {
    headline: "You're behind schedule.",
    body:
      monthlyGap && monthlyGap > 0
        ? `An additional ${formatCurrency(monthlyGap)} per month would align the projection with your saved target date.`
        : "More time or higher contributions may be needed to reach the saved target date.",
    reason: `Why: Current inputs project ${formatCurrency(projectedValueAtTargetYear)}, leaving a shortfall against ${formatCurrency(goal.targetValue)}.`,
    actionLine: `Projected completion: ${projectedCompletion}.`,
  };
}

export function buildGoalHeroSubtitle(input: {
  progress: GoalProgress;
  goal: GoalSettings;
  hasSavedGoal: boolean;
}): string {
  if (!input.hasSavedGoal || !input.progress.hasGoal) {
    return "Set your target amount, monthly contribution, and target year to track progress.";
  }

  const { progress, goal } = input;
  const progressLabel = progress.currentProgressPercent.toFixed(1);

  if (progress.goalReached) {
    return `You have reached your ${formatCurrency(goal.targetValue)} goal.`;
  }

  if (progress.status === "Ahead of schedule") {
    return `You have reached ${progressLabel}% of your goal and are currently ahead of schedule.`;
  }

  if (progress.status === "On track") {
    return `You have reached ${progressLabel}% of your goal and are on track.`;
  }

  if (
    progress.status === "Slightly behind" ||
    progress.status === "Behind schedule"
  ) {
    return `You have reached ${progressLabel}% of your ${formatCurrency(goal.targetValue)} goal by ${goal.targetYear}. Increasing your monthly contribution could help you reach your goal sooner.`;
  }

  return `Saving ${formatCurrency(goal.monthlyContribution)} per month toward ${formatCurrency(goal.targetValue)} by ${goal.targetYear}.`;
}

function findNextPercentMilestone(
  currentValue: number,
  targetValue: number,
): number | null {
  if (targetValue <= 0) {
    return null;
  }

  const currentPercent = (currentValue / targetValue) * 100;

  for (const milestone of PERCENT_MILESTONES) {
    if (currentPercent < milestone) {
      return milestone;
    }
  }

  return null;
}

export function buildNextGoalMilestone(input: {
  currentValue: number;
  targetValue: number;
  currentProgressPercent: number;
}): NextGoalMilestone | null {
  const { currentValue, targetValue, currentProgressPercent } = input;

  if (targetValue <= 0) {
    return null;
  }

  const lines: string[] = [];
  const nextPercent = findNextPercentMilestone(currentValue, targetValue);

  if (nextPercent !== null && nextPercent < 100) {
    const milestoneValue = (nextPercent / 100) * targetValue;
    const remaining = Math.max(0, milestoneValue - currentValue);
    lines.push(
      `${formatCurrency(remaining)} remaining until ${nextPercent}% completion.`,
    );
  }

  const currencyMilestones = buildGoalCurrencyMilestones(currentValue, targetValue);
  const nextCurrencyMilestone = currencyMilestones.find(
    (milestone) => !milestone.reached,
  );

  if (nextCurrencyMilestone) {
    lines.push(
      `Next milestone: ${formatCurrency(nextCurrencyMilestone.value)} portfolio value.`,
    );
  }

  lines.push(`${currentProgressPercent.toFixed(1)}% completed.`);

  return { lines };
}

export function buildGoalCurrencyMilestones(
  currentValue: number,
  targetValue: number,
): GoalCurrencyMilestone[] {
  if (targetValue <= 0) {
    return [];
  }

  const step = pickMilestoneStep(targetValue);
  const values: number[] = [];

  for (let value = step; value < targetValue; value += step) {
    values.push(value);
  }
  values.push(targetValue);

  const trimmed = values.length > 4 ? values.slice(values.length - 4) : values;

  return trimmed.map((value) => ({
    label: value === targetValue ? "Goal" : formatCurrency(value),
    value,
    reached: currentValue >= value,
  }));
}

export function buildGoalScenarioComparison(input: {
  currentValue: number;
  goal: GoalSettings;
}): GoalScenarioComparison {
  const { currentValue, goal } = input;

  const currentMonths = estimateMonthsToReachTarget(
    currentValue,
    goal.targetValue,
    goal.monthlyContribution,
    goal.expectedAnnualReturn,
  );
  const plusContributionMonths = estimateMonthsToReachTarget(
    currentValue,
    goal.targetValue,
    goal.monthlyContribution + CONTRIBUTION_BUMP,
    goal.expectedAnnualReturn,
  );
  const plusReturnMonths = estimateMonthsToReachTarget(
    currentValue,
    goal.targetValue,
    goal.monthlyContribution,
    goal.expectedAnnualReturn + RETURN_BUMP,
  );

  return {
    rows: [
      {
        id: "current",
        label: "Current",
        completionLabel: completionLabelFromMonths(currentMonths),
      },
      {
        id: "plus_contribution",
        label: `+${formatCurrency(CONTRIBUTION_BUMP)}/month`,
        completionLabel: completionLabelFromMonths(plusContributionMonths),
      },
      {
        id: "plus_return",
        label: `+${RETURN_BUMP}% annual return`,
        completionLabel: completionLabelFromMonths(plusReturnMonths),
      },
    ],
  };
}

export function buildGoalInsight(input: {
  progress: GoalProgress;
  goal: GoalSettings;
  projectedValueAtTargetYear: number;
}): string {
  const { progress, goal, projectedValueAtTargetYear } = input;

  if (!progress.hasGoal) {
    return "Save a goal to unlock progress insights.";
  }

  if (progress.goalReached) {
    return "Your portfolio has reached the saved target value.";
  }

  const buffer = projectedValueAtTargetYear - progress.targetValue;
  if (buffer >= 1_000) {
    return `Current projection exceeds your goal by ${formatCurrency(buffer)}.`;
  }

  const monthsToTargetDate = monthsUntilTargetYear(goal.targetYear);
  const monthlyNeeded = solveRequiredMonthlyContribution(
    progress.currentValue,
    progress.targetValue,
    monthsToTargetDate,
    goal.expectedAnnualReturn,
  );
  const monthlyGap =
    monthlyNeeded === null
      ? null
      : Math.max(0, Math.ceil(monthlyNeeded - goal.monthlyContribution));

  if (
    monthlyGap !== null &&
    monthlyGap > 0 &&
    (progress.status === "Slightly behind" || progress.status === "Behind schedule")
  ) {
    return `Only ${formatCurrency(monthlyGap)} per month separates you from your target pace.`;
  }

  const percent = Math.round(progress.currentProgressPercent);
  if (percent > 0 && percent < 100) {
    return `You have already completed ${percent}% of your journey.`;
  }

  return progress.summary;
}
