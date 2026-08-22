/**
 * Normalized crypto quote metadata flowing through PriceService.
 */

export const CRYPTO_QUOTE_CURRENCIES = [
  "EUR",
  "USD",
  "GBP",
  "CHF",
  "JPY",
  "AUD",
  "CAD",
  "USDC",
  "USDT",
] as const;

export type CryptoQuoteCurrency = (typeof CRYPTO_QUOTE_CURRENCIES)[number];

export function isCryptoQuoteCurrency(value: string): value is CryptoQuoteCurrency {
  return (CRYPTO_QUOTE_CURRENCIES as readonly string[]).includes(
    value.trim().toUpperCase(),
  );
}

export function normalizeCryptoQuoteCurrency(value: string): CryptoQuoteCurrency | null {
  const normalized = value.trim().toUpperCase();
  return isCryptoQuoteCurrency(normalized) ? normalized : null;
}

export type CryptoQuoteFetchPlan = {
  baseAsset: string;
  quoteCurrency: CryptoQuoteCurrency;
  normalizedPair: string;
  providerSymbol: string;
  sourcePair: string;
  conversionApplied: boolean;
  conversionPath: string | null;
};

export type CryptoQuoteMetadata = {
  assetType: "crypto";
  baseAsset: string;
  quoteCurrency: CryptoQuoteCurrency;
  normalizedPair: string;
  pairPrice: number | null;
  change24hPercent: number | null;
  sourcePair: string | null;
  conversionApplied: boolean;
  conversionPath: string | null;
  providerId: string;
  providerDisplayName: string;
  fetchedAt: string;
  unavailableReason: string | null;
};

export const EODHD_CRYPTO_PROVIDER_DISPLAY_NAME = "EODHD";
