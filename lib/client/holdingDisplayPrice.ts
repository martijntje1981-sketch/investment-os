import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";
import { isCryptoHolding } from "@/lib/services/portfolio/cryptoHolding";

export type HoldingDisplayPriceSource =
  | "live"
  | "delayed"
  | "last_session"
  | "estimated"
  | "unavailable";

export type HoldingPriceTrustStatus = HoldingDisplayPriceSource;

export type HoldingDisplayPrice = {
  price: number | null;
  source: HoldingDisplayPriceSource;
  quoteCurrency?: string | null;
};

function mapPriceDataStatusToDisplaySource(
  status: string | null | undefined,
): HoldingDisplayPriceSource {
  if (status === "live") return "live";
  if (status === "delayed") return "delayed";
  if (status === "stale") return "last_session";
  if (status === "unavailable") return "unavailable";
  // A usable provider price without status is last-session, never live or estimated.
  return "last_session";
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
      source: mapped === "unavailable" ? "unavailable" : mapped,
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
    // Cash is book value, not a guessed market quote.
    return { price, source: "live" };
  }

  if (isCryptoHolding(holding)) {
    return resolveCryptoDisplayPrice(holding);
  }

  if (Number.isFinite(holding.currentPrice) && holding.currentPrice > 0) {
    const mapped = mapPriceDataStatusToDisplaySource(holding.priceDataStatus);
    return {
      price: holding.currentPrice,
      source: mapped === "unavailable" ? "last_session" : mapped,
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

export function resolveHoldingPriceTrustStatus(
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
): HoldingPriceTrustStatus {
  return resolveHoldingDisplayPrice(holding).source;
}

/** Scan-friendly badge next to a value. Last-session and live have no badge. */
export function holdingPriceTrustBadgeLabel(
  status: HoldingPriceTrustStatus,
): string | null {
  if (status === "estimated") return "Estimated";
  if (status === "delayed") return "Delayed";
  return null;
}

export function holdingPriceTrustCaption(
  status: HoldingPriceTrustStatus,
): string | null {
  if (status === "unavailable") return "Price unavailable";
  if (status === "delayed") return "Delayed";
  if (status === "estimated") return "Estimated";
  if (status === "live") return null;
  if (status === "last_session") return "Last session";
  return null;
}

/** Holding-page / detail language. Never calls last-session or delayed "Live". */
export function holdingPriceStatusUserLabel(
  status: HoldingPriceTrustStatus,
): string {
  if (status === "unavailable") return "Price unavailable";
  if (status === "estimated") return "Estimated";
  if (status === "delayed") return "Delayed";
  if (status === "last_session") return "Last session";
  return "Current";
}

export function holdingValueUnavailableLabel(
  holding: Pick<StoredPortfolioHolding, "assetType">,
): string {
  return isCryptoHolding(holding) ? "Value unavailable" : "Price unavailable";
}
