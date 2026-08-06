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

const LIMITED_EVIDENCE_FALLBACK =
  "Daily and weekly scores need more verified market data.";

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
    .replace(/^broadly\s+/i, "")
    .trim()
    .toLowerCase();
}

function stripTrailingPunctuation(value: string): string {
  return value.replace(/[.]+$/g, "").trim();
}

function isGenericEvidence(evidence: string): boolean {
  const lower = evidence.toLowerCase();
  return (
    !evidence ||
    lower.includes("see evidence") ||
    lower.includes("based on verified")
  );
}

function isSupportiveFeel(feel: string): boolean {
  return /strong|stable|positive|broadly/.test(feel);
}

function isWeakFeel(feel: string): boolean {
  return /weak/.test(feel);
}

function extractDriverSymbol(evidence: string): string | null {
  const match = evidence.match(/driven mainly by\s+([A-Z0-9._-]+)/i);
  return match?.[1]?.toUpperCase() ?? null;
}

/**
 * One concise Dashboard sentence from Daily + Weekly evidence (not bare band labels).
 * Uses only phrases already present in score summaries — never invents causes.
 */
export function buildCombinedPulseSummary(
  dailySummary: string,
  weeklySummary: string,
  dailyAvailable: boolean,
  weeklyAvailable: boolean,
): string {
  if (!dailyAvailable && !weeklyAvailable) {
    return LIMITED_EVIDENCE_FALLBACK;
  }

  const daily = dailyAvailable
    ? splitBandAndEvidence(dailySummary)
    : { band: "", evidence: "" };
  const weekly = weeklyAvailable
    ? splitBandAndEvidence(weeklySummary)
    : { band: "", evidence: "" };

  const dailyFeel = softenBand(daily.band) || "mixed";
  const weeklyFeel = softenBand(weekly.band) || "mixed";
  const dailyEvidence = stripTrailingPunctuation(daily.evidence);
  const weeklyEvidence = stripTrailingPunctuation(weekly.evidence);
  const dailyGeneric = !dailyAvailable || isGenericEvidence(dailyEvidence);
  const weeklyGeneric = !weeklyAvailable || isGenericEvidence(weeklyEvidence);

  if (dailyAvailable) {
    const driver = extractDriverSymbol(dailyEvidence);
    if (driver) {
      return `Today’s move is driven mainly by ${driver}.`;
    }
    if (/fully concentrated in one holding/i.test(dailyEvidence)) {
      return "Today’s move is fully concentrated in one holding.";
    }
    if (/broad across holdings/i.test(dailyEvidence)) {
      return "Broad participation supports today’s portfolio move.";
    }
    if (/weakness is broad/i.test(dailyEvidence)) {
      return "Weakness is broad across holdings today.";
    }
  }

  if (weeklyAvailable && /concentrated/i.test(weeklyEvidence)) {
    return "Recent moves remain concentrated in few holdings.";
  }

  if (dailyAvailable && weeklyAvailable && !dailyGeneric) {
    // Specific daily evidence already handled above; remaining non-generic falls through.
  }

  if (dailyAvailable && weeklyAvailable) {
    if (dailyGeneric && weeklyGeneric) {
      if (isSupportiveFeel(dailyFeel) && isSupportiveFeel(weeklyFeel)) {
        return "Daily and weekly trends are both supportive.";
      }
      if (dailyFeel === "mixed" && isSupportiveFeel(weeklyFeel)) {
        return "Daily performance is mixed while the weekly trend remains positive.";
      }
      if (isSupportiveFeel(dailyFeel) && weeklyFeel === "mixed") {
        return "Today looks supportive while the weekly trend remains mixed.";
      }
      if (isWeakFeel(dailyFeel) && isSupportiveFeel(weeklyFeel)) {
        return "Today looks weak while the weekly trend remains positive.";
      }
      if (dailyFeel === "mixed" && weeklyFeel === "mixed") {
        return "Portfolio movement is mixed across the day and week.";
      }
      return `Daily performance is ${dailyFeel} while the weekly trend remains ${weeklyFeel}.`;
    }

    if (!weeklyGeneric && /direction are aligned/i.test(weeklyEvidence)) {
      return `Today looks ${dailyFeel} while weekly and monthly direction stay aligned.`;
    }
    if (!weeklyGeneric && /direction differ/i.test(weeklyEvidence)) {
      return `Today looks ${dailyFeel} while weekly and monthly direction differ.`;
    }

    return `Daily performance is ${dailyFeel} while the weekly trend remains ${weeklyFeel}.`;
  }

  if (dailyAvailable) {
    if (dailyGeneric) {
      return `Today’s session looks ${dailyFeel}.`;
    }
    return `Today’s session looks ${dailyFeel}.`;
  }

  if (weeklyGeneric) {
    return `The week looks ${weeklyFeel}.`;
  }
  if (/direction are aligned/i.test(weeklyEvidence)) {
    return "Weekly and monthly direction are aligned.";
  }
  if (/direction differ/i.test(weeklyEvidence)) {
    return "Weekly and monthly direction differ.";
  }
  return `The week looks ${weeklyFeel}.`;
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
