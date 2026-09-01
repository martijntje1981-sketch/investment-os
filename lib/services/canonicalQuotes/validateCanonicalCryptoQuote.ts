/**
 * Pure validation for internally produced canonical crypto quotes.
 * Rejects estimate/stale/manual/purchase/client financial payloads.
 * Does not write. Does not call providers.
 */

import {
  isCryptoQuoteCurrency,
  normalizeCryptoQuoteCurrency,
} from "@/lib/services/prices/cryptoQuoteTypes";
import {
  CANONICAL_CRYPTO_QUOTE_PROVIDER_ID,
  type CanonicalCryptoQuoteCandidate,
  type CanonicalCryptoQuoteDataStatus,
  type CanonicalCryptoQuoteValidation,
} from "@/lib/services/canonicalQuotes/types";

const CLIENT_FINANCIAL_KEYS = [
  "purchasePrice",
  "average_cost",
  "currentManualPrice",
  "manualCurrentValue",
  "last_market_price",
  "lastMarketPrice",
  "currentPrice",
  "priceEur",
] as const;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function readString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readPositiveNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 ? value : null;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }
  return null;
}

function readIsoTimestamp(value: unknown): string | null {
  const raw = readString(value);
  if (!raw) return null;
  const ms = Date.parse(raw);
  if (!Number.isFinite(ms)) return null;
  return new Date(ms).toISOString();
}

function hasClientFinancialFields(record: Record<string, unknown>): boolean {
  return CLIENT_FINANCIAL_KEYS.some((key) => key in record);
}

function isDataStatus(value: unknown): value is CanonicalCryptoQuoteDataStatus {
  return value === "live" || value === "delayed";
}

export function validateCanonicalCryptoQuoteCandidate(
  input: unknown,
): CanonicalCryptoQuoteValidation {
  const record = asRecord(input);
  if (!record) {
    return { ok: false, status: "skipped_invalid", reason: "client_financial_fields" };
  }

  if (record.estimateOnly === true || record.estimateOnly === "true") {
    return { ok: false, status: "skipped_invalid", reason: "estimate_only" };
  }

  const quoteKind = readString(record.quoteKind);
  const source = readString(record.source);

  if (
    record.pricingStatus === "manual" ||
    quoteKind === "manual" ||
    source === "manual"
  ) {
    return { ok: false, status: "skipped_invalid", reason: "manual_price" };
  }

  if (
    quoteKind === "purchase" ||
    source === "purchase" ||
    source === "purchase_price"
  ) {
    return { ok: false, status: "skipped_invalid", reason: "purchase_price_fallback" };
  }

  if (quoteKind !== "crypto_market") {
    return { ok: false, status: "skipped_invalid", reason: "client_financial_fields" };
  }

  if (record.estimateOnly !== false) {
    return { ok: false, status: "skipped_invalid", reason: "estimate_only" };
  }

  const dataStatus = record.dataStatus;
  if (dataStatus === "stale" || dataStatus === "unavailable") {
    return { ok: false, status: "skipped_invalid", reason: "stale_or_unavailable" };
  }
  if (!isDataStatus(dataStatus)) {
    return { ok: false, status: "skipped_invalid", reason: "stale_or_unavailable" };
  }

  if (hasClientFinancialFields(record)) {
    return { ok: false, status: "skipped_invalid", reason: "client_financial_fields" };
  }

  const holdingId = readString(record.holdingId);
  const canonicalEurUnitPrice = readPositiveNumber(record.canonicalEurUnitPrice);
  const pairPrice = readPositiveNumber(record.pairPrice);
  const fxToEur = readPositiveNumber(record.fxToEur);
  const pairCurrencyRaw = readString(record.pairCurrency);
  const pairCurrency = pairCurrencyRaw
    ? normalizeCryptoQuoteCurrency(pairCurrencyRaw)
    : null;
  const providerSymbol = readString(record.providerSymbol)?.toUpperCase() ?? null;
  const providerId = readString(record.providerId)?.toLowerCase() ?? null;
  const canonicalPricedAt = readIsoTimestamp(record.canonicalPricedAt);
  const fxAt = readIsoTimestamp(record.fxAt);
  const quoteUpdatedAt = readIsoTimestamp(record.quoteUpdatedAt);
  const fetchedAt = readIsoTimestamp(record.fetchedAt);
  const conversionPath = readString(record.conversionPath);

  if (!holdingId) {
    return { ok: false, status: "skipped_invalid", reason: "client_financial_fields" };
  }
  if (canonicalEurUnitPrice == null) {
    return { ok: false, status: "skipped_invalid", reason: "missing_canonical_eur" };
  }
  if (pairPrice == null) {
    return { ok: false, status: "skipped_invalid", reason: "missing_pair_price" };
  }
  if (fxToEur == null || fxAt == null) {
    return { ok: false, status: "skipped_invalid", reason: "missing_fx" };
  }
  if (quoteUpdatedAt == null || fetchedAt == null || canonicalPricedAt == null) {
    return { ok: false, status: "skipped_invalid", reason: "missing_quote_timestamp" };
  }
  if (!pairCurrency || !isCryptoQuoteCurrency(pairCurrency)) {
    return { ok: false, status: "skipped_invalid", reason: "invalid_pair_currency" };
  }
  if (
    !providerSymbol ||
    providerId !== CANONICAL_CRYPTO_QUOTE_PROVIDER_ID
  ) {
    return { ok: false, status: "skipped_invalid", reason: "invalid_provider" };
  }

  if (pairCurrency === "EUR" && fxToEur !== 1) {
    return { ok: false, status: "skipped_invalid", reason: "eur_pair_fx_mismatch" };
  }

  const candidate: CanonicalCryptoQuoteCandidate = {
    holdingId,
    canonicalEurUnitPrice,
    canonicalPricedAt,
    pairPrice,
    pairCurrency,
    fxToEur,
    fxAt,
    quoteUpdatedAt,
    fetchedAt,
    providerSymbol,
    providerId: CANONICAL_CRYPTO_QUOTE_PROVIDER_ID,
    dataStatus,
    conversionPath,
    estimateOnly: false,
    quoteKind: "crypto_market",
  };

  return { ok: true, candidate };
}

export function isNewerCanonicalQuote(
  next: Pick<CanonicalCryptoQuoteCandidate, "quoteUpdatedAt" | "fetchedAt">,
  existing: Pick<CanonicalCryptoQuoteCandidate, "quoteUpdatedAt" | "fetchedAt">,
): boolean {
  const nextQuote = Date.parse(next.quoteUpdatedAt);
  const existingQuote = Date.parse(existing.quoteUpdatedAt);
  if (nextQuote !== existingQuote) return nextQuote > existingQuote;
  return Date.parse(next.fetchedAt) > Date.parse(existing.fetchedAt);
}

export function isSameCanonicalQuoteIdentity(
  next: CanonicalCryptoQuoteCandidate,
  existing: CanonicalCryptoQuoteCandidate,
): boolean {
  return (
    next.quoteUpdatedAt === existing.quoteUpdatedAt &&
    next.fetchedAt === existing.fetchedAt &&
    next.canonicalEurUnitPrice === existing.canonicalEurUnitPrice &&
    next.pairPrice === existing.pairPrice &&
    next.pairCurrency === existing.pairCurrency &&
    next.fxToEur === existing.fxToEur
  );
}
