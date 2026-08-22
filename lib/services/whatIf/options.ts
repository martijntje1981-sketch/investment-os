/**
 * Restrained contribution / planning-assumption exploration options.
 * Never invent a saved contribution or a hidden 10% return default.
 */

import {
  EXPECTED_ANNUAL_RETURN_MAX,
  EXPECTED_ANNUAL_RETURN_MIN,
  getExpectedReturnAssumption,
} from "@/lib/client/expectedReturnAssumption";
import type { GoalSettings } from "@/lib/types/portfolioStorage";

export const CONTRIBUTION_WHATIF_INCREMENTS_EUR = [250, 500, 1000] as const;

export const CONTRIBUTION_WHATIF_SLIDER_STEP = 50;

export function readSavedMonthlyContribution(
  goal: GoalSettings | null,
  hasSavedGoal: boolean,
): number | null {
  if (!hasSavedGoal || !goal) return null;
  const n = Number(goal.monthlyContribution);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

export function buildContributionWhatIfPresets(
  savedMonthly: number | null,
): {
  savedMonthly: number | null;
  hasSavedPositiveContribution: boolean;
  presets: number[];
  sliderMin: number;
  sliderMax: number;
} {
  if (savedMonthly == null) {
    return {
      savedMonthly: null,
      hasSavedPositiveContribution: false,
      presets: [],
      sliderMin: 0,
      sliderMax: 0,
    };
  }

  const current = Math.max(0, Math.round(savedMonthly));
  const presets = new Set<number>([current]);
  for (const extra of CONTRIBUTION_WHATIF_INCREMENTS_EUR) {
    presets.add(current + extra);
    if (current - extra >= 0) presets.add(current - extra);
  }

  const sliderMax = Math.max(current + 2_000, 2_000);

  return {
    savedMonthly: current,
    hasSavedPositiveContribution: current > 0,
    presets: [...presets].sort((left, right) => left - right),
    sliderMin: 0,
    sliderMax,
  };
}

export function buildPlanningAssumptionPresets(
  savedPercent: number | null,
): number[] {
  if (savedPercent == null || !Number.isFinite(savedPercent)) return [];
  const current = Math.round(savedPercent * 10) / 10;
  const presets = new Set<number>([current]);
  for (const delta of [-3, -1, 1]) {
    const next = Math.round((current + delta) * 10) / 10;
    if (
      next >= EXPECTED_ANNUAL_RETURN_MIN &&
      next <= EXPECTED_ANNUAL_RETURN_MAX
    ) {
      presets.add(next);
    }
  }
  return [...presets].sort((left, right) => left - right);
}

export function readSavedPlanningAssumption(
  goal: GoalSettings | null,
): number | null {
  return getExpectedReturnAssumption(goal);
}
