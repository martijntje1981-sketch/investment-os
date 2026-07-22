import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

export type HoldingDisplayPriceSource =
  | "live"
  | "estimated"
  | "unavailable";

export type HoldingDisplayPrice = {
  price: number | null;
  source: HoldingDisplayPriceSource;
};

export function resolveHoldingDisplayPrice(
  holding: Pick<
    StoredPortfolioHolding,
    "assetType" | "currentPrice" | "purchasePrice" | "priceDataStatus"
  >,
): HoldingDisplayPrice {
  if (holding.assetType === "cash") {
    const price =
      Number.isFinite(holding.currentPrice) && holding.currentPrice > 0
        ? holding.currentPrice
        : 1;
    return { price, source: "live" };
  }

  if (Number.isFinite(holding.currentPrice) && holding.currentPrice > 0) {
    const source =
      holding.priceDataStatus === "unavailable" ? "estimated" : "live";
    return { price: holding.currentPrice, source };
  }

  if (Number.isFinite(holding.purchasePrice) && holding.purchasePrice > 0) {
    return { price: holding.purchasePrice, source: "estimated" };
  }

  return { price: null, source: "unavailable" };
}

export function isEstimatedHoldingPrice(
  holding: Pick<
    StoredPortfolioHolding,
    "assetType" | "currentPrice" | "purchasePrice" | "priceDataStatus"
  >,
): boolean {
  return resolveHoldingDisplayPrice(holding).source === "estimated";
}
