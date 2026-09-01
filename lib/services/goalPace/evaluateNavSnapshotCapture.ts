import { resolvePortfolioTotalValueAvailability } from "@/lib/client/portfolioValuationAvailability";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";
import type {
  CanonicalNavValuation,
  NavSnapshotUsability,
  NavSnapshotWriteDecision,
  PortfolioNavSnapshot,
} from "@/lib/services/goalPace/types";

function maxIsoTimestamp(values: Array<string | null | undefined>): string | null {
  let latest: string | null = null;
  let latestMs = Number.NEGATIVE_INFINITY;
  for (const value of values) {
    if (!value) continue;
    const ms = Date.parse(value);
    if (!Number.isFinite(ms) || ms <= latestMs) continue;
    latest = new Date(ms).toISOString();
    latestMs = ms;
  }
  return latest;
}

function hasPersistedMarketPrice(holding: StoredPortfolioHolding): boolean {
  return (
    typeof holding.currentPrice === "number" &&
    Number.isFinite(holding.currentPrice) &&
    holding.currentPrice > 0
  );
}

/**
 * Goal Pace NAV may only use persisted market prices and canonical cash.
 * Estimated purchase-price fallback is not actual NAV.
 */
export function holdingsForCanonicalNav(
  holdings: StoredPortfolioHolding[],
): StoredPortfolioHolding[] {
  return holdings.map((holding) => {
    if (holding.assetType === "cash") return holding;
    if (hasPersistedMarketPrice(holding)) {
      return { ...holding, purchasePrice: 0 };
    }
    return {
      ...holding,
      currentPrice: 0,
      purchasePrice: 0,
      currentPairPrice: null,
      currentManualPrice: null,
      manualCurrentValue: null,
      priceDataStatus: "unavailable",
    };
  });
}

/**
 * Canonical live NAV from server-loaded holdings (last persisted market prices).
 * Never uses reconstructed EOD history series or estimated cost-basis fallback.
 */
export function resolveCanonicalNavValuation(
  holdings: StoredPortfolioHolding[],
): CanonicalNavValuation {
  const marketHoldings = holdingsForCanonicalNav(holdings);
  const availability = resolvePortfolioTotalValueAvailability(marketHoldings);
  const valuedAt = maxIsoTimestamp(
    marketHoldings
      .filter(
        (holding) => holding.assetType === "cash" || hasPersistedMarketPrice(holding),
      )
      .map((holding) => holding.marketPriceUpdatedAt ?? holding.updatedAt),
  );

  return {
    navEur: availability.totalValue,
    portfolioValueAvailable: availability.isAvailable,
    isPartial: availability.isPartial,
    holdingCount: holdings.length,
    valuedHoldingCount: availability.valuedHoldingCount,
    excludedHoldingCount: availability.unvaluedInvestmentCount,
    valuedAt,
  };
}

export function navSnapshotUsability(
  valuation: CanonicalNavValuation,
): NavSnapshotUsability | null {
  if (!valuation.portfolioValueAvailable) return null;
  if (valuation.isPartial || valuation.excludedHoldingCount > 0) {
    return "partial";
  }
  return "usable";
}

function usabilityRank(usability: NavSnapshotUsability): number {
  return usability === "usable" ? 2 : 1;
}

export function isBetterOrEqualCoverage(
  next: Pick<CanonicalNavValuation, "valuedHoldingCount" | "excludedHoldingCount"> & {
    usability: NavSnapshotUsability;
  },
  existing: Pick<
    PortfolioNavSnapshot,
    "usability" | "valuedHoldingCount" | "excludedHoldingCount"
  >,
): boolean {
  const nextRank = usabilityRank(next.usability);
  const existingRank = usabilityRank(existing.usability);
  if (nextRank !== existingRank) return nextRank > existingRank;
  if (next.excludedHoldingCount !== existing.excludedHoldingCount) {
    return next.excludedHoldingCount < existing.excludedHoldingCount;
  }
  return next.valuedHoldingCount >= existing.valuedHoldingCount;
}

export function isStrictlyBetterCoverage(
  next: Pick<
    CanonicalNavValuation,
    "valuedHoldingCount" | "excludedHoldingCount"
  > & { usability: NavSnapshotUsability },
  existing: Pick<
    PortfolioNavSnapshot,
    "usability" | "valuedHoldingCount" | "excludedHoldingCount"
  >,
): boolean {
  return (
    isBetterOrEqualCoverage(next, existing) &&
    (next.usability !== existing.usability ||
      next.excludedHoldingCount !== existing.excludedHoldingCount ||
      next.valuedHoldingCount !== existing.valuedHoldingCount)
  );
}

/** Equal-coverage captures may not replace a fresher valued_at. */
export function isFresherOrEqualValuedAt(
  nextValuedAt: string | null,
  existingValuedAt: string | null,
): boolean {
  if (!existingValuedAt) return true;
  if (!nextValuedAt) return false;
  return Date.parse(nextValuedAt) >= Date.parse(existingValuedAt);
}

export function evaluateNavSnapshotWrite(input: {
  valuation: CanonicalNavValuation;
  existing: PortfolioNavSnapshot | null;
}): NavSnapshotWriteDecision {
  const usability = navSnapshotUsability(input.valuation);
  if (usability === null) {
    return { action: "skip_unavailable" };
  }

  if (!input.existing) {
    return {
      action: "create",
      usability,
      navEur: input.valuation.navEur,
    };
  }

  const coverageInput = { ...input.valuation, usability };
  if (!isBetterOrEqualCoverage(coverageInput, input.existing)) {
    return { action: "keep" };
  }

  const sameCoverage = !isStrictlyBetterCoverage(coverageInput, input.existing);
  if (
    sameCoverage &&
    !isFresherOrEqualValuedAt(input.valuation.valuedAt, input.existing.valuedAt)
  ) {
    return { action: "keep" };
  }

  const sameNav =
    input.valuation.navEur === input.existing.navEur &&
    (input.valuation.valuedAt ?? null) === (input.existing.valuedAt ?? null);

  if (sameCoverage && sameNav) {
    return { action: "keep" };
  }

  return {
    action: "improve",
    usability,
    navEur: input.valuation.navEur,
  };
}
