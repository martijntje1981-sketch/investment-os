import type { GoalProgress } from "@/lib/services/goals/goalProgressEngine";

export type GoalHeroProgressState = {
  status: "unconfigured" | "invalid-target" | "unavailable" | "ready";
  fillPercent: number;
  displayPercent: number | null;
  currentValue: number | null;
  targetValue: number | null;
  ariaLabel: string;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value / 100);
}

export function buildGoalHeroProgressState(input: {
  progress: Pick<
    GoalProgress,
    "currentValue" | "targetValue" | "hasGoal" | "goalReached"
  >;
  hasSavedGoal: boolean;
}): GoalHeroProgressState {
  const { progress, hasSavedGoal } = input;

  if (!hasSavedGoal || !progress.hasGoal) {
    return {
      status: "unconfigured",
      fillPercent: 0,
      displayPercent: null,
      currentValue: Number.isFinite(progress.currentValue)
        ? Math.max(0, progress.currentValue)
        : null,
      targetValue: null,
      ariaLabel: "Goal progress unavailable until a target is saved.",
    };
  }

  const currentValue = Number.isFinite(progress.currentValue)
    ? Math.max(0, progress.currentValue)
    : null;
  const targetValue = Number.isFinite(progress.targetValue)
    ? progress.targetValue
    : null;

  if (targetValue === null || targetValue <= 0) {
    return {
      status: "invalid-target",
      fillPercent: 0,
      displayPercent: null,
      currentValue,
      targetValue,
      ariaLabel: "Goal progress unavailable because the target amount is invalid.",
    };
  }

  if (currentValue === null) {
    return {
      status: "unavailable",
      fillPercent: 0,
      displayPercent: null,
      currentValue: null,
      targetValue,
      ariaLabel: "Goal progress unavailable because portfolio value is unavailable.",
    };
  }

  const rawPercent = (currentValue / targetValue) * 100;
  const displayPercent = Number.isFinite(rawPercent)
    ? Math.max(0, rawPercent)
    : null;
  const fillPercent =
    displayPercent === null ? 0 : Math.min(Math.max(displayPercent, 0), 100);

  const achievedText =
    displayPercent === null
      ? "Progress unavailable"
      : progress.goalReached || displayPercent >= 100
        ? "Goal achieved"
        : `${formatPercent(displayPercent)} achieved`;

  return {
    status: "ready",
    fillPercent,
    displayPercent,
    currentValue,
    targetValue,
    ariaLabel: `Goal progress: ${achievedText}. Current portfolio ${formatCurrency(currentValue)} of ${formatCurrency(targetValue)} target.`,
  };
}

export function formatGoalHeroProgressPercent(displayPercent: number | null): string {
  if (displayPercent === null || !Number.isFinite(displayPercent)) {
    return "Unavailable";
  }

  return formatPercent(displayPercent);
}
