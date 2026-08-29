/**
 * Stable fingerprint for health score + insight cache invalidation.
 * Omits rapidly changing quote timestamps and absolute prices when weights are enough.
 */

import { PORTFOLIO_HEALTH_SCORE_VERSION } from "@/lib/services/portfolio/healthScore/config";
import type { PortfolioHealthScoreInput } from "@/lib/services/portfolio/healthScore/types";

function fnv1a(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

/**
 * What invalidates score calculation / AI cache:
 * - score version
 * - holding identities + quantities (rounded)
 * - rounded portfolio weights of top positions
 * - goal settings
 * - classification/cash/crypto rounded weights
 * - stale flag
 *
 * What does NOT invalidate:
 * - cosmetic UI state
 * - news headlines
 * - absolute live price ticks that leave weights unchanged within 0.1%
 */
export function buildPortfolioHealthFingerprint(
  input: Pick<
    PortfolioHealthScoreInput,
    "holdings" | "analysis" | "profile" | "goal" | "hasSavedGoal" | "isStale"
  >,
): string {
  const holdingsKey = input.holdings
    .map((holding) => {
      const qty = Number.isFinite(holding.quantity)
        ? Number(holding.quantity.toFixed(6))
        : 0;
      return [
        holding.id,
        holding.symbol,
        holding.assetType ?? "investment",
        qty,
        holding.providerSymbol ?? "",
      ].join(":");
    })
    .sort()
    .join("|");

  const weightsKey = input.analysis.valuedPositions
    .slice(0, 12)
    .map(
      (position) =>
        `${position.holding.symbol}:${position.weightPercent.toFixed(1)}`,
    )
    .join(",");

  const goalKey =
    input.hasSavedGoal && input.goal
      ? [
          input.goal.targetValue,
          input.goal.targetYear,
          input.goal.monthlyContribution,
          input.goal.expectedAnnualReturn,
          input.goal.passiveIncomeTarget ?? "",
        ].join(":")
      : "no-goal";

  const classKey = [
    input.profile.classification.cryptoWeight.toFixed(1),
    input.profile.classification.cashWeight.toFixed(1),
    input.profile.classification.equityWeight.toFixed(1),
    input.profile.expectedVolatility.level,
    input.isStale ? "stale" : "fresh",
  ].join(":");

  const payload = [
    PORTFOLIO_HEALTH_SCORE_VERSION,
    holdingsKey,
    weightsKey,
    goalKey,
    classKey,
    input.analysis.totalValue > 0 ? "valued" : "empty",
  ].join("::");

  return `${PORTFOLIO_HEALTH_SCORE_VERSION}:${fnv1a(payload)}`;
}
