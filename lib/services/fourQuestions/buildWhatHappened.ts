/**
 * Q1 — What happened? (existing performance + attribution + pulse context)
 */

import { summarizeDailyPerformance } from "@/lib/client/dailyPerformance";
import { fourQuestionHubPath } from "@/lib/services/fourQuestions/catalog";
import type { IntelligenceScopeId } from "@/lib/services/intelligenceScope";
import {
  buildWhatHappenedTrace,
  traceToExpandItems,
} from "@/lib/services/intelligenceTrace";
import { buildPortfolioPerformanceAttribution } from "@/lib/services/performanceAttribution";
import type { PortfolioPulseResult } from "@/lib/services/portfolio/periodScores/types";
import type {
  FourQuestionAnswer,
  FourQuestionExpandItem,
} from "@/lib/services/fourQuestions/types";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function formatSignedPercent(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded.toFixed(1)}%`;
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

  void topPos;
  void topNeg;
  void pulse;

  const trace = buildWhatHappenedTrace({
    insight: `${answer}${support ? ` · ${support}` : ""}`,
    daily,
    attribution,
  });
  const expandItems: FourQuestionExpandItem[] = traceToExpandItems({
    trace,
    questionId: "what_happened",
    depth: "complete",
  });

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
      label: "Explore full analysis",
      href: fourQuestionHubPath("what_happened"),
    },
    quiet,
    scope,
  };
}
