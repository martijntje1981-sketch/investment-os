/**
 * Trusted-server persistence for canonical crypto valuations.
 *
 * C2 calls this after a successful authenticated POST /api/prices, mapping the
 * internally produced crypto quote + FX snapshot into a CanonicalCryptoQuoteCandidate
 * (do not spread the API body or HoldingPrice object). Do not fetch EODHD again.
 * Do not persist from cache, localStorage, metadata priceUpdatedAt, manual, or
 * purchase prices.
 *
 * Ownership is loaded from the database. Browser-supplied user/holding/price/FX
 * claims are ignored. service_role is used only after identity and access checks.
 */

import { parseCryptoHoldingMetadata } from "@/lib/services/portfolio/cryptoDbMetadata";
import { buildEodhdCryptoProviderSymbol } from "@/lib/services/prices/cryptoQuoteResolution";
import { normalizeCryptoQuoteCurrency } from "@/lib/services/prices/cryptoQuoteTypes";
import {
  isNewerCanonicalQuote,
  isSameCanonicalQuoteIdentity,
  validateCanonicalCryptoQuoteCandidate,
} from "@/lib/services/canonicalQuotes/validateCanonicalCryptoQuote";
import {
  CANONICAL_CRYPTO_QUOTE_WRITE_AUTHORITY,
  HOLDING_CANONICAL_QUOTES_TABLE,
  type CanonicalCryptoQuoteCandidate,
  type CanonicalCryptoQuotePersistStatus,
  type CanonicalCryptoQuoteRecord,
  type PersistCanonicalCryptoQuoteResult,
} from "@/lib/services/canonicalQuotes/types";

export { CANONICAL_CRYPTO_QUOTE_WRITE_AUTHORITY };

export type CanonicalQuoteClient = {
  from: (table: string) => unknown;
};

export type PersistCanonicalCryptoQuoteInput = {
  client: CanonicalQuoteClient;
  authority: typeof CANONICAL_CRYPTO_QUOTE_WRITE_AUTHORITY;
  userId: string;
  holdingId: string;
  candidate: unknown;
};

type DbCryptoHoldingRow = {
  id: string;
  user_id: string;
  asset_type: string;
  symbol: string;
  metadata: unknown;
  deleted_at: string | null;
};

type CanonicalQuoteRow = {
  id: string;
  holding_id: string;
  user_id: string;
  canonical_eur_unit_price: number | string;
  canonical_priced_at: string;
  pair_price: number | string;
  pair_currency: string;
  fx_to_eur: number | string;
  fx_at: string;
  quote_updated_at: string;
  fetched_at: string;
  provider_symbol: string;
  provider_id: string;
  data_status: "live" | "delayed";
  conversion_path: string | null;
  created_at: string;
  updated_at: string;
};

type QueryResult = {
  data: unknown;
  error: { code?: string; message?: string } | null;
};

type FilterBuilder = {
  select: (columns: string) => FilterBuilder;
  eq: (column: string, value: string) => FilterBuilder;
  is: (column: string, value: null) => FilterBuilder;
  insert: (value: Record<string, unknown>) => FilterBuilder;
  update: (value: Record<string, unknown>) => FilterBuilder;
  maybeSingle: () => Promise<QueryResult>;
};

export type PersistCanonicalCryptoQuoteDeps = {
  loadOwnedHolding: (
    client: CanonicalQuoteClient,
    userId: string,
    holdingId: string,
  ) => Promise<DbCryptoHoldingRow | null>;
  loadExistingQuote: (
    client: CanonicalQuoteClient,
    holdingId: string,
    userId: string,
  ) => Promise<CanonicalCryptoQuoteRecord | null>;
  insertQuote: (
    client: CanonicalQuoteClient,
    row: Record<string, unknown>,
  ) => Promise<CanonicalCryptoQuoteRecord | null>;
  updateQuote: (
    client: CanonicalQuoteClient,
    id: string,
    userId: string,
    holdingId: string,
    row: Record<string, unknown>,
  ) => Promise<CanonicalCryptoQuoteRecord | null>;
};

function table(client: CanonicalQuoteClient, name: string): FilterBuilder {
  return client.from(name) as FilterBuilder;
}

