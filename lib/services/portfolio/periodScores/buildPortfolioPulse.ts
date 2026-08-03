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

function splitBandAndEvidence(summary: string): {
  band: string;
  evidence: string;
} {
  const idx = summary.indexOf(":");
  if (idx === -1) {
    return { band: summary.trim(), evidence: "" };
  }
  return {
    band: summary.slice(0, idx).trim(),
    evidence: summary.slice(idx + 1).trim(),
  };
}

function softenBand(band: string): string {
  return band
    .replace(/\s+session$/i, "")
    .replace(/\s+week$/i, "")
    .trim()
    .toLowerCase();
}

function isGenericEvidence(evidence: string): boolean {
  const lower = evidence.toLowerCase();
  return (
    !evidence ||
    lower.includes("see evidence") ||
    lower.includes("based on verified")
  );
}

function stripTrailingPunctuation(value: string): string {
  return value.replace(/[.]+$/g, "").trim();
}

function dailyClause(summary: string): string {
  const { band, evidence } = splitBandAndEvidence(summary);
  const feel = softenBand(band) || "mixed";
  const cleanEvidence = stripTrailingPunctuation(evidence);
  if (isGenericEvidence(cleanEvidence)) {
    return `today looks ${feel}`;
  }
  const detail = cleanEvidence
    .replace(/^today’s move is /i, "")
    .replace(/^the move is /i, "")
    .replace(/^weakness is /i, "weakness is ");
  if (/^driven mainly by /i.test(detail) || /^fully concentrated/i.test(detail)) {
    return `today’s ${feel} move is ${detail}`;
  }
  if (/^broad across holdings/i.test(detail)) {
    return `today’s ${feel} move is broad across holdings`;
  }
  if (/^weakness is broad/i.test(detail)) {
    return `today’s ${feel} session shows broad weakness`;
  }
  return `today looks ${feel} — ${detail}`;
}

function weeklyClause(summary: string): string {
  const { band, evidence } = splitBandAndEvidence(summary);
  const feel = softenBand(band) || "mixed";
  const cleanEvidence = stripTrailingPunctuation(evidence);
  if (isGenericEvidence(cleanEvidence)) {
    return `the week looks ${feel}`;
  }
  if (/concentrated/i.test(cleanEvidence)) {
    return `the week looks ${feel} and concentrated in few holdings`;
  }
  if (/direction are aligned/i.test(cleanEvidence)) {
    return `the week looks ${feel} with weekly and monthly direction aligned`;
  }
  if (/direction differ/i.test(cleanEvidence)) {
    return `the week looks ${feel} as weekly and monthly direction differ`;
  }
  return `the week looks ${feel} — ${cleanEvidence}`;
}

function capitalizeSentence(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * One concise Dashboard sentence from Daily + Weekly evidence (not bare band labels).
 */
export function buildCombinedPulseSummary(
  dailySummary: string,
  weeklySummary: string,
  dailyAvailable: boolean,
  weeklyAvailable: boolean,
): string {
  if (dailyAvailable && weeklyAvailable) {
    return `${capitalizeSentence(dailyClause(dailySummary))}, while ${weeklyClause(weeklySummary)}.`;
  }
  if (dailyAvailable) {
    return capitalizeSentence(dailyClause(dailySummary)) + ".";
  }
  if (weeklyAvailable) {
    return capitalizeSentence(weeklyClause(weeklySummary)) + ".";
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
