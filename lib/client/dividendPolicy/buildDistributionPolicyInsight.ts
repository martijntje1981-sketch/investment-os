/**
 * Portfolio-level one-liner for the compact Distribution Policy summary.
 */

import type { PortfolioDistributionPolicySnapshot } from "@/lib/types/distributionPolicy";

export function buildDistributionPolicyInsight(
  summary: PortfolioDistributionPolicySnapshot["summary"],
): string {
  if (summary.totalInvestments === 0) {
    return "Add investment holdings to review distribution policy classification.";
  }

  if (summary.conflicted > 0) {
    return `${summary.conflicted} holding${summary.conflicted === 1 ? "" : "s"} with conflicting distribution information.`;
  }

  if (summary.unknown > 0) {
    return `${summary.unknown} holding${summary.unknown === 1 ? "" : "s"} still need confirmation before income estimates can rely on them.`;
  }

  if (summary.distributing > 0) {
    return `${summary.distributing} cash-distributing holding${summary.distributing === 1 ? "" : "s"} identified; classifications do not estimate income.`;
  }

  if (summary.accumulating > 0) {
    return `${summary.accumulating} accumulating / reinvesting holding${summary.accumulating === 1 ? "" : "s"} identified.`;
  }

  return "Distribution classifications are confirmed first and unknown by default.";
}
