import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";
import {
  buildCryptoTradingPair,
  normalizeCryptoPairCurrency,
  type CryptoPairCurrency,
  type CryptoPricingStatus,
} from "@/lib/types/cryptoHolding";

export type CryptoHoldingMetadata = {
  pairCurrency: CryptoPairCurrency;
  portfolioCurrency: "EUR";
  pricingStatus: CryptoPricingStatus;
  tradingPair: string;
  providerSymbol?: string | null;
  platform?: string | null;
  providerAssetId?: string | null;
  providerId?: string | null;
  providerName?: string | null;
  priceUpdatedAt?: string | null;
  currentManualPrice?: number | null;
  manualCurrentValue?: number | null;
};

function readOptionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readOptionalNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function buildCryptoHoldingMetadata(
  holding: StoredPortfolioHolding,
): CryptoHoldingMetadata {
  const pairCurrency = normalizeCryptoPairCurrency(
    holding.pairCurrency ?? "EUR",
  );
  const symbol = String(holding.symbol ?? "")
    .trim()
    .toUpperCase();

  return {
    pairCurrency,
    portfolioCurrency: "EUR",
    pricingStatus: holding.pricingStatus ?? "needs_review",
    tradingPair:
      holding.tradingPair?.trim() ||
      buildCryptoTradingPair(symbol, pairCurrency),
    providerSymbol: readOptionalString(holding.providerSymbol),
    platform: readOptionalString(holding.platform),
    providerAssetId: readOptionalString(holding.providerAssetId),
    providerId: readOptionalString(holding.providerId),
    providerName: readOptionalString(holding.providerName),
    priceUpdatedAt: readOptionalString(holding.priceUpdatedAt),
    currentManualPrice: readOptionalNumber(holding.currentManualPrice),
    manualCurrentValue: readOptionalNumber(holding.manualCurrentValue),
  };
}

export function parseCryptoHoldingMetadata(
  metadata: unknown,
): CryptoHoldingMetadata | null {
  if (!metadata || typeof metadata !== "object") return null;

  const record = metadata as Record<string, unknown>;
  const pairCurrency = normalizeCryptoPairCurrency(
    String(record.pairCurrency ?? "EUR"),
  );
  const pricingStatus = String(record.pricingStatus ?? "needs_review");
  const normalizedPricingStatus: CryptoPricingStatus =
    pricingStatus === "manual" ||
    pricingStatus === "price_unavailable" ||
    pricingStatus === "needs_review"
      ? pricingStatus
      : "needs_review";

  return {
    pairCurrency,
    portfolioCurrency: "EUR",
    pricingStatus: normalizedPricingStatus,
    tradingPair:
      readOptionalString(record.tradingPair) ??
      buildCryptoTradingPair("?", pairCurrency),
    providerSymbol: readOptionalString(record.providerSymbol),
    platform: readOptionalString(record.platform),
    providerAssetId: readOptionalString(record.providerAssetId),
    providerId: readOptionalString(record.providerId),
    providerName: readOptionalString(record.providerName),
    priceUpdatedAt: readOptionalString(record.priceUpdatedAt),
    currentManualPrice: readOptionalNumber(record.currentManualPrice),
    manualCurrentValue: readOptionalNumber(record.manualCurrentValue),
  };
}

export function applyCryptoMetadataToStoredHolding(
  holding: StoredPortfolioHolding,
  metadata: CryptoHoldingMetadata,
): StoredPortfolioHolding {
  return {
    ...holding,
    pairCurrency: metadata.pairCurrency,
    portfolioCurrency: metadata.portfolioCurrency,
    pricingStatus: metadata.pricingStatus,
    tradingPair: metadata.tradingPair,
    providerSymbol: metadata.providerSymbol ?? holding.providerSymbol ?? null,
    platform: metadata.platform ?? null,
    providerAssetId: metadata.providerAssetId ?? null,
    providerId: metadata.providerId ?? null,
    providerName: metadata.providerName ?? null,
    priceUpdatedAt: metadata.priceUpdatedAt ?? null,
    currentManualPrice: metadata.currentManualPrice ?? null,
    manualCurrentValue: metadata.manualCurrentValue ?? null,
    priceDataStatus: "unavailable",
    currentPrice: 0,
  };
}
