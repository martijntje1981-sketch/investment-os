import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";
import { isCryptoHolding } from "@/lib/services/portfolio/cryptoHolding";

export type HoldingDisplayPriceSource =
  | "live"
  | "estimated"
  | "unavailable";

export type HoldingDisplayPrice = {
  price: number | null;
  source: HoldingDisplayPriceSource;
  quoteCurrency?: string | null;
};

function mapPriceDataStatusToDisplaySource(
  status: string | null | undefined,
): HoldingDisplayPriceSource {
  if (status === "live") return "live";
  if (status === "delayed" || status === "stale") return "estimated";
  if (status === "unavailable") return "unavailable";
  // Unknown / missing status must not imply live.
  return "estimated";
}

function resolveCryptoDisplayPrice(
  holding: Pick<
    StoredPortfolioHolding,
    | "currentPrice"
    | "currentPairPrice"
    | "pairCurrency"
    | "priceDataStatus"
    | "pricingStatus"
    | "currentManualPrice"
    | "manualCurrentValue"
    | "quantity"
  >,
): HoldingDisplayPrice {
  const pairPrice =
    typeof holding.currentPairPrice === "number" && holding.currentPairPrice > 0
      ? holding.currentPairPrice
      : null;

  if (pairPrice != null) {
    const mapped = mapPriceDataStatusToDisplaySource(holding.priceDataStatus);
    return {
      price: pairPrice,
      source: mapped === "unavailable" ? "estimated" : mapped,
      quoteCurrency: holding.pairCurrency ?? null,
    };
  }

  if (holding.pricingStatus === "manual") {
    const currentManualPrice = holding.currentManualPrice;
    if (
      typeof currentManualPrice === "number" &&
      Number.isFinite(currentManualPrice) &&
      currentManualPrice > 0
    ) {
      return { price: currentManualPrice, source: "estimated" };
    }

    const manualCurrentValue = holding.manualCurrentValue;
    if (
      typeof manualCurrentValue === "number" &&
      Number.isFinite(manualCurrentValue) &&
      manualCurrentValue > 0 &&
      Number.isFinite(holding.quantity) &&
      holding.quantity > 0
    ) {
      return {
        price: manualCurrentValue / holding.quantity,
        source: "estimated",
      };
    }
  }

  return { price: null, source: "unavailable", quoteCurrency: holding.pairCurrency ?? null };
}

export function resolveHoldingDisplayPrice(
  holding: Pick<
    StoredPortfolioHolding,
    | "assetType"
    | "currentPrice"
    | "currentPairPrice"
    | "pairCurrency"
    | "purchasePrice"
    | "priceDataStatus"
    | "pricingStatus"
    | "currentManualPrice"
    | "manualCurrentValue"
    | "quantity"
  >,
): HoldingDisplayPrice {
  if (holding.assetType === "cash") {
    const price =
      Number.isFinite(holding.currentPrice) && holding.currentPrice > 0
        ? holding.currentPrice
        : 1;
    // Cash is book value, not a live market quote.
    return { price, source: "estimated" };
  }

  if (isCryptoHolding(holding)) {
    return resolveCryptoDisplayPrice(holding);
  }

  if (Number.isFinite(holding.currentPrice) && holding.currentPrice > 0) {
    const mapped = mapPriceDataStatusToDisplaySource(holding.priceDataStatus);
    return {
      price: holding.currentPrice,
      source: mapped === "unavailable" ? "estimated" : mapped,
    };
  }

  if (Number.isFinite(holding.purchasePrice) && holding.purchasePrice > 0) {
    return { price: holding.purchasePrice, source: "estimated" };
  }

  return { price: null, source: "unavailable" };
}

export function isEstimatedHoldingPrice(
  holding: Pick<
    StoredPortfolioHolding,
    | "assetType"
    | "currentPrice"
    | "purchasePrice"
    | "priceDataStatus"
    | "pricingStatus"
    | "currentManualPrice"
    | "manualCurrentValue"
    | "quantity"
  >,
): boolean {
  return resolveHoldingDisplayPrice(holding).source === "estimated";
}

export function holdingValueUnavailableLabel(
  holding: Pick<StoredPortfolioHolding, "assetType">,
): string {
  return isCryptoHolding(holding) ? "Value unavailable" : "Price unavailable";
}
