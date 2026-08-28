import {
  normalizeTradingPairKey,
  resolveCanonicalCryptoPair,
  tradingPairsEquivalent,
} from "@/lib/services/portfolio/cryptoPairIdentity";
import { isCryptoHolding } from "@/lib/services/portfolio/cryptoHolding";
import type { PriceApiQuote, StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

export type CryptoQuoteRejectionReason =
  | "asset_mismatch"
  | "base_symbol_mismatch"
  | "pair_mismatch"
  | "provider_symbol_mismatch"
  | "missing_price"
  | "malformed_quote"
  | "no_quote";

function normalizePortfolioSymbol(value: unknown): string {
  return String(value ?? "").trim().toUpperCase();
}

export function resolveHoldingTradingPair(
  holding: Pick<
    StoredPortfolioHolding,
    "symbol" | "pairCurrency" | "tradingPair"
  >,
): string | null {
  const canonical = resolveCanonicalCryptoPair(holding);
  if (canonical) {
    return canonical.tradingPair;
  }

  return (
    normalizeTradingPairKey(holding.tradingPair) ??
    (holding.pairCurrency
      ? normalizeTradingPairKey(
          `${holding.symbol.trim().toUpperCase()}/${holding.pairCurrency.trim().toUpperCase()}`,
        )
      : null)
  );
}

export function diagnoseQuoteCompatibility(
  holding: Pick<
    StoredPortfolioHolding,
    | "symbol"
    | "providerSymbol"
    | "isin"
    | "assetType"
    | "pairCurrency"
    | "tradingPair"
  >,
  quote: PriceApiQuote | null | undefined,
): { compatible: boolean; reason: CryptoQuoteRejectionReason | null } {
  if (!quote) {
    return { compatible: false, reason: "no_quote" };
  }

  const holdingIsCrypto =
    holding.assetType === "crypto" || quote.assetType === "crypto";

  if (holdingIsCrypto) {
    if (holding.assetType !== "crypto" && quote.assetType === "crypto") {
      return { compatible: false, reason: "asset_mismatch" };
    }
    if (holding.assetType === "crypto" && quote.assetType && quote.assetType !== "crypto") {
      return { compatible: false, reason: "asset_mismatch" };
    }

    const holdingPair = resolveHoldingTradingPair(holding);
    const quotePair = normalizeTradingPairKey(quote.normalizedPair);

    if (holdingPair && quotePair) {
      if (!tradingPairsEquivalent(holdingPair, quotePair)) {
        return { compatible: false, reason: "pair_mismatch" };
      }
    } else if (holding.pairCurrency?.trim() || quotePair) {
      return { compatible: false, reason: "pair_mismatch" };
    } else if (
      normalizePortfolioSymbol(holding.symbol) !==
      normalizePortfolioSymbol(quote.symbol)
    ) {
      return { compatible: false, reason: "base_symbol_mismatch" };
    }

    const pairPrice =
      typeof quote.pairPrice === "number" && quote.pairPrice > 0
        ? quote.pairPrice
        : null;
    const priceEur =
      typeof quote.priceEur === "number" && quote.priceEur > 0
        ? quote.priceEur
        : typeof quote.currentPrice === "number" && quote.currentPrice > 0
          ? quote.currentPrice
          : null;

    if (!pairPrice || !priceEur) {
      return { compatible: false, reason: "missing_price" };
    }

    return { compatible: true, reason: null };
  }

  const holdingProvider = holding.providerSymbol?.trim()
    ? normalizePortfolioSymbol(holding.providerSymbol)
    : null;
  const quoteProvider = quote.providerSymbol?.trim()
    ? normalizePortfolioSymbol(quote.providerSymbol)
    : quote.eodhdSymbol?.trim()
      ? normalizePortfolioSymbol(quote.eodhdSymbol)
      : null;

  if (holdingProvider) {
    if (!quoteProvider || holdingProvider !== quoteProvider) {
      return { compatible: false, reason: "provider_symbol_mismatch" };
    }
  }

  const priceEur =
    typeof quote.priceEur === "number" && quote.priceEur > 0
      ? quote.priceEur
      : typeof quote.currentPrice === "number" && quote.currentPrice > 0
        ? quote.currentPrice
        : null;

  if (!priceEur) {
    return { compatible: false, reason: "missing_price" };
  }

  if (
    quoteProvider &&
    normalizePortfolioSymbol(holding.symbol) !==
      normalizePortfolioSymbol(quote.symbol)
  ) {
    return { compatible: false, reason: "base_symbol_mismatch" };
  }

  return { compatible: true, reason: null };
}

export function isValidApplicableQuote(
  holding: StoredPortfolioHolding,
  quote: PriceApiQuote,
): boolean {
  return diagnoseQuoteCompatibility(holding, quote).compatible;
}

export function hasReliableHoldingMarketPrice(
  holding: StoredPortfolioHolding,
): boolean {
  if (holding.assetType === "cash") {
    return Number.isFinite(holding.quantity) && holding.quantity >= 0;
  }

  if (isCryptoHolding(holding)) {
    return (
      typeof holding.currentPairPrice === "number" &&
      holding.currentPairPrice > 0 &&
      typeof holding.currentPrice === "number" &&
      holding.currentPrice > 0
    );
  }

  return (
    typeof holding.currentPrice === "number" &&
    Number.isFinite(holding.currentPrice) &&
    holding.currentPrice > 0
  );
}
