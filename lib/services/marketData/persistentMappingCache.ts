import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_MARKET_DATA_CACHE_POLICY } from "@/lib/services/marketData/cachePolicy";
import type {
  EodhdIdMappingRow,
  EodhdSearchRow,
} from "@/lib/services/instruments/eodhdClient";

type LookupType = "id_mapping" | "search";

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

export async function readPersistedInstrumentLookup<T>(
  lookupKey: string,
): Promise<T | null> {
  const admin = createAdminClient();
  if (!admin) return null;

  const { data, error } = await admin
    .from("instrument_lookup_cache")
    .select("result_json, expires_at")
    .eq("lookup_key", lookupKey)
    .maybeSingle();

  if (error || !data) return null;
  if (Date.parse(data.expires_at) <= Date.now()) return null;
  return data.result_json as T;
}

export async function writePersistedInstrumentLookup(input: {
  lookupKey: string;
  lookupType: LookupType;
  result: EodhdIdMappingRow[] | EodhdSearchRow[];
}): Promise<void> {
  const admin = createAdminClient();
  if (!admin) return;

  const now = Date.now();
  const expiresAt = new Date(
    now + DEFAULT_MARKET_DATA_CACHE_POLICY.instrumentMappingFreshMs,
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
