import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";
import { isUuid, resolveRemoteHoldingId } from "@/lib/services/portfolio/idempotency";
import { isCryptoHolding } from "@/lib/services/portfolio/cryptoHolding";

export type HoldingUniqueKey = {
  assetType: "cash" | "investment" | "crypto";
  symbol: string;
  currency: string;
};

/** Stable string identity for one instrument slot in a portfolio. */
export function holdingIdentityKey(holding: StoredPortfolioHolding): string {
  if (isCryptoHolding(holding)) {
    return `crypto:id:${holding.id}`;
  }

  const key = holdingUniqueKey(holding);
  return `${key.assetType}:${key.symbol}:${key.currency}`;
}

/**
 * Deterministic holding primary key for cloud sync.
 * Crypto uses its stable client UUID as the primary identity when no
 * portfolio is supplied (legacy single-book). When `portfolioId` is set,
 * the id is scoped so the same asset can exist independently in another book.
 */
export function resolveHoldingIdForSync(
  userId: string,
  holding: StoredPortfolioHolding,
  portfolioId?: string | null,
): string {
  if (isCryptoHolding(holding) && isUuid(holding.id)) {
    if (portfolioId) {
      return resolveRemoteHoldingId(
        userId,
        `crypto:id:${holding.id.toLowerCase()}:portfolio:${portfolioId}`,
      );
    }
    return holding.id.toLowerCase();
  }

  const slot = holdingIdentityKey(holding);
  if (portfolioId) {
    return resolveRemoteHoldingId(userId, `${slot}:portfolio:${portfolioId}`);
  }
  return resolveRemoteHoldingId(userId, slot);
}

/** A cloud holding row may be reused only when it already belongs to the target book. */
export function canReuseHoldingForPortfolio(
  existingPortfolioId: string | null | undefined,
  targetPortfolioId: string,
): boolean {
  return Boolean(
    existingPortfolioId && existingPortfolioId === targetPortfolioId,
  );
}

/** Natural key for active holdings — matches partial unique indexes in Postgres. */
export function holdingUniqueKey(
  holding: StoredPortfolioHolding,
): HoldingUniqueKey {
  if (holding.assetType === "cash") {
    const currency = String(holding.currency ?? "EUR").toUpperCase();
    return {
      assetType: "cash",
      currency,
      symbol: currency,
    };
  }

  if (isCryptoHolding(holding)) {
    const currency = String(
      holding.portfolioCurrency ?? holding.currency ?? "EUR",
    ).toUpperCase();
    return {
      assetType: "crypto",
      currency,
      symbol: String(holding.symbol).trim().toUpperCase(),
    };
  }

  const currency = String(holding.currency ?? "EUR").toUpperCase();

  return {
    assetType: "investment",
    currency,
    symbol: String(holding.symbol).trim().toUpperCase(),
  };
}
