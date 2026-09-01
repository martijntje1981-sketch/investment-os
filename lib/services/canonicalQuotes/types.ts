/**
 * Server-only canonical crypto valuation contracts.
 * C2 may persist from authenticated POST /api/prices. Do not import from UI.
 * NAV capture must not read this table yet.
 *
 * Canonical EUR unit price: EUR per one crypto unit.
 * Pair price: remains in pairCurrency.
 * FX-to-EUR: the exact rate used to derive the stored EUR number.
 */

import type { CryptoQuoteCurrency } from "@/lib/services/prices/cryptoQuoteTypes";

export const CANONICAL_CRYPTO_QUOTE_WRITE_AUTHORITY = "trusted_server" as const;

export const HOLDING_CANONICAL_QUOTES_TABLE = "holding_canonical_quotes" as const;

export const CANONICAL_CRYPTO_QUOTE_PROVIDER_ID = "eodhd-quotes" as const;

export type CanonicalCryptoQuoteDataStatus = "live" | "delayed";

export type CanonicalCryptoQuotePersistStatus =
  | "created"
  | "improved"
  | "already_current"
  | "skipped_stale"
  | "skipped_invalid"
  | "forbidden"
  | "error";

export type CanonicalCryptoQuoteCandidate = {
  holdingId: string;
  canonicalEurUnitPrice: number;
  canonicalPricedAt: string;
  pairPrice: number;
  pairCurrency: CryptoQuoteCurrency;
  fxToEur: number;
  fxAt: string;
  quoteUpdatedAt: string;
  fetchedAt: string;
  providerSymbol: string;
  providerId: typeof CANONICAL_CRYPTO_QUOTE_PROVIDER_ID;
  dataStatus: CanonicalCryptoQuoteDataStatus;
  conversionPath?: string | null;
  estimateOnly: false;
  quoteKind: "crypto_market";
};

export type CanonicalCryptoQuoteRecord = CanonicalCryptoQuoteCandidate & {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
};

export type CanonicalCryptoQuoteValidationFailure =
  | "estimate_only"
  | "stale_or_unavailable"
  | "manual_price"
  | "purchase_price_fallback"
  | "missing_pair_price"
  | "missing_canonical_eur"
  | "missing_fx"
  | "missing_quote_timestamp"
  | "invalid_pair_currency"
  | "invalid_provider"
  | "client_financial_fields"
  | "eur_pair_fx_mismatch";

export type CanonicalCryptoQuoteValidation =
  | { ok: true; candidate: CanonicalCryptoQuoteCandidate }
  | {
      ok: false;
      status: "skipped_invalid";
      reason: CanonicalCryptoQuoteValidationFailure;
    };

export type PersistCanonicalCryptoQuoteResult = {
  status: CanonicalCryptoQuotePersistStatus;
  record: CanonicalCryptoQuoteRecord | null;
  message: string;
};
