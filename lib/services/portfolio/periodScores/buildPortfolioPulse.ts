/**
 * Portfolio Pulse — Daily + Weekly scores and a combined Dashboard summary.
 */

import { buildDailyPortfolioScore } from "@/lib/services/portfolio/periodScores/buildDailyPortfolioScore";
import type { BuildDailyPortfolioScoreInput } from "@/lib/services/portfolio/periodScores/buildDailyPortfolioScore";
import { buildWeeklyPortfolioScore } from "@/lib/services/portfolio/periodScores/buildWeeklyPortfolioScore";
import type { BuildWeeklyPortfolioScoreInput } from "@/lib/services/portfolio/periodScores/buildWeeklyPortfolioScore";
import type { PortfolioPulseResult } from "@/lib/services/portfolio/periodScores/types";
import { toDynamicScoreSnapshot } from "@/lib/services/portfolio/periodScores/types";

export type BuildPortfolioPulseInput = {
  daily: BuildDailyPortfolioScoreInput;
  weekly: BuildWeeklyPortfolioScoreInput;
  calculatedAt?: string;
};

export function buildCombinedPulseSummary(
  dailySummary: string,
  weeklySummary: string,
  dailyAvailable: boolean,
  weeklyAvailable: boolean,
): string {
  if (dailyAvailable && weeklyAvailable) {
    const dailyShort = dailySummary.split(":")[0]?.trim() || dailySummary;
    const weeklyShort = weeklySummary.split(":")[0]?.trim() || weeklySummary;
    if (dailySummary.toLowerCase().includes("broad") && weeklyAvailable) {
      return `Today’s move reads as ${dailyShort.toLowerCase()}, while the week is ${weeklyShort.toLowerCase()}.`;
    }
    return `${dailyShort}. ${weeklyShort}.`;
  }
  if (dailyAvailable) {
    return dailySummary;
  }
  if (weeklyAvailable) {
    return weeklySummary;
  }
  return "Daily and weekly portfolio scores need more price or history data.";
}

export function buildPortfolioPulse(
  input: BuildPortfolioPulseInput,
): PortfolioPulseResult {
  const calculatedAt = input.calculatedAt ?? new Date().toISOString();
  const daily = buildDailyPortfolioScore({
    ...input.daily,
    calculatedAt,
  });
  const weekly = buildWeeklyPortfolioScore({
    ...input.weekly,
    calculatedAt,
  });

  return {
    daily,
    weekly,
    combinedSummary: buildCombinedPulseSummary(
      daily.summary,
      weekly.summary,
      daily.available,
      weekly.available,
    ),
    calculatedAt,
  };
}

export function buildPortfolioPulseSnapshots(pulse: PortfolioPulseResult) {
  return {
    daily: toDynamicScoreSnapshot(pulse.daily),
    weekly: toDynamicScoreSnapshot(pulse.weekly),
    combinedSummary: pulse.combinedSummary,
    calculatedAt: pulse.calculatedAt,
  };
}
