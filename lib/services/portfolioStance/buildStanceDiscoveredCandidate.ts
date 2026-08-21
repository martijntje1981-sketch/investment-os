/**
 * Reusable Tobailey Discovered candidate for stance zone shifts.
 * Not a product surface — expose the model only.
 */

import type {
  PortfolioStanceHistory,
  StanceDiscoveredCandidate,
} from "@/lib/services/portfolioStance/types";

export function buildStanceDiscoveredCandidate(
  history: PortfolioStanceHistory | null | undefined,
): StanceDiscoveredCandidate | null {
  if (!history || history.status !== "ready" || !history.change?.material) {
    return null;
  }
  if (!history.change.zoneChanged || !history.prior) return null;

  const current = history.current;
  const crypto = current.inputs?.groupWeights.crypto;
  const largest = current.inputs?.largestHoldingWeightPercent;
  const impact = current.inputs?.modeledImpactPercent;
  const evidence: string[] = [];
  if (crypto != null) evidence.push(`Crypto ${Math.round(crypto)}% today`);
  if (largest != null) {
    evidence.push(`Largest holding ${Math.round(largest)}% today`);
  }
  if (impact != null) {
    evidence.push(`Modeled sensitivity ${impact.toFixed(1)}% today`);
  }

  return {
    id: "stance-zone-shift",
    headline: `Your portfolio moved from ${history.change.fromBandLabel} to ${history.change.toBandLabel}.`,
    evidence,
    material: true,
  };
}
