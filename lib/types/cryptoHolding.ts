/**
 * Crypto holding types — phase 1 manual entry without live pricing.
 */

export const CRYPTO_PAIR_CURRENCIES = [
  "EUR",
  "USD",
  "USDC",
  "USDT",
  "GBP",
  "JPY",
] as const;

export type CryptoPairCurrency = (typeof CRYPTO_PAIR_CURRENCIES)[number];

export type CryptoPricingStatus =
  | "needs_review"
  | "price_unavailable"
  | "manual";

export type CryptoHoldingFields = {
  /** Quote currency for the trading pair, e.g. USDC in BTC/USDC. */
  pairCurrency: CryptoPairCurrency;
  /** Portfolio reporting currency (base). */
  portfolioCurrency: "EUR";
  pricingStatus: CryptoPricingStatus;
  /** Human-readable pair, e.g. BTC/USDC. */
  tradingPair: string;
  platform?: string | null;
  providerAssetId?: string | null;
  providerId?: string | null;
  providerName?: string | null;
  priceUpdatedAt?: string | null;
  currentManualPrice?: number | null;
  manualCurrentValue?: number | null;
  createdAt: string;
  updatedAt: string;
};

export function isCryptoPairCurrency(value: string): value is CryptoPairCurrency {
  return (CRYPTO_PAIR_CURRENCIES as readonly string[]).includes(
    value.trim().toUpperCase(),
  );
}

export function normalizeCryptoPairCurrency(value: string): CryptoPairCurrency {
  const normalized = value.trim().toUpperCase();
  if (isCryptoPairCurrency(normalized)) {
    return normalized;
  }
  return "EUR";
}

export function buildCryptoTradingPair(
  symbol: string,
  pairCurrency: CryptoPairCurrency,
): string {
  return `${symbol.trim().toUpperCase()}/${pairCurrency}`;
}

export function resolveDefaultCryptoPairCurrency(
  portfolioCurrency: "EUR" = "EUR",
): CryptoPairCurrency {
  if (isCryptoPairCurrency(portfolioCurrency)) {
    return portfolioCurrency;
  }
  return "EUR";
}
