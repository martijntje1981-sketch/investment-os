/**
 * Portfolio valuation coverage — count + known-value materiality.
 * Exact allocation/performance conclusions require complete coverage.
 */

import {
  getHoldingMarketValue,
  type AnalysisHolding,
} from "@/lib/client/portfolioAnalysis";
import { resolveHoldingDisplayPrice } from "@/lib/client/holdingDisplayPrice";

export type ValuationCoverageStatus = "complete" | "partial" | "incomplete";

export type PortfolioValuationCoverage = {
  status: ValuationCoverageStatus;
  pricedHoldingCount: number;
  materialHoldingCount: number;
  missingHoldingCount: number;
  missingKnownValueShare: number | null;
  allowsValuationConclusions: boolean;
  coverageMessage: string | null;
};

const PARTIAL_MISSING_COUNT_SHARE_MAX = 0.2;
const PARTIAL_MISSING_VALUE_SHARE_MAX = 0.05;

function isMaterialInvestment(holding: AnalysisHolding): boolean {
  return holding.assetType !== "cash" && Number.isFinite(holding.quantity) && holding.quantity > 0;
}

export function holdingHasCurrentMarketQuote(holding: AnalysisHolding): boolean {
  if (!isMaterialInvestment(holding)) {
    return false;
  }

  if (holding.priceDataStatus === "unavailable" || holding.priceDataStatus === "stale") {
    return false;
  }

  const display = resolveHoldingDisplayPrice(holding);
  if (display.price == null || display.price <= 0) {
    return false;
  }

  return (
    display.source === "live" ||
    display.source === "delayed" ||
    display.source === "last_session"
  );
}

function knownValueProxy(holding: AnalysisHolding): number | null {
  const liveValue = getHoldingMarketValue(holding);
  if (liveValue != null && liveValue > 0) {
    return liveValue;
  }

  if (
    Number.isFinite(holding.quantity) &&
    holding.quantity > 0 &&
    Number.isFinite(holding.purchasePrice) &&
    holding.purchasePrice > 0
  ) {
    return holding.quantity * holding.purchasePrice;
  }

  return null;
}

export function resolvePortfolioValuationCoverage(
  holdings: AnalysisHolding[],
): PortfolioValuationCoverage {
  const material = holdings.filter(isMaterialInvestment);
  const priced = material.filter(holdingHasCurrentMarketQuote);
  const missing = material.filter((holding) => !holdingHasCurrentMarketQuote(holding));

  const pricedHoldingCount = priced.length;
  const materialHoldingCount = material.length;
  const missingHoldingCount = missing.length;

  if (materialHoldingCount === 0) {
    return {
      status: "complete",
      pricedHoldingCount: 0,
      materialHoldingCount: 0,
      missingHoldingCount: 0,
      missingKnownValueShare: 0,
      allowsValuationConclusions: true,
      coverageMessage: null,
    };
  }

  const incompleteMessage = `Portfolio coverage incomplete — ${pricedHoldingCount} of ${materialHoldingCount} holdings currently priced.`;

  if (missingHoldingCount === 0) {
    return {
      status: "complete",
      pricedHoldingCount,
      materialHoldingCount,
      missingHoldingCount: 0,
      missingKnownValueShare: 0,
      allowsValuationConclusions: true,
      coverageMessage: null,
    };
  }

  const pricedValue = priced.reduce((sum, holding) => sum + (knownValueProxy(holding) ?? 0), 0);
  const missingProxies = missing.map(knownValueProxy);
  const missingHasUnknown = missingProxies.some((value) => value == null);
  const missingValue = missingProxies.reduce<number>(
    (sum, value) => sum + (value ?? 0),
    0,
  );
  const knownTotal = pricedValue + missingValue;
  const missingKnownValueShare =
    !missingHasUnknown && knownTotal > 0 ? missingValue / knownTotal : null;

  const missingCountShare = missingHoldingCount / materialHoldingCount;
  const partialUsable =
    !missingHasUnknown &&
    missingKnownValueShare != null &&
    missingCountShare <= PARTIAL_MISSING_COUNT_SHARE_MAX &&
    missingKnownValueShare <= PARTIAL_MISSING_VALUE_SHARE_MAX;

  if (partialUsable) {
    return {
      status: "partial",
      pricedHoldingCount,
      materialHoldingCount,
      missingHoldingCount,
      missingKnownValueShare,
      allowsValuationConclusions: true,
      coverageMessage: `${missingHoldingCount} holding${missingHoldingCount === 1 ? "" : "s"} excluded until market prices are available.`,
    };
  }

  return {
    status: "incomplete",
    pricedHoldingCount,
    materialHoldingCount,
    missingHoldingCount,
    missingKnownValueShare,
    allowsValuationConclusions: false,
    coverageMessage: incompleteMessage,
  };
}
