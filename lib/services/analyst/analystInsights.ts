/**
 * Deterministic analyst observations and dashboard insight copy.
 */

import { formatPortfolioPercent } from "@/lib/client/portfolioAnalysis";
import { formatConsensusRating } from "@/lib/services/analyst/normalizeRating";
import type { PortfolioAnalystSnapshot } from "@/lib/types/analyst";

type ObservationInput = Pick<
  PortfolioAnalystSnapshot,
  | "hasMeaningfulCoverage"
  | "coveredHoldingsCount"
  | "totalInvestmentsCount"
  | "coveragePercentOfInvested"
  | "weightedConsensus"
  | "weightedImpliedUpsidePercent"
  | "mostBullish"
  | "mostCautious"
  | "recentActions"
  | "coverageState"
>;

export function buildAnalystObservations(input: ObservationInput): string[] {
  const observations: string[] = [];

  if (!input.hasMeaningfulCoverage) {
    if (input.coverageState === "provider_unavailable") {
      observations.push(
        "Analyst data is temporarily unavailable. Cached coverage will be shown when available.",
      );
      return observations;
    }

    observations.push(
      `${input.coveredHoldingsCount} of ${input.totalInvestmentsCount} holdings currently have traditional analyst coverage. ETFs, ETPs, and funds usually do not receive individual sell-side ratings or price targets.`,
    );
    return observations;
  }

  observations.push(
    `Analyst coverage is available for ${formatPortfolioPercent(input.coveragePercentOfInvested)} of your invested portfolio across ${input.coveredHoldingsCount} ${input.coveredHoldingsCount === 1 ? "holding" : "holdings"}.`,
  );

  observations.push(
    `The weighted analyst consensus is ${formatConsensusRating(input.weightedConsensus)}${
      input.weightedImpliedUpsidePercent != null
        ? `, with estimated average ${input.weightedImpliedUpsidePercent >= 0 ? "upside" : "downside"} of ${formatPortfolioPercent(Math.abs(input.weightedImpliedUpsidePercent))} to the current average price target.`
        : "."
    }`,
  );

  if (
    input.mostBullish &&
    input.mostCautious &&
    input.mostBullish.symbol !== input.mostCautious.symbol &&
    input.mostBullish.impliedUpsidePercent != null &&
    input.mostCautious.impliedUpsidePercent != null
  ) {
    observations.push(
      `${input.mostBullish.symbol} has the highest implied upside among covered holdings, while ${input.mostCautious.symbol} has the most limited target upside currently visible.`,
    );
  }

  if (input.recentActions.length > 0) {
    observations.push(
      `${input.recentActions.length} recent analyst ${input.recentActions.length === 1 ? "update" : "updates"} matched your portfolio in the latest news scan.`,
    );
  }

  return observations;
}

export function buildAnalystInsight(input: ObservationInput): string {
  if (!input.hasMeaningfulCoverage) {
    if (input.coverageState === "provider_unavailable") {
      return "Analyst data is temporarily unavailable. Cached coverage will be shown when available.";
    }

    return "Most of your portfolio consists of funds or assets without traditional analyst coverage.";
  }

  const consensus = formatConsensusRating(input.weightedConsensus);
  const upsideText =
    input.weightedImpliedUpsidePercent != null
      ? `, with estimated average ${input.weightedImpliedUpsidePercent >= 0 ? "upside" : "downside"} of ${formatPortfolioPercent(Math.abs(input.weightedImpliedUpsidePercent))}`
      : "";

  if (input.recentActions.length >= 2) {
    return `Analyst sentiment changed for ${input.recentActions.length} covered holdings in recent headlines. The weighted consensus remains ${consensus}${upsideText}.`;
  }

  return `${input.coveredHoldingsCount} of your holdings have analyst coverage. The weighted consensus is ${consensus}${upsideText}.`;
}
