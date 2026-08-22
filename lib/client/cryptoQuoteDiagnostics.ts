import {
  diagnoseQuoteCompatibility,
  resolveHoldingTradingPair,
  type CryptoQuoteRejectionReason,
} from "@/lib/client/cryptoQuoteCompatibility";
import type { PriceApiQuote, StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function readQuoteProviderSymbol(
  quote: Pick<PriceApiQuote, "providerSymbol" | "eodhdSymbol">,
): string | null {
  const value = quote.providerSymbol ?? quote.eodhdSymbol;
  return value?.trim() ? value.trim().toUpperCase() : null;
}

export type CryptoQuoteApplicationResult =
  | "applied"
  | "rejected"
  | "unavailable";

export type CryptoQuoteApplicationDiagnostic = {
  assetType: StoredPortfolioHolding["assetType"] | "crypto" | null;
  canonicalPair: string | null;
  providerSymbol: string | null;
  quoteSymbol: string | null;
  normalizedQuotePair: string | null;
  result: CryptoQuoteApplicationResult;
  rejectionReason: CryptoQuoteRejectionReason | null;
  hasPairPrice: boolean;
  hasConversion: boolean;
  cacheOrProviderSource: string | null;
};

function readPairPrice(quote: PriceApiQuote | null | undefined): number | null {
  return typeof quote?.pairPrice === "number" && quote.pairPrice > 0
    ? quote.pairPrice
    : null;
}

function readConvertedPrice(quote: PriceApiQuote | null | undefined): number | null {
  if (!quote) {
    return null;
  }

  const priceEur =
    typeof quote.priceEur === "number" && quote.priceEur > 0
      ? quote.priceEur
      : typeof quote.currentPrice === "number" && quote.currentPrice > 0
        ? quote.currentPrice
        : null;

  return priceEur;
}

/** Privacy-safe quote compatibility diagnostic for tests and optional debug traces. */
export function buildCryptoQuoteApplicationDiagnostic(
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
): CryptoQuoteApplicationDiagnostic {
  const canonicalPair = resolveHoldingTradingPair(holding);
  const compatibility = diagnoseQuoteCompatibility(holding, quote);
  const hasPairPrice = readPairPrice(quote) != null;
  const hasConversion = readConvertedPrice(quote) != null;

  if (!quote) {
    return {
      assetType: holding.assetType ?? null,
      canonicalPair,
      providerSymbol: holding.providerSymbol?.trim().toUpperCase() ?? null,
      quoteSymbol: null,
      normalizedQuotePair: null,
      result: "unavailable",
      rejectionReason: compatibility.reason,
      hasPairPrice: false,
      hasConversion: false,
      cacheOrProviderSource: null,
    };
  }

  if (compatibility.compatible) {
    return {
      assetType: quote.assetType ?? holding.assetType ?? null,
      canonicalPair,
      providerSymbol:
        holding.providerSymbol?.trim().toUpperCase() ??
        readQuoteProviderSymbol(quote),
      quoteSymbol: quote.symbol?.trim().toUpperCase() ?? null,
      normalizedQuotePair: quote.normalizedPair?.trim().toUpperCase() ?? null,
      result: "applied",
      rejectionReason: null,
      hasPairPrice,
      hasConversion,
      cacheOrProviderSource:
        quote.providerDisplayName ?? quote.provider ?? null,
    };
  }

  return {
    assetType: quote.assetType ?? holding.assetType ?? null,
    canonicalPair,
    providerSymbol:
      holding.providerSymbol?.trim().toUpperCase() ??
      readQuoteProviderSymbol(quote),
    quoteSymbol: quote.symbol?.trim().toUpperCase() ?? null,
    normalizedQuotePair: quote.normalizedPair?.trim().toUpperCase() ?? null,
    result: hasPairPrice || hasConversion ? "rejected" : "unavailable",
    rejectionReason: compatibility.reason,
    hasPairPrice,
    hasConversion,
    cacheOrProviderSource:
      quote.providerDisplayName ?? quote.provider ?? null,
  };
}
