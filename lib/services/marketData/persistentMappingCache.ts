import { createAdminClient } from "@/lib/supabase/admin";
import {
  getInstrumentLookupTtlMs,
  isInstrumentLookupStillFresh,
} from "@/lib/services/marketData/cachePolicy";
import type {
  EodhdExchangeSymbolListRow,
  EodhdIdMappingRow,
  EodhdSearchRow,
} from "@/lib/services/instruments/eodhdClient";
import type { ListingMetadataRecord } from "@/lib/services/instruments/listingMetadata";

type LookupType =
  | "id_mapping"
  | "search"
  | "listing_metadata"
  | "exchange_symbol_list";

function buildLookupKey(type: LookupType, parts: Record<string, string>): string {
  const normalized = Object.entries(parts)
    .filter(([, value]) => value)
    .map(([key, value]) => `${key}:${value.trim().toUpperCase()}`)
    .sort()
    .join("|");
  return `${type}|${normalized}`;
}

export function buildIdMappingLookupKey(filters: {
  isin?: string;
  symbol?: string;
  exchange?: string;
}): string {
  return buildLookupKey("id_mapping", {
    isin: filters.isin ?? "",
    symbol: filters.symbol ?? "",
    exchange: filters.exchange ?? "",
  });
}

export function buildSearchLookupKey(query: string, exchange?: string | null): string {
  return buildLookupKey("search", {
    query: query.trim().toUpperCase(),
    exchange: exchange?.trim().toUpperCase() ?? "",
  });
}

export function buildExchangeSymbolListLookupKey(exchange: string): string {
  return buildLookupKey("exchange_symbol_list", {
    exchange: exchange.trim().toUpperCase(),
  });
}

export function buildListingMetadataLookupKey(providerSymbol: string): string {
  return buildLookupKey("listing_metadata", {
    providerSymbol: providerSymbol.trim().toUpperCase(),
  });
}

const LISTING_METADATA_TTL_MS = 120 * 24 * 60 * 60 * 1000;

export async function readListingMetadata(
  providerSymbol: string,
): Promise<ListingMetadataRecord | null> {
  const lookupKey = buildListingMetadataLookupKey(providerSymbol);
  return readPersistedInstrumentLookup<ListingMetadataRecord>(lookupKey);
}

export async function writeListingMetadata(
  metadata: ListingMetadataRecord,
): Promise<void> {
  const admin = createAdminClient();
  if (!admin) return;

  const now = Date.now();
  const expiresAt = new Date(now + LISTING_METADATA_TTL_MS).toISOString();

  await admin.from("instrument_lookup_cache").upsert(
    {
      lookup_key: buildListingMetadataLookupKey(metadata.providerSymbol),
      provider_id: "eodhd",
      lookup_type: "listing_metadata",
      result_json: metadata,
      fetched_at: metadata.resolvedAt,
      expires_at: expiresAt,
      updated_at: new Date(now).toISOString(),
    },
    { onConflict: "lookup_key" },
  );
}

export async function readPersistedInstrumentLookup<T>(
  lookupKey: string,
): Promise<T | null> {
  const entry = await readPersistedInstrumentLookupEntry<T>(lookupKey);
  if (!entry || Date.parse(entry.expiresAt) <= Date.now()) return null;
  return entry.result;
}

export async function readPersistedInstrumentLookupEntry<T>(
  lookupKey: string,
): Promise<{ result: T; expiresAt: string } | null> {
  const admin = createAdminClient();
  if (!admin) return null;

  const { data, error } = await admin
    .from("instrument_lookup_cache")
    .select("result_json, expires_at, fetched_at, lookup_type")
    .eq("lookup_key", lookupKey)
    .maybeSingle();

  if (error || !data) return null;
  if (
    !isInstrumentLookupStillFresh({
      lookupType: data.lookup_type ?? lookupKey.split("|")[0] ?? "",
      result: data.result_json,
      fetchedAt: data.fetched_at,
      expiresAt: data.expires_at,
    })
  ) {
    return null;
  }
  return {
    result: data.result_json as T,
    expiresAt: data.expires_at,
  };
}

export async function writePersistedInstrumentLookup(input: {
  lookupKey: string;
  lookupType: LookupType;
  result: EodhdIdMappingRow[] | EodhdSearchRow[] | EodhdExchangeSymbolListRow[] | ListingMetadataRecord;
  ttlMs?: number;
}): Promise<void> {
  const admin = createAdminClient();
  if (!admin) return;

  const now = Date.now();
  const expiresAt = new Date(
    now +
      (input.ttlMs ??
        getInstrumentLookupTtlMs(input.lookupType, input.result)),
  ).toISOString();

  await admin.from("instrument_lookup_cache").upsert(
    {
      lookup_key: input.lookupKey,
      provider_id: "eodhd",
      lookup_type: input.lookupType,
      result_json: input.result,
      fetched_at: new Date(now).toISOString(),
      expires_at: expiresAt,
      updated_at: new Date(now).toISOString(),
    },
    { onConflict: "lookup_key" },
  );
}

export function resetPersistedInstrumentLookupCacheForTests(): void {
  // No-op in unit tests.
}
