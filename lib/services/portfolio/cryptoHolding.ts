import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";
import {
  buildCryptoTradingPair,
  normalizeCryptoPairCurrency,
  resolveDefaultCryptoPairCurrency,
  type CryptoPairCurrency,
  type CryptoPricingStatus,
} from "@/lib/types/cryptoHolding";

export type CryptoFormField =
  | "name"
  | "symbol"
  | "amount"
  | "pairCurrency"
  | "averagePurchasePrice";

export type CryptoValidationResult =
  | { ok: true }
  | {
      ok: false;
      message: string;
      fieldErrors: Partial<Record<CryptoFormField, string>>;
    };

const KNOWN_CRYPTO = [
  { symbols: ["BTC", "XBT"], name: "Bitcoin" },
  { symbols: ["ETH"], name: "Ethereum" },
  { symbols: ["SOL"], name: "Solana" },
] as const;

export function isKnownCryptoSymbol(symbol: string): boolean {
  const normalized = symbol.trim().toUpperCase();
  return KNOWN_CRYPTO.some((entry) =>
    entry.symbols.some((candidate) => candidate === normalized),
  );
}

export function recognizeKnownCrypto(input: {
  name?: string;
  symbol?: string;
}): { name: string; symbol: string } | null {
  const symbol = input.symbol?.trim().toUpperCase() ?? "";
  const name = input.name?.trim() ?? "";

  for (const entry of KNOWN_CRYPTO) {
    if ((entry.symbols as readonly string[]).includes(symbol)) {
      return { name: entry.name, symbol: entry.symbols[0]! };
    }
  }

  const normalizedName = name.toLowerCase();
  for (const entry of KNOWN_CRYPTO) {
    if (normalizedName === entry.name.toLowerCase()) {
      return { name: entry.name, symbol: entry.symbols[0]! };
    }
  }

  return null;
}

export function isCryptoHolding(
  holding: Pick<StoredPortfolioHolding, "assetType">,
): boolean {
  return holding.assetType === "crypto";
}

export function createEmptyCryptoDraft(): StoredPortfolioHolding {
  const now = new Date().toISOString();
  const portfolioCurrency = "EUR" as const;
  const pairCurrency = resolveDefaultCryptoPairCurrency(portfolioCurrency);

  return {
    id: crypto.randomUUID(),
    assetType: "crypto",
    symbol: "",
    name: "",
    quantity: 0,
    purchasePrice: 0,
    currentPrice: 0,
    currency: portfolioCurrency,
    portfolioCurrency,
    pairCurrency,
    pricingStatus: "price_unavailable",
    tradingPair: "",
    platform: null,
    createdAt: now,
    updatedAt: now,
    priceDataStatus: "unavailable",
  };
}

function isNonNegativeFinite(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

export function validateCryptoHoldingForSave(
  holding: StoredPortfolioHolding,
): CryptoValidationResult {
  const fieldErrors: Partial<Record<CryptoFormField, string>> = {};

  const name = holding.name?.trim() ?? "";
  const symbol = holding.symbol?.trim().toUpperCase() ?? "";
  const amount = Number(holding.quantity);
  const pairCurrency = holding.pairCurrency?.trim().toUpperCase() ?? "";

  if (!name) {
    fieldErrors.name = "Enter the cryptocurrency name.";
  }

  if (!symbol) {
    fieldErrors.symbol = "Enter a symbol.";
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    fieldErrors.amount = "Enter an amount greater than zero.";
  }

  if (!pairCurrency) {
    fieldErrors.pairCurrency = "Select a pair currency.";
  } else if (!normalizeCryptoPairCurrency(pairCurrency)) {
    fieldErrors.pairCurrency = "Select a supported pair currency.";
  }

  if (
    holding.purchasePrice != null &&
    holding.purchasePrice !== 0 &&
    !isNonNegativeFinite(Number(holding.purchasePrice))
  ) {
    fieldErrors.averagePurchasePrice =
      "Average purchase price must be zero or greater.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      message: "Fix the highlighted fields before saving.",
      fieldErrors,
    };
  }

  return { ok: true };
}

function resolvePricingStatus(symbol: string): CryptoPricingStatus {
  return isKnownCryptoSymbol(symbol) ? "price_unavailable" : "needs_review";
}

export function mergeHoldingOnSave(
  holdings: StoredPortfolioHolding[],
  cleaned: StoredPortfolioHolding,
): StoredPortfolioHolding[] {
  const exists = holdings.some((holding) => holding.id === cleaned.id);
  return exists
    ? holdings.map((holding) => (holding.id === cleaned.id ? cleaned : holding))
    : [...holdings, cleaned];
}

export function prepareCryptoHoldingForSave(
  holding: StoredPortfolioHolding,
): StoredPortfolioHolding {
  const now = new Date().toISOString();
  const recognized = recognizeKnownCrypto({
    name: holding.name,
    symbol: holding.symbol,
  });
  const symbol = (recognized?.symbol ?? holding.symbol).trim().toUpperCase();
  const name = (recognized?.name ?? holding.name.trim()) || symbol;
  const pairCurrency = normalizeCryptoPairCurrency(
    holding.pairCurrency ?? resolveDefaultCryptoPairCurrency("EUR"),
  ) as CryptoPairCurrency;
  const purchasePrice =
    Number.isFinite(holding.purchasePrice) && holding.purchasePrice > 0
      ? holding.purchasePrice
      : 0;

  return {
    ...holding,
    assetType: "crypto",
    symbol,
    name,
    quantity: holding.quantity,
    purchasePrice,
    currentPrice: 0,
    currency: "EUR",
    portfolioCurrency: "EUR",
    pairCurrency,
    pricingStatus: resolvePricingStatus(symbol),
    tradingPair: buildCryptoTradingPair(symbol, pairCurrency),
    platform: holding.platform?.trim() || null,
    providerAssetId: null,
    providerId: null,
    providerName: null,
    priceUpdatedAt: null,
    currentManualPrice: null,
    manualCurrentValue: null,
    priceDataStatus: "unavailable",
    providerSymbol: null,
    isin: null,
    exchange: null,
    createdAt: holding.createdAt ?? now,
    updatedAt: now,
  };
}

export function cryptoFormHasHorizontalOverflowMarkup(html: string): boolean {
  if (/\boverflow-x-auto\b/.test(html)) {
    return true;
  }

  const minWidthClasses = html.match(/\bmin-w-\[[^\]]+\]/g) ?? [];
  return minWidthClasses.some(
    (token) => token !== "min-w-[44px]" && token !== "min-w-[0]",
  );
}
