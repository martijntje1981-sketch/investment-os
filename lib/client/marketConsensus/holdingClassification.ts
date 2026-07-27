import { inferAnalystCoverageKind } from "@/lib/services/analyst/assetCoverageKind";
import { lookupVerifiedByProviderSymbol } from "@/lib/services/instruments/verifiedInstrumentRegistry";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

const CRYPTO_PATTERN =
  /\b(bitcoin|btc|ethereum|eth|crypto|digital asset|blockchain)\b/i;

export type MarketConsensusHoldingCategory =
  | "equity"
  | "etf"
  | "crypto_etp"
  | "cash";

export type NotApplicableInstrumentKind = "etf" | "etp" | "etc" | "crypto";

export function isCryptoLinkedHolding(
  holding: Pick<
    StoredPortfolioHolding,
    "name" | "symbol" | "providerSymbol" | "assetType"
  >,
): boolean {
  if (holding.assetType === "cash") {
    return false;
  }

  if (holding.assetType === "crypto") {
    return true;
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

/** Company equities only — matches eodhdMarketConsensusProvider.supports(). */
export function isConsensusEligibleHolding(
  holding: Pick<
    StoredPortfolioHolding,
    "name" | "symbol" | "providerSymbol" | "assetType"
  >,
): boolean {
  if (holding.assetType === "cash" || holding.assetType === "crypto") {
    return false;
  }
  if (isCryptoLinkedHolding(holding)) {
    return false;
  }
  return inferAnalystCoverageKind(holding) === "company";
}

/**
 * Best-effort ETF/ETP/ETC/crypto label from existing name + verified metadata.
 * Does not invent precision when the type cannot be distinguished.
 */
export function resolveNotApplicableInstrumentKind(
  holding: Pick<
    StoredPortfolioHolding,
    "name" | "symbol" | "providerSymbol" | "assetType"
  >,
): NotApplicableInstrumentKind | null {
  if (holding.assetType === "cash") {
    return null;
  }

  if (isCryptoLinkedHolding(holding)) {
    return "crypto";
  }

  if (inferAnalystCoverageKind(holding) !== "fund_or_etc") {
    return null;
  }

  const verified = lookupVerifiedByProviderSymbol(holding.providerSymbol);
  const text =
    `${holding.name} ${holding.symbol} ${verified?.instrumentName ?? ""}`.toLowerCase();

  if (/\betc\b/.test(text)) {
    return "etc";
  }
  if (/\betp\b/.test(text)) {
    return "etp";
  }
  return "etf";
}

export function resolveNotApplicableStatusLabel(
  holding: Pick<
    StoredPortfolioHolding,
    "name" | "symbol" | "providerSymbol" | "assetType"
  >,
):
  | "Not applicable — ETF"
  | "Not applicable — ETP"
  | "Not applicable — ETC"
  | "Not applicable — crypto"
  | null {
  const kind = resolveNotApplicableInstrumentKind(holding);
  if (kind === "crypto") return "Not applicable — crypto";
  if (kind === "etp") return "Not applicable — ETP";
  if (kind === "etc") return "Not applicable — ETC";
  if (kind === "etf") return "Not applicable — ETF";
  return null;
}
