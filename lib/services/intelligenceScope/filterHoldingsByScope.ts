/**
 * Filter holdings for a product intelligence scope.
 * Cash stays with invest/complete; crypto-only for crypto scope.
 */

import { isCryptoHolding } from "@/lib/services/portfolio/cryptoHolding";
import type { IntelligenceScopeId } from "@/lib/services/intelligenceScope/types";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

export function holdingMatchesIntelligenceScope(
  holding: StoredPortfolioHolding,
  scope: IntelligenceScopeId,
): boolean {
  if (scope === "complete") return true;
  if (scope === "crypto") return isCryptoHolding(holding);
  // invest: traditional assets + cash ballast; exclude crypto
  return !isCryptoHolding(holding);
}

export function filterHoldingsByIntelligenceScope(
  holdings: StoredPortfolioHolding[],
  scope: IntelligenceScopeId,
): StoredPortfolioHolding[] {
  return holdings.filter((holding) =>
    holdingMatchesIntelligenceScope(holding, scope),
  );
}

/** Absolute contribution / move for Complete materiality ranking. */
export function materialityScore(input: {
  absoluteMove?: number | null;
  absoluteContributionPp?: number | null;
  weightPercent?: number | null;
}): number {
  const move =
    input.absoluteMove != null && Number.isFinite(input.absoluteMove)
      ? Math.abs(input.absoluteMove)
      : 0;
  const pp =
    input.absoluteContributionPp != null &&
    Number.isFinite(input.absoluteContributionPp)
      ? Math.abs(input.absoluteContributionPp) * 1000
      : 0;
  const weight =
    input.weightPercent != null && Number.isFinite(input.weightPercent)
      ? Math.abs(input.weightPercent)
      : 0;
  return Math.max(move, pp, weight * 0.01);
}
