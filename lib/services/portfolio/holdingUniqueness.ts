import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";
import { resolveRemoteHoldingId } from "@/lib/services/portfolio/idempotency";

export type HoldingUniqueKey = {
  assetType: "cash" | "investment";
  symbol: string;
  currency: string;
};

/** Stable string identity for one instrument slot in a portfolio. */
export function holdingIdentityKey(holding: StoredPortfolioHolding): string {
  const key = holdingUniqueKey(holding);
  return `${key.assetType}:${key.symbol}:${key.currency}`;
}

/**
 * Deterministic holding primary key for cloud sync.
 * Same user + same instrument slot always resolves to the same UUID,
 * regardless of import row id or retry count.
 */
export function resolveHoldingIdForSync(
  userId: string,
  holding: StoredPortfolioHolding,
): string {
  return resolveRemoteHoldingId(userId, holdingIdentityKey(holding));
}

/** Natural key for active holdings — matches partial unique indexes in Postgres. */
export function holdingUniqueKey(
  holding: StoredPortfolioHolding,
): HoldingUniqueKey {
  const assetType = holding.assetType === "cash" ? "cash" : "investment";
  const currency = String(holding.currency ?? "EUR").toUpperCase();

  return {
    assetType,
    currency,
    symbol:
      assetType === "cash"
        ? currency
        : String(holding.symbol).trim().toUpperCase(),
  };
}
