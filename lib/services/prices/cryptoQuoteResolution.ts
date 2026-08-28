import {
  type CryptoQuoteCurrency,
  type CryptoQuoteFetchPlan,
  normalizeCryptoQuoteCurrency,
} from "@/lib/services/prices/cryptoQuoteTypes";

export function buildCryptoNormalizedPair(
  baseAsset: string,
  quoteCurrency: CryptoQuoteCurrency | string,
): string {
  return `${baseAsset.trim().toUpperCase()}/${String(quoteCurrency).trim().toUpperCase()}`;
}

export function buildEodhdCryptoProviderSymbol(
  baseAsset: string,
  quoteCurrency: string,
): string {
  return `${baseAsset.trim().toUpperCase()}-${quoteCurrency.trim().toUpperCase()}.CC`;
}

export function parseEodhdCryptoProviderSymbol(
  providerSymbol: string,
): { baseAsset: string; wireQuoteCurrency: string } | null {
  const match = providerSymbol.trim().toUpperCase().match(/^([A-Z0-9]+)-([A-Z0-9]+)\.CC$/);
  if (!match) {
    return null;
  }

  return {
    baseAsset: match[1]!,
    wireQuoteCurrency: match[2]!,
  };
}

type CandidatePlan = Omit<CryptoQuoteFetchPlan, "baseAsset" | "quoteCurrency" | "normalizedPair">;

function buildPlan(
  baseAsset: string,
  quoteCurrency: CryptoQuoteCurrency,
  candidate: CandidatePlan,
): CryptoQuoteFetchPlan {
  return {
    baseAsset,
    quoteCurrency,
    normalizedPair: buildCryptoNormalizedPair(baseAsset, quoteCurrency),
    ...candidate,
  };
}

/**
 * Resolves the preferred EODHD fetch plan for a crypto pair.
 * Direct pair first; documented conversion fallbacks only when needed.
 */
export function resolveCryptoQuoteFetchPlan(
  baseAsset: string,
  requestedQuoteCurrency: string,
): CryptoQuoteFetchPlan | null {
  const normalizedBase = baseAsset.trim().toUpperCase();
  const quoteCurrency = normalizeCryptoQuoteCurrency(requestedQuoteCurrency);

  if (!normalizedBase || !quoteCurrency) {
    return null;
  }

  const directSymbol = buildEodhdCryptoProviderSymbol(normalizedBase, quoteCurrency);

  if (quoteCurrency === "USDC" || quoteCurrency === "USDT") {
    return buildPlan(normalizedBase, quoteCurrency, {
      providerSymbol: directSymbol,
      sourcePair: buildCryptoNormalizedPair(normalizedBase, quoteCurrency),
      conversionApplied: false,
      conversionPath: null,
    });
  }

  if (quoteCurrency === "USD" || quoteCurrency === "EUR") {
    return buildPlan(normalizedBase, quoteCurrency, {
      providerSymbol: directSymbol,
      sourcePair: buildCryptoNormalizedPair(normalizedBase, quoteCurrency),
      conversionApplied: false,
      conversionPath: null,
    });
  }

  if (quoteCurrency === "GBP" || quoteCurrency === "CHF" || quoteCurrency === "JPY" || quoteCurrency === "AUD" || quoteCurrency === "CAD") {
    return buildPlan(normalizedBase, quoteCurrency, {
      providerSymbol: directSymbol,
      sourcePair: buildCryptoNormalizedPair(normalizedBase, quoteCurrency),
      conversionApplied: false,
      conversionPath: null,
    });
  }

  return null;
}

export function resolveCryptoQuoteFallbackPlan(
  plan: CryptoQuoteFetchPlan,
): CryptoQuoteFetchPlan | null {
  const { baseAsset, quoteCurrency } = plan;

  if (quoteCurrency === "USDC" || quoteCurrency === "USDT") {
    return buildPlan(baseAsset, quoteCurrency, {
      providerSymbol: buildEodhdCryptoProviderSymbol(baseAsset, "USD"),
      sourcePair: buildCryptoNormalizedPair(baseAsset, "USD"),
      conversionApplied: true,
      conversionPath: `USD/${quoteCurrency}`,
    });
  }

  if (quoteCurrency === "EUR") {
    return buildPlan(baseAsset, quoteCurrency, {
      providerSymbol: buildEodhdCryptoProviderSymbol(baseAsset, "USD"),
      sourcePair: buildCryptoNormalizedPair(baseAsset, "USD"),
      conversionApplied: true,
      conversionPath: "USD/EUR",
    });
  }

  if (quoteCurrency === "USD") {
    return buildPlan(baseAsset, quoteCurrency, {
      providerSymbol: buildEodhdCryptoProviderSymbol(baseAsset, "EUR"),
      sourcePair: buildCryptoNormalizedPair(baseAsset, "EUR"),
      conversionApplied: true,
      conversionPath: "EUR/USD",
    });
  }

  return buildPlan(baseAsset, quoteCurrency, {
    providerSymbol: buildEodhdCryptoProviderSymbol(baseAsset, "USD"),
    sourcePair: buildCryptoNormalizedPair(baseAsset, "USD"),
    conversionApplied: true,
    conversionPath: `USD/${quoteCurrency}`,
  });
}

export function buildCryptoQuoteCacheKey(
  providerId: string,
  normalizedPair: string,
): string {
  return `${providerId}:crypto:${normalizedPair.trim().toUpperCase()}`;
}
