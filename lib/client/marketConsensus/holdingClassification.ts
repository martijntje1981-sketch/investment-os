import { classifyHoldingExposure } from "@/lib/services/classification/classifyHoldingExposure";
import { inferAnalystCoverageKind } from "@/lib/services/analyst/assetCoverageKind";
import { lookupInstrumentResearchProfile } from "@/lib/services/discover/instrumentResearchMetadata";
import { lookupVerifiedByProviderSymbol } from "@/lib/services/instruments/verifiedInstrumentRegistry";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

const CRYPTO_PATTERN =
  /\b(bitcoin|btc|ethereum|eth|crypto|digital asset|blockchain)\b/i;

const THEME_PATTERN =
  /\b(ai|artificial intelligence|uranium|copper|nuclear|tech(?:nology)?|clean energy|semiconductor|cyber)\b/i;

const ASSET_CLASS_PATTERN =
  /\b(gold|silver|commodit(?:y|ies)|precious metal|oil|gas|wheat|corn)\b/i;

export type MarketConsensusHoldingCategory =
  "equity" | "etf" | "crypto_etp" | "cash";

export type NotApplicableInstrumentKind = "etf" | "etp" | "etc" | "crypto";

export type MarketOutlookKind =
  "underlying_market" | "theme_level" | "asset_class";

export type MarketOutlookStatusLabel =
  "Underlying market outlook" | "Theme-level outlook" | "Asset-class outlook";

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

function holdingText(
  holding: Pick<
    StoredPortfolioHolding,
    "name" | "symbol" | "providerSymbol" | "assetType"
  >,
): string {
  const verified = lookupVerifiedByProviderSymbol(holding.providerSymbol);
  const profile = lookupInstrumentResearchProfile(holding.providerSymbol);
  const exposure = classifyHoldingExposure(holding);
  return [
    holding.name,
    holding.symbol,
    verified?.instrumentName ?? "",
    profile?.fundCategory ?? "",
    ...(profile?.sectorExposure ?? []),
    exposure.displayLabel,
    ...(exposure.researchExposure ?? []),
    exposure.fundCategory ?? "",
  ]
    .join(" ")
    .toLowerCase();
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

  const text = holdingText(holding);

  if (/\betc\b/.test(text)) {
    return "etc";
  }
  if (/\betp\b/.test(text)) {
    return "etp";
  }
  return "etf";
}

/**
 * Tiered outlook kind for funds/ETPs/crypto — never invents equity analyst ratings.
 */
export function resolveMarketOutlookKind(
  holding: Pick<
    StoredPortfolioHolding,
    "name" | "symbol" | "providerSymbol" | "assetType"
  >,
): MarketOutlookKind | null {
  if (holding.assetType === "cash") {
    return null;
  }

  if (isCryptoLinkedHolding(holding)) {
    return "asset_class";
  }

  if (inferAnalystCoverageKind(holding) !== "fund_or_etc") {
    return null;
  }

  const profile = lookupInstrumentResearchProfile(holding.providerSymbol);
  const text = holdingText(holding);
  const instrumentKind = resolveNotApplicableInstrumentKind(holding);
  const exposureGroup = classifyHoldingExposure(holding).normalizedGroupId;

  if (
    instrumentKind === "etc" ||
    exposureGroup === "crypto" ||
    ASSET_CLASS_PATTERN.test(text) ||
    /\betc\b/.test(text)
  ) {
    return "asset_class";
  }

  if (profile?.assetClass === "thematic_etf" || THEME_PATTERN.test(text)) {
    return "theme_level";
  }

  return "underlying_market";
}

export function resolveOutlookStatusLabel(
  holding: Pick<
    StoredPortfolioHolding,
    "name" | "symbol" | "providerSymbol" | "assetType"
  >,
): MarketOutlookStatusLabel | null {
  const kind = resolveMarketOutlookKind(holding);
  if (kind === "underlying_market") return "Underlying market outlook";
  if (kind === "theme_level") return "Theme-level outlook";
  if (kind === "asset_class") return "Asset-class outlook";
  return null;
}

/** @deprecated Prefer {@link resolveOutlookStatusLabel}. */
export function resolveNotApplicableStatusLabel(
  holding: Pick<
    StoredPortfolioHolding,
    "name" | "symbol" | "providerSymbol" | "assetType"
  >,
): MarketOutlookStatusLabel | null {
  return resolveOutlookStatusLabel(holding);
}
