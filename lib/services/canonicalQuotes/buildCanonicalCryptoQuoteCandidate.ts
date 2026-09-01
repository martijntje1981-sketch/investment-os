/**
 * Map an internally produced PriceService crypto quote + this request's FX
 * into an explicit CanonicalCryptoQuoteCandidate.
 * Do not spread HoldingPrice, request-body holdings, or client financial fields.
 * Does not call providers or FX.
 */

import {
  buildCryptoFxRates,
  quoteCurrencyToEurRate,
  type CryptoFxRates,
} from "@/lib/services/prices/cryptoFxRates";
import {
  normalizeCryptoQuoteCurrency,
  type CryptoQuoteCurrency,
} from "@/lib/services/prices/cryptoQuoteTypes";
import type { HoldingPrice, PricePayload } from "@/lib/services/prices/types";
import { CANONICAL_CRYPTO_QUOTE_PROVIDER_ID } from "@/lib/services/canonicalQuotes/types";
import type { CanonicalCryptoQuoteCandidate } from "@/lib/services/canonicalQuotes/types";

export type CanonicalCandidateBuildFailure =
  | "not_crypto"
  | "listed_holding"
  | "estimate_only"
  | "stale_or_unavailable"
  | "manual_price"
  | "purchase_price_fallback"
  | "cache_only"
  | "missing_pair_price"
  | "missing_fx"
  | "missing_quote_timestamp"
  | "invalid_pair_currency"
  | "invalid_provider"
  | "eur_pair_fx_mismatch"
  | "missing_holding_id";

export type CanonicalCandidateBuildResult =
  | { ok: true; candidate: CanonicalCryptoQuoteCandidate }
  | { ok: false; reason: CanonicalCandidateBuildFailure };

export function mapPayloadFxToCryptoFxRates(
  fxRates: PricePayload["fxRates"],
): CryptoFxRates {
  return buildCryptoFxRates({
    EUR: fxRates.EUR ?? 1,
    USD: fxRates.USD_TO_EUR,
    GBP: fxRates.GBP_TO_EUR,
    CHF: fxRates.CHF_TO_EUR,
  });
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function readIsoTimestamp(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) return null;
  return new Date(ms).toISOString();
}

function exactFxToEur(
  pairCurrency: CryptoQuoteCurrency,
  fx: CryptoFxRates,
): number | null {
  if (pairCurrency === "EUR") return 1;
  const rate = quoteCurrencyToEurRate(pairCurrency, fx);
  if (rate == null || !Number.isFinite(rate) || rate <= 0) return null;
  return rate;
}

export function buildCanonicalCryptoQuoteCandidate(input: {
  holdingId: string;
  price: HoldingPrice;
  fxRates: PricePayload["fxRates"];
  fxAt: string;
  quoteSource?: PricePayload["quoteSource"];
  estimateOnly?: boolean;
}): CanonicalCandidateBuildResult {
  const holdingId = input.holdingId.trim();
  if (!holdingId) {
    return { ok: false, reason: "missing_holding_id" };
  }

  if (input.estimateOnly === true) {
    return { ok: false, reason: "estimate_only" };
  }

  if (input.quoteSource === "cache") {
    return { ok: false, reason: "cache_only" };
  }

  if (input.price.assetType === "investment") {
    return { ok: false, reason: "listed_holding" };
  }

  const crypto = input.price.crypto;
  if (input.price.assetType !== "crypto" || !crypto || crypto.assetType !== "crypto") {
    return { ok: false, reason: "not_crypto" };
  }

  if (input.price.isStale === true) {
    return { ok: false, reason: "stale_or_unavailable" };
  }

  const dataStatus = input.price.dataStatus;
  if (dataStatus !== "live" && dataStatus !== "delayed") {
    return { ok: false, reason: "stale_or_unavailable" };
  }

  if (
    input.price.cacheStatus === "stale" ||
    input.price.cacheStatus === "unavailable"
  ) {
    return { ok: false, reason: "stale_or_unavailable" };
  }

  if (crypto.unavailableReason) {
    return { ok: false, reason: "stale_or_unavailable" };
  }

  const pairCurrency = normalizeCryptoQuoteCurrency(crypto.quoteCurrency);
  if (!pairCurrency) {
    return { ok: false, reason: "invalid_pair_currency" };
  }

  const pairPrice = crypto.pairPrice;
  if (!isPositiveNumber(pairPrice)) {
    return { ok: false, reason: "missing_pair_price" };
  }

  const fx = mapPayloadFxToCryptoFxRates(input.fxRates);
  const fxToEur = exactFxToEur(pairCurrency, fx);
  if (fxToEur == null) {
    return { ok: false, reason: "missing_fx" };
  }
  if (pairCurrency === "EUR" && fxToEur !== 1) {
    return { ok: false, reason: "eur_pair_fx_mismatch" };
  }

  const providerId = crypto.providerId.trim().toLowerCase();
  if (providerId !== CANONICAL_CRYPTO_QUOTE_PROVIDER_ID) {
    return { ok: false, reason: "invalid_provider" };
  }

  const providerSymbol = (
    input.price.providerSymbol || crypto.normalizedPair
  )
    .trim()
    .toUpperCase();
  if (!providerSymbol) {
    return { ok: false, reason: "invalid_provider" };
  }

  const quoteUpdatedAt = readIsoTimestamp(input.price.updatedAt);
  const fetchedAt = readIsoTimestamp(crypto.fetchedAt) ?? readIsoTimestamp(input.price.fetchedAt);
  const fxAt = readIsoTimestamp(input.fxAt);
  if (!quoteUpdatedAt || !fetchedAt || !fxAt) {
    return { ok: false, reason: "missing_quote_timestamp" };
  }

  const canonicalEurUnitPrice = pairPrice * fxToEur;
  if (!isPositiveNumber(canonicalEurUnitPrice)) {
    return { ok: false, reason: "missing_pair_price" };
  }

  const conversionPath =
    typeof crypto.conversionPath === "string" && crypto.conversionPath.trim()
      ? crypto.conversionPath.trim()
      : null;

  const candidate: CanonicalCryptoQuoteCandidate = {
    holdingId,
    canonicalEurUnitPrice,
    canonicalPricedAt: quoteUpdatedAt,
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
