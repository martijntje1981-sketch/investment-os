import {
  parseCompactCryptoPairSymbol,
  parseTradingPairText,
  resolveCanonicalCryptoPair,
} from "@/lib/services/portfolio/cryptoPairIdentity";
import { resolveCryptoQuoteFetchPlan } from "@/lib/services/prices/cryptoQuoteResolution";
import {
  isLivePricedCryptoBaseAsset,
  isValidCryptoBaseAssetSymbol,
  recognizeKnownCrypto,
} from "@/lib/services/portfolio/cryptoBaseAssetRegistry";
import {
  buildCryptoTradingPair,
  normalizeCryptoPairCurrency,
  type CryptoPairCurrency,
} from "@/lib/types/cryptoHolding";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

export type LegacyCryptoMigrationReviewReason =
  | "ambiguous_crypto_identity"
  | "unsupported_pair"
  | "unsupported_base_asset";

export type LegacyCryptoMigrationResult = {
  holding: StoredPortfolioHolding;
  migrated: boolean;
  reviewReason: LegacyCryptoMigrationReviewReason | null;
  repairedFields: string[];
};

function isEquityLikeHolding(holding: StoredPortfolioHolding): boolean {
  if (holding.assetType === "cash" || holding.assetType === "crypto") {
    return false;
  }

  return Boolean(
    holding.isin?.trim() ||
      (holding.providerSymbol?.trim() &&
        !holding.providerSymbol.trim().toUpperCase().endsWith(".CC")),
  );
}

function looksLikeLegacyCryptoCandidate(holding: StoredPortfolioHolding): boolean {
  if (holding.assetType === "crypto") {
    return true;
  }

  if (holding.assetType === "cash" || isEquityLikeHolding(holding)) {
    return false;
  }

  if (holding.providerSymbol?.trim().toUpperCase().endsWith(".CC")) {
    return true;
  }

  if (parseTradingPairText(holding.tradingPair)) {
    return true;
  }

  if (parseCompactCryptoPairSymbol(String(holding.symbol ?? ""))) {
    return true;
  }

  return recognizeKnownCrypto({
    symbol: holding.symbol,
    name: holding.name,
  }) != null;
}

function isModernCanonicalCrypto(holding: StoredPortfolioHolding): boolean {
  if (holding.assetType !== "crypto") {
    return false;
  }

  const canonical = resolveCanonicalCryptoPair(holding);
  if (!canonical) {
    return false;
  }

  const usesSlashTradingPair =
    !holding.tradingPair?.trim() || holding.tradingPair.includes("/");
  const hasProviderSymbol = Boolean(holding.providerSymbol?.trim());

  return (
    holding.symbol.trim().toUpperCase() === canonical.base &&
    normalizeCryptoPairCurrency(String(holding.pairCurrency ?? "")) ===
      canonical.quote &&
    normalizeTradingPairLabel(holding.tradingPair) === canonical.tradingPair &&
    usesSlashTradingPair &&
    (!isLivePricedCryptoBaseAsset(canonical.base) || hasProviderSymbol)
  );
}

function normalizeTradingPairLabel(value: string | null | undefined): string | null {
  const parsed = parseTradingPairText(value);
  if (!parsed) {
    return value?.trim().toUpperCase() ?? null;
  }
  return buildCryptoTradingPair(parsed.base, parsed.quote);
}

