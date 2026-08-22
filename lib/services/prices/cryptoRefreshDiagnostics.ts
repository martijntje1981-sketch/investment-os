import { resolveCryptoPriceTarget } from "@/lib/services/prices/resolveCryptoPriceTargets";
import { resolveQuotePriceTargets } from "@/lib/services/prices/resolvePriceTargets";
import type {
  HoldingPrice,
  PriceHoldingInput,
  PriceRefreshSummary,
  ResolvedPriceTarget,
} from "@/lib/services/prices/types";
import { normalizeTradingPairKey } from "@/lib/services/portfolio/cryptoPairIdentity";

export type CryptoRefreshRequestStatus =
  | "request_valid"
  | "missing_provider_symbol"
  | "missing_pair_currency"
  | "invalid_pair"
  | "not_quotable";

export type CryptoRefreshQuoteStatus =
  | "quote_received"
  | "quote_missing"
  | "provider_error"
  | "budget_blocked"
  | "cache_unavailable"
  | "malformed_quote";

export type CryptoRefreshCompatibilityResult =
  | "compatible"
  | "symbol_mismatch"
  | "pair_mismatch"
  | "asset_type_mismatch"
  | "missing_pair_identity"
  | "invalid_price";

export type CryptoRefreshApplicationResult =
  | "applied"
  | "rejected"
  | "missing_conversion"
  | "no_usable_price"
  | "preserved_existing_price";

export type CryptoRefreshCacheStatus =
  | "fresh"
  | "stale"
  | "unavailable"
  | "unknown";

/** Sanitized per-crypto diagnostic returned by PriceService (no IDs, quantities, or raw payloads). */
export type SanitizedCryptoServerDiagnostic = {
  assetType: "crypto";
  canonicalPair: string | null;
  pairCurrency: string | null;
  providerSymbol: string | null;
  requestSymbol: string | null;
  requestPairCurrency: string | null;
  requestStatus: CryptoRefreshRequestStatus;
  quoteStatus: CryptoRefreshQuoteStatus;
  quoteReceived: boolean;
  quoteSymbol: string | null;
  quoteAssetType: "crypto" | null;
  quoteNormalizedPair: string | null;
  pairPricePresent: boolean;
  pairPriceValid: boolean;
  portfolioPricePresent: boolean;
  portfolioPriceValid: boolean;
  conversionRequired: boolean;
  conversionPresent: boolean;
  change24hPresent: boolean;
  cacheStatus: CryptoRefreshCacheStatus;
};

function readRequestStatus(
  holding: PriceHoldingInput,
  target: ResolvedPriceTarget | null,
  quotable: boolean,
): CryptoRefreshRequestStatus {
  if (!quotable) {
    if (!holding.pairCurrency?.trim()) {
      return "missing_pair_currency";
    }
    if (holding.assetType === "crypto" && !target) {
      return "invalid_pair";
    }
    return "not_quotable";
  }

  if (!target?.providerSymbol?.trim()) {
    return "missing_provider_symbol";
  }

  return "request_valid";
}

function readCacheStatus(
  price: HoldingPrice | undefined,
): CryptoRefreshCacheStatus {
  if (!price?.cacheStatus) {
    return "unknown";
  }
  if (
    price.cacheStatus === "fresh" ||
    price.cacheStatus === "stale" ||
    price.cacheStatus === "unavailable"
  ) {
    return price.cacheStatus;
  }
  return "unknown";
}

function pairFromTarget(target: ResolvedPriceTarget | null): string | null {
  if (!target?.cryptoPlan?.normalizedPair) {
    return null;
  }
  return normalizeTradingPairKey(target.cryptoPlan.normalizedPair);
}

function findMatchingPrice(
  target: ResolvedPriceTarget | null,
  prices: HoldingPrice[],
): HoldingPrice | undefined {
  if (!target) {
    return undefined;
  }

  const canonicalPair = pairFromTarget(target);
  return prices.find((price) => {
    if (price.assetType === "crypto") {
      const normalizedPair = normalizeTradingPairKey(price.crypto?.normalizedPair);
      if (canonicalPair && normalizedPair === canonicalPair) {
        return true;
      }
    }

    const provider = price.providerSymbol?.trim().toUpperCase();
    const targetProvider = target.providerSymbol.trim().toUpperCase();
    return provider === targetProvider;
  });
}

function findProviderError(
  target: ResolvedPriceTarget | null,
  errors: string[],
): string | null {
  if (!target) {
    return null;
  }

  const symbol = target.symbol.trim().toUpperCase();
  const provider = target.providerSymbol.trim().toUpperCase();

  return (
    errors.find((error) => {
      const upper = error.toUpperCase();
      return upper.startsWith(`${symbol}:`) || upper.includes(provider);
    }) ?? null
  );
}

