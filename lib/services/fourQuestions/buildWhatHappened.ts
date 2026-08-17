/**
 * Q1 — What happened? (existing performance + attribution + pulse context)
 */

import { summarizeDailyPerformance } from "@/lib/client/dailyPerformance";
import { DASHBOARD_DEEP_LINKS } from "@/lib/navigation/deepLinks";
import type { IntelligenceScopeId } from "@/lib/services/intelligenceScope";
import {
  buildAttributionConclusions,
  buildPortfolioPerformanceAttribution,
} from "@/lib/services/performanceAttribution";
import type { PortfolioPulseResult } from "@/lib/services/portfolio/periodScores/types";
import type { FourQuestionAnswer } from "@/lib/services/fourQuestions/types";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function formatSignedPercent(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded.toFixed(1)}%`;
}

function clipWords(text: string, maxWords: number): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return text.trim();
  return `${words.slice(0, maxWords).join(" ")}…`;
}

export function buildWhatHappenedQuestion(input: {
  scope: IntelligenceScopeId;
  holdings: StoredPortfolioHolding[];
  pulse?: PortfolioPulseResult | null;
}): FourQuestionAnswer {
  const { scope, holdings, pulse } = input;
  const daily = summarizeDailyPerformance(holdings);
  const attribution = buildPortfolioPerformanceAttribution({
    period: "1D",
    holdings,
  });

  const topPos = attribution.contributors[0] ?? null;
  const topNeg = attribution.detractors[0] ?? null;
  const dominant =
    topNeg &&
    topPos &&
    Math.abs(topNeg.contributionPp ?? 0) >= Math.abs(topPos.contributionPp ?? 0)
      ? topNeg
      : topNeg && !topPos
        ? topNeg
        : topPos;

  let answer: string;
  let support: string | null = null;
  let quiet = false;

  if (!daily.hasDailyData || holdings.length === 0) {
    answer = "Today’s move isn’t available yet.";
    support = "Open performance when market data is ready.";
    quiet = true;
  } else {
    const scopeNoun =
      scope === "crypto"
        ? "Crypto"
        : scope === "invest"
          ? "Investments"
          : "Portfolio";
    answer = `${scopeNoun} ${formatSignedPercent(daily.todayPercent)} today`;
    if (dominant?.name || dominant?.symbol) {
      const name = dominant.name || dominant.symbol;
      const explainsDecline =
        daily.todayPercent < 0 && (dominant.contributionPp ?? 0) < 0;
      const explainsRise =
        daily.todayPercent > 0 && (dominant.contributionPp ?? 0) > 0;
      if (explainsDecline) {
        support = `${name} explains most of today’s decline.`;
      } else if (explainsRise) {
        support = `${name} explains most of today’s gain.`;
      } else {
        support = `${name} is today’s largest contributor.`;
      }
    } else if (Math.abs(daily.todayPercent) < 0.15) {
      support = "No single holding stood out.";
      quiet = true;
    }
  }

  const conclusions = buildAttributionConclusions({
    period: "1D",
    totalReturnPercent: attribution.totalReturnPercent,
    holdings: attribution.holdings,
    coveragePercent: attribution.dataQuality.coveragePercent,
    quantitiesHeldConstant: attribution.dataQuality.quantitiesHeldConstant,
    maxConclusions: 2,
  });

  const expandItems = [
    {
      id: "period-return",
      label: "Today",
      detail: daily.hasDailyData
        ? formatSignedPercent(daily.todayPercent)
        : "Unavailable",
    },
  ];

  if (topPos) {
    expandItems.push({
      id: "top-positive",
      label: "Top positive",
      detail: `${topPos.name || topPos.symbol}${
        topPos.contributionPp != null
          ? ` · ${topPos.contributionPp > 0 ? "+" : ""}${topPos.contributionPp.toFixed(1)} pp`
          : ""
      }`,
    });
  }
  if (topNeg) {
    expandItems.push({
      id: "top-negative",
      label: "Top negative",
      detail: `${topNeg.name || topNeg.symbol}${
        topNeg.contributionPp != null
          ? ` · ${topNeg.contributionPp > 0 ? "+" : ""}${topNeg.contributionPp.toFixed(1)} pp`
          : ""
      }`,
    });
  }

  if (pulse?.daily?.summary) {
    expandItems.push({
      id: "pulse-daily",
      label: "Daily pulse",
      detail: clipWords(pulse.daily.summary, 14),
    });
  }
  if (pulse?.weekly?.summary) {
    expandItems.push({
      id: "pulse-weekly",
      label: "Weekly pulse",
      detail: clipWords(pulse.weekly.summary, 12),
    });
  }
  if (pulse?.monthly?.summary) {
    expandItems.push({
      id: "pulse-monthly",
      label: "Monthly pulse",
      detail: clipWords(pulse.monthly.summary, 12),
    });
  }

  for (const conclusion of conclusions.slice(0, 1)) {
    expandItems.push({
      id: `attr-${conclusion.id}`,
      label: "Driver",
      detail: clipWords(conclusion.text, 18),
    });
  }

  const disclosures: string[] = [];
  if (attribution.dataQuality.warnings.length > 0) {
    disclosures.push(...attribution.dataQuality.warnings.slice(0, 1));
  } else if (attribution.dataQuality.quantitiesHeldConstant) {
    disclosures.push(
      "Holding-level moves use current quantities held constant; cash flows are not adjusted.",
    );
  }

  return {
    id: "what_happened",
    numberLabel: "01",
    question: "What happened?",
    answer,
    support,
    expandItems,
    disclosures,
    explore: {
      label: "Explore performance",
      href: DASHBOARD_DEEP_LINKS.portfolioPerformance,
    },
    quiet,
    scope,
  };
}