function mergeCryptoMetadataFields(
  holding: StoredPortfolioHolding,
  canonical: { base: string; quote: CryptoPairCurrency; tradingPair: string },
  repairedFields: string[],
): StoredPortfolioHolding {
  let next = holding;

  if (next.assetType !== "crypto") {
    next = { ...next, assetType: "crypto" };
    repairedFields.push("assetType");
  }

  if (next.symbol.trim().toUpperCase() !== canonical.base) {
    next = { ...next, symbol: canonical.base };
    repairedFields.push("symbol");
  }

  const recognized = recognizeKnownCrypto({
    symbol: canonical.base,
    name: next.name,
  });
  const resolvedName =
    recognized?.name ?? (next.name.trim() || canonical.base);
  if (next.name.trim() !== resolvedName) {
    next = { ...next, name: resolvedName };
    repairedFields.push("name");
  }

  if (normalizeCryptoPairCurrency(String(next.pairCurrency ?? "")) !== canonical.quote) {
    next = { ...next, pairCurrency: canonical.quote };
    repairedFields.push("pairCurrency");
  }

  if (next.tradingPair?.trim() !== canonical.tradingPair) {
    next = { ...next, tradingPair: canonical.tradingPair };
    repairedFields.push("tradingPair");
  }

  if (next.portfolioCurrency !== "EUR") {
    next = { ...next, portfolioCurrency: "EUR", currency: "EUR" };
    repairedFields.push("portfolioCurrency");
  }

  const providerSymbol = isLivePricedCryptoBaseAsset(canonical.base)
    ? resolveCryptoQuoteFetchPlan(canonical.base, canonical.quote)?.providerSymbol ??
      null
    : null;

  if (providerSymbol && next.providerSymbol !== providerSymbol) {
    next = { ...next, providerSymbol };
    repairedFields.push("providerSymbol");
  }

  if (providerSymbol && !next.providerId) {
    next = {
      ...next,
      providerId: "eodhd-quotes",
      providerName: next.providerName ?? "EODHD",
      providerDisplayName: next.providerDisplayName ?? "EODHD",
    };
    repairedFields.push("providerId");
  }

  if (
    next.pricingStatus == null ||
    (next.pricingStatus === "needs_review" && isLivePricedCryptoBaseAsset(canonical.base))
  ) {
    next = { ...next, pricingStatus: "price_unavailable" };
    repairedFields.push("pricingStatus");
  }

  return next;
}

export function migrateLegacyCryptoHolding(
  holding: StoredPortfolioHolding,
): LegacyCryptoMigrationResult {
  if (holding.assetType === "cash" || isEquityLikeHolding(holding)) {
    return {
      holding,
      migrated: false,
      reviewReason: null,
      repairedFields: [],
    };
  }

  if (isModernCanonicalCrypto(holding)) {
    return {
      holding,
      migrated: false,
      reviewReason: null,
      repairedFields: [],
    };
  }

  if (!looksLikeLegacyCryptoCandidate(holding)) {
    return {
      holding,
      migrated: false,
      reviewReason: null,
      repairedFields: [],
    };
  }

  const canonical = resolveCanonicalCryptoPair(holding);
  if (!canonical) {
    return {
      holding,
      migrated: false,
      reviewReason: "ambiguous_crypto_identity",
      repairedFields: [],
    };
  }

  if (!isValidCryptoBaseAssetSymbol(canonical.base)) {
    return {
      holding,
      migrated: false,
      reviewReason: "unsupported_base_asset",
      repairedFields: [],
    };
  }

  if (!isLivePricedCryptoBaseAsset(canonical.base)) {
    const repairedFields: string[] = [];
    const migratedHolding = mergeCryptoMetadataFields(
      holding,
      canonical,
      repairedFields,
    );
    return {
      holding: {
        ...migratedHolding,
        pricingStatus: "needs_review",
      },
      migrated: repairedFields.length > 0,
      reviewReason: repairedFields.length > 0 ? "unsupported_pair" : null,
      repairedFields,
    };
  }

  const repairedFields: string[] = [];
  const migratedHolding = mergeCryptoMetadataFields(
    holding,
    canonical,
    repairedFields,
  );

  return {
    holding: migratedHolding,
    migrated: repairedFields.length > 0,
    reviewReason: null,
    repairedFields,
  };
}

export function migrateLegacyCryptoHoldings(
  holdings: StoredPortfolioHolding[],
): {
  holdings: StoredPortfolioHolding[];
  migratedCount: number;
  migratedHoldingIds: string[];
} {
  let migratedCount = 0;
  const migratedHoldingIds: string[] = [];

  const next = holdings.map((holding) => {
    const result = migrateLegacyCryptoHolding(holding);
    if (result.migrated) {
      migratedCount += 1;
      migratedHoldingIds.push(holding.id);
    }
    return result.holding;
  });

  return { holdings: next, migratedCount, migratedHoldingIds };
}

export function cryptoMetadataRepairChanged(
  before: StoredPortfolioHolding,
  after: StoredPortfolioHolding,
): boolean {
  const fields: Array<keyof StoredPortfolioHolding> = [
    "assetType",
    "symbol",
    "name",
    "pairCurrency",
    "tradingPair",
    "providerSymbol",
    "providerId",
    "providerName",
    "providerDisplayName",
    "pricingStatus",
    "portfolioCurrency",
  ];

  return fields.some((field) => before[field] !== after[field]);
}
