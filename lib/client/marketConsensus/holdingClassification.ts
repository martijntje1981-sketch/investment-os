import { inferAnalystCoverageKind } from "@/lib/services/analyst/assetCoverageKind";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

const CRYPTO_PATTERN =
  /\b(bitcoin|btc|ethereum|eth|crypto|digital asset|blockchain)\b/i;

export type MarketConsensusHoldingCategory =
  | "equity"
  | "etf"
  | "crypto_etp"
  | "cash";

export function isCryptoLinkedHolding(
  holding: Pick<
    StoredPortfolioHolding,
    "name" | "symbol" | "providerSymbol" | "assetType"
  >,
): boolean {
  if (holding.assetType === "cash") {
    return false;
  }

  const providerSymbol = String(holding.providerSymbol ?? "");
  if (/\.CC$/i.test(providerSymbol) || /-USD\.CC$/i.test(providerSymbol)) {
    return true;
  }

  const label = `${holding.name} ${holding.symbol} ${providerSymbol}`;
  return CRYPTO_PATTERN.test(label);
}

export function classifyMarketConsensusHolding(
  holding: Pick<
    StoredPortfolioHolding,
    "name" | "symbol" | "providerSymbol" | "assetType"
  >,
): MarketConsensusHoldingCategory {
  if (holding.assetType === "cash") {
    return "cash";
  }

  if (isCryptoLinkedHolding(holding)) {
    return "crypto_etp";
  }

  if (inferAnalystCoverageKind(holding) === "fund_or_etc") {
    return "etf";
  }

  return "equity";
}