function result(
  status: CanonicalCryptoQuotePersistStatus,
  record: CanonicalCryptoQuoteRecord | null,
  message: string,
): PersistCanonicalCryptoQuoteResult {
  return { status, record, message };
}

function toNumber(value: number | string): number {
  return Number(value);
}

export function mapCanonicalQuoteRow(row: CanonicalQuoteRow): CanonicalCryptoQuoteRecord {
  return {
    id: row.id,
    userId: row.user_id,
    holdingId: row.holding_id,
    canonicalEurUnitPrice: toNumber(row.canonical_eur_unit_price),
    canonicalPricedAt: row.canonical_priced_at,
    pairPrice: toNumber(row.pair_price),
    pairCurrency: normalizeCryptoQuoteCurrency(row.pair_currency) ?? "USD",
    fxToEur: toNumber(row.fx_to_eur),
    fxAt: row.fx_at,
    quoteUpdatedAt: row.quote_updated_at,
    fetchedAt: row.fetched_at,
    providerSymbol: row.provider_symbol,
    providerId: "eodhd-quotes",
    dataStatus: row.data_status,
    conversionPath: row.conversion_path,
    estimateOnly: false,
    quoteKind: "crypto_market",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function quoteInsertPayload(
  userId: string,
  candidate: CanonicalCryptoQuoteCandidate,
): Record<string, unknown> {
  return {
    holding_id: candidate.holdingId,
    user_id: userId,
    canonical_eur_unit_price: candidate.canonicalEurUnitPrice,
    canonical_priced_at: candidate.canonicalPricedAt,
    pair_price: candidate.pairPrice,
    pair_currency: candidate.pairCurrency,
    fx_to_eur: candidate.fxToEur,
    fx_at: candidate.fxAt,
    quote_updated_at: candidate.quoteUpdatedAt,
    fetched_at: candidate.fetchedAt,
    provider_symbol: candidate.providerSymbol,
    provider_id: candidate.providerId,
    data_status: candidate.dataStatus,
    conversion_path: candidate.conversionPath ?? null,
  };
}

function persistedProviderSymbol(
  row: DbCryptoHoldingRow,
): string | null {
  const metadata = parseCryptoHoldingMetadata(row.metadata);
  const fromMetadata = metadata?.providerSymbol?.trim().toUpperCase() ?? null;
  if (fromMetadata) return fromMetadata;
  const pair = metadata?.pairCurrency
    ? normalizeCryptoQuoteCurrency(metadata.pairCurrency)
    : null;
  const symbol = String(row.symbol ?? "").trim().toUpperCase();
  if (!symbol || !pair) return null;
  return buildEodhdCryptoProviderSymbol(symbol, pair);
}

function persistedPairCurrency(row: DbCryptoHoldingRow): string | null {
  const metadata = parseCryptoHoldingMetadata(row.metadata);
  if (!metadata?.pairCurrency) return null;
  return normalizeCryptoQuoteCurrency(metadata.pairCurrency);
}

async function defaultLoadOwnedHolding(
  client: CanonicalQuoteClient,
  userId: string,
  holdingId: string,
): Promise<DbCryptoHoldingRow | null> {
  const { data, error } = await table(client, "holdings")
    .select("id, user_id, asset_type, symbol, metadata, deleted_at")
    .eq("id", holdingId)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw new Error(error.message || "Could not load holding.");
  return (data as DbCryptoHoldingRow | null) ?? null;
}

async function defaultLoadExistingQuote(
  client: CanonicalQuoteClient,
  holdingId: string,
  userId: string,
): Promise<CanonicalCryptoQuoteRecord | null> {
  const { data, error } = await table(client, HOLDING_CANONICAL_QUOTES_TABLE)
    .select("*")
    .eq("holding_id", holdingId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message || "Could not load canonical quote.");
  return data ? mapCanonicalQuoteRow(data as CanonicalQuoteRow) : null;
}

async function defaultInsertQuote(
  client: CanonicalQuoteClient,
  row: Record<string, unknown>,
): Promise<CanonicalCryptoQuoteRecord | null> {
  const { data, error } = await table(client, HOLDING_CANONICAL_QUOTES_TABLE)
    .insert(row)
    .select("*")
    .maybeSingle();
  if (error) throw new Error(error.message || "Could not insert canonical quote.");
  return data ? mapCanonicalQuoteRow(data as CanonicalQuoteRow) : null;
}

async function defaultUpdateQuote(
  client: CanonicalQuoteClient,
  id: string,
  userId: string,
  holdingId: string,
  row: Record<string, unknown>,
): Promise<CanonicalCryptoQuoteRecord | null> {
  const { data, error } = await table(client, HOLDING_CANONICAL_QUOTES_TABLE)
    .update(row)
    .eq("id", id)
    .eq("user_id", userId)
    .eq("holding_id", holdingId)
    .select("*")
    .maybeSingle();
  if (error) throw new Error(error.message || "Could not update canonical quote.");
  return data ? mapCanonicalQuoteRow(data as CanonicalQuoteRow) : null;
}

const defaultDeps: PersistCanonicalCryptoQuoteDeps = {
  loadOwnedHolding: defaultLoadOwnedHolding,
  loadExistingQuote: defaultLoadExistingQuote,
  insertQuote: defaultInsertQuote,
  updateQuote: defaultUpdateQuote,
};

export async function persistCanonicalCryptoQuote(
  input: PersistCanonicalCryptoQuoteInput,
  deps: PersistCanonicalCryptoQuoteDeps = defaultDeps,
): Promise<PersistCanonicalCryptoQuoteResult> {
  try {
    if (!input.userId) {
      return result("forbidden", null, "Authenticated user is required.");
    }
    if (input.authority !== CANONICAL_CRYPTO_QUOTE_WRITE_AUTHORITY) {
      return result(
        "forbidden",
        null,
        "Canonical crypto quotes can only be written through the trusted server path.",
      );
    }
    if (!input.holdingId.trim()) {
      return result("forbidden", null, "Holding is required.");
    }

    const holding = await deps.loadOwnedHolding(
      input.client,
      input.userId,
      input.holdingId,
    );
    if (!holding) {
      return result("forbidden", null, "Holding not found.");
    }
    if (holding.asset_type !== "crypto") {
      return result(
        "skipped_invalid",
        null,
        "Canonical quotes are crypto-only.",
      );
    }

    const dbProviderSymbol = persistedProviderSymbol(holding);
    const dbPairCurrency = persistedPairCurrency(holding);
    if (!dbProviderSymbol || !dbPairCurrency) {
      return result(
        "skipped_invalid",
        null,
        "Persisted crypto provider/pair identity is missing.",
      );
    }

    const validated = validateCanonicalCryptoQuoteCandidate(input.candidate);
    if (!validated.ok) {
      return result("skipped_invalid", null, validated.reason);
    }

    const candidate = validated.candidate;
    if (candidate.holdingId !== holding.id || candidate.holdingId !== input.holdingId) {
      return result("forbidden", null, "Holding identity mismatch.");
    }
    if (candidate.providerSymbol !== dbProviderSymbol) {
      return result(
        "skipped_invalid",
        null,
        "Provider symbol does not match persisted holding identity.",
      );
    }
    if (candidate.pairCurrency !== dbPairCurrency) {
      return result(
        "skipped_invalid",
        null,
        "Pair currency does not match persisted holding identity.",
      );
    }

    const existing = await deps.loadExistingQuote(
      input.client,
      holding.id,
      input.userId,
    );

    if (existing && isSameCanonicalQuoteIdentity(candidate, existing)) {
      return result(
        "already_current",
        existing,
        "Canonical crypto quote is already current.",
      );
    }

    if (existing && !isNewerCanonicalQuote(candidate, existing)) {
      return result(
        "skipped_stale",
        existing,
        "Older quote cannot overwrite a newer canonical quote.",
      );
    }

    const payload = quoteInsertPayload(input.userId, candidate);

    if (!existing) {
      const created = await deps.insertQuote(input.client, payload);
      return result("created", created, "Canonical crypto quote created.");
    }

    const updated = await deps.updateQuote(
      input.client,
      existing.id,
      input.userId,
      holding.id,
      payload,
    );
    return result("improved", updated, "Canonical crypto quote improved.");
  } catch {
    return result("error", null, "Canonical crypto quote could not be persisted.");
  }
}
