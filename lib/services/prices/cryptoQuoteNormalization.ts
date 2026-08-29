import {
  resolveMarketDataStatus,
  parseMarketNumber,
} from "@/lib/services/prices/marketQuote";
import type { ProviderRawQuote, ResolvedPriceTarget } from "@/lib/services/prices/types";
import type { CryptoQuoteFetchPlan } from "@/lib/services/prices/cryptoQuoteTypes";
import {
  EODHD_CRYPTO_PROVIDER_DISPLAY_NAME,
  type CryptoQuoteMetadata,
} from "@/lib/services/prices/cryptoQuoteTypes";
import {
  convertPairPriceToQuoteCurrency,
  pairPriceToEurPerUnit,
  type CryptoFxRates,
} from "@/lib/services/prices/cryptoFxRates";
import { parseEodhdCryptoProviderSymbol } from "@/lib/services/prices/cryptoQuoteResolution";
import { EODHD_QUOTE_PROVIDER_ID } from "@/lib/services/instruments/eodhdQuoteGuard";
import type { NormalizedProviderQuote } from "@/lib/services/prices/types";

export function normalizeCryptoProviderQuote(input: {
  target: ResolvedPriceTarget;
  plan: CryptoQuoteFetchPlan;
  raw: ProviderRawQuote;
  fx: CryptoFxRates;
  fetchedAt?: string;
}): NormalizedProviderQuote & { crypto: CryptoQuoteMetadata } {
  const parsed = parseEodhdCryptoProviderSymbol(input.raw.providerSymbol);
  const wireQuoteCurrency =
    parsed?.wireQuoteCurrency ??
    input.raw.wireCurrency ??
    input.raw.originalCurrency;

  const converted = convertPairPriceToQuoteCurrency({
    wirePrice: input.raw.originalPrice,
    wireQuoteCurrency: String(wireQuoteCurrency),
    requestedQuoteCurrency: input.plan.quoteCurrency,
    fx: input.fx,
  });

  const pairPrice = converted.pairPrice;
  const priceEur =
    pairPrice != null
      ? pairPriceToEurPerUnit(pairPrice, input.plan.quoteCurrency, input.fx)
      : null;

  const parsedChange = parseMarketNumber(input.raw.changePercentOriginal);
  const change24hPercent =
    parsedChange != null && Number.isFinite(parsedChange) ? parsedChange : null;

  const updatedAt = input.raw.updatedAt ?? new Date().toISOString();
  const fetchedAt = input.fetchedAt ?? new Date().toISOString();
  const unavailableReason =
    pairPrice == null || priceEur == null
      ? `Live quote unavailable for ${input.plan.normalizedPair}.`
      : null;

  const dataStatus = resolveMarketDataStatus(updatedAt, pairPrice != null && priceEur != null);

  const crypto: CryptoQuoteMetadata = {
    assetType: "crypto",
    baseAsset: input.plan.baseAsset,
    quoteCurrency: input.plan.quoteCurrency,
    normalizedPair: input.plan.normalizedPair,
    pairPrice,
    change24hPercent,
    sourcePair: input.plan.sourcePair,
    conversionApplied: converted.conversionApplied || input.plan.conversionApplied,
    conversionPath: converted.conversionPath ?? input.plan.conversionPath,
    providerId: EODHD_QUOTE_PROVIDER_ID,
    providerDisplayName: EODHD_CRYPTO_PROVIDER_DISPLAY_NAME,
    fetchedAt,
    unavailableReason,
  };

  return {
    symbol: input.target.symbol,
    providerSymbol: input.target.providerSymbol,
    currentPrice: priceEur,
    previousClose: null,
    change: null,
    changePercent: change24hPercent,
    currency: input.plan.quoteCurrency,
    marketStatus: "24h",
    updatedAt,
    provider: "eodhd",
    isStale: false,
    unavailableReason,
    dataStatus,
    cacheStatus: unavailableReason ? "unavailable" : "fresh",
    crypto,
  };
}

export function buildUnavailableCryptoQuote(
  target: ResolvedPriceTarget,
  plan: CryptoQuoteFetchPlan,
  reason: string,
): NormalizedProviderQuote & { crypto: CryptoQuoteMetadata } {
  const fetchedAt = new Date().toISOString();

  const crypto: CryptoQuoteMetadata = {
    assetType: "crypto",
    baseAsset: plan.baseAsset,
    quoteCurrency: plan.quoteCurrency,
    normalizedPair: plan.normalizedPair,
    pairPrice: null,
    change24hPercent: null,
    sourcePair: plan.sourcePair,
    conversionApplied: plan.conversionApplied,
    conversionPath: plan.conversionPath,
    providerId: EODHD_QUOTE_PROVIDER_ID,
    providerDisplayName: EODHD_CRYPTO_PROVIDER_DISPLAY_NAME,
    fetchedAt,
    unavailableReason: reason,
  };

  return {
    symbol: target.symbol,
    providerSymbol: target.providerSymbol,
    currentPrice: null,
    previousClose: null,
    change: null,
    changePercent: null,
    currency: plan.quoteCurrency,
    marketStatus: null,
    updatedAt: null,
    provider: "eodhd",
    isStale: false,
    unavailableReason: reason,
    dataStatus: "unavailable",
    cacheStatus: "unavailable",
    crypto,
  };
}