function readQuoteFields(price: HoldingPrice | undefined, quoteCurrency: string | null) {
  const pairPrice = price?.pairPrice ?? price?.crypto?.pairPrice ?? null;
  const pairPriceValid =
    typeof pairPrice === "number" && Number.isFinite(pairPrice) && pairPrice > 0;
  const portfolioPrice = price?.priceEur ?? price?.currentPrice ?? null;
  const portfolioPriceValid =
    typeof portfolioPrice === "number" &&
    Number.isFinite(portfolioPrice) &&
    portfolioPrice > 0;
  const conversionRequired = quoteCurrency != null && quoteCurrency !== "EUR";
  const conversionPresent =
    !conversionRequired || (pairPriceValid && portfolioPriceValid);

  return {
    pairPricePresent: pairPrice != null,
    pairPriceValid,
    portfolioPricePresent: portfolioPrice != null,
    portfolioPriceValid,
    conversionRequired,
    conversionPresent,
    change24hPresent:
      typeof price?.change24hPercent === "number" ||
      typeof price?.changePercent === "number",
  };
}

function classifyServerQuoteStatus(input: {
  target: ResolvedPriceTarget | null;
  price: HoldingPrice | undefined;
  providerError: string | null;
  budgetBlocked: boolean;
}): CryptoRefreshQuoteStatus {
  if (input.budgetBlocked) {
    return "budget_blocked";
  }

  if (!input.target) {
    return "quote_missing";
  }

  if (input.providerError) {
    return "provider_error";
  }

  if (!input.price) {
    return "quote_missing";
  }

  const fields = readQuoteFields(
    input.price,
    input.target.cryptoPlan?.quoteCurrency ?? null,
  );

  if (input.price.cacheStatus === "unavailable" || input.price.dataStatus === "unavailable") {
    return "cache_unavailable";
  }

  if (!fields.pairPriceValid && !fields.portfolioPriceValid) {
    return "malformed_quote";
  }

  return "quote_received";
}

/** Observes an existing PriceService refresh outcome without changing fetch behavior. */
export function buildSanitizedServerCryptoDiagnostics(
  holdings: PriceHoldingInput[],
  payload: {
    prices: HoldingPrice[];
    errors: string[];
    canAffordRefresh?: boolean;
    refreshSummary?: PriceRefreshSummary;
  },
): SanitizedCryptoServerDiagnostic[] {
  const cryptoHoldings = holdings.filter((holding) => holding.assetType === "crypto");
  if (cryptoHoldings.length === 0) {
    return [];
  }

  const { targets, errors: resolutionErrors } = resolveQuotePriceTargets(holdings);
  const cryptoTargets = targets.filter((target) => target.assetType === "crypto");
  const budgetBlocked = payload.canAffordRefresh === false;
  const allErrors = [...resolutionErrors, ...payload.errors];

  return cryptoHoldings.map((holding) => {
    const target =
      resolveCryptoPriceTarget(holding) ??
      cryptoTargets.find(
        (candidate) =>
          candidate.symbol.trim().toUpperCase() ===
          holding.symbol.trim().toUpperCase(),
      ) ??
      null;
    const quotable = Boolean(target);
    const requestStatus = readRequestStatus(holding, target, quotable);
    const price = findMatchingPrice(target, payload.prices);
    const providerError = findProviderError(target, allErrors);
    const quoteStatus = classifyServerQuoteStatus({
      target,
      price,
      providerError,
      budgetBlocked,
    });
    const quoteFields = readQuoteFields(
      price,
      target?.cryptoPlan?.quoteCurrency ??
        holding.pairCurrency?.trim().toUpperCase() ??
        null,
    );

    const canonicalPair =
      pairFromTarget(target) ??
      (holding.pairCurrency
        ? `${holding.symbol.trim().toUpperCase()}/${holding.pairCurrency.trim().toUpperCase()}`
        : null);

    return {
      assetType: "crypto",
      canonicalPair,
      pairCurrency: holding.pairCurrency?.trim().toUpperCase() ?? null,
      providerSymbol: target?.providerSymbol?.trim().toUpperCase() ?? null,
      requestSymbol: holding.symbol.trim().toUpperCase(),
      requestPairCurrency: holding.pairCurrency?.trim().toUpperCase() ?? null,
      requestStatus,
      quoteStatus,
      quoteReceived: quoteStatus === "quote_received",
      quoteSymbol: price?.symbol?.trim().toUpperCase() ?? null,
      quoteAssetType: price?.assetType === "crypto" ? "crypto" : null,
      quoteNormalizedPair:
        normalizeTradingPairKey(price?.crypto?.normalizedPair) ?? null,
      ...quoteFields,
      cacheStatus: readCacheStatus(price),
    };
  });
}
