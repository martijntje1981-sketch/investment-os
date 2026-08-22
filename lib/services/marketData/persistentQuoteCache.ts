import { createAdminClient } from "@/lib/supabase/admin";
import {
  getQuoteFreshTtlMs,
  getQuoteStaleWindowMs,
} from "@/lib/services/marketData/cachePolicy";
import type { NormalizedProviderQuote } from "@/lib/services/prices/types";

export type PersistedQuoteRecord = {
  cacheKey: string;
  quote: NormalizedProviderQuote;
  fresh: boolean;
  status: "fresh" | "stale" | "unavailable";
  lastError: string | null;
};

type QuoteRow = {
  cache_key: string;
  provider_id: string;
  provider_symbol: string;
  quote_json: NormalizedProviderQuote;
  status: "fresh" | "stale" | "unavailable";
  last_error: string | null;
  fetched_at: string;
  expires_at: string;
  stale_until: string;
};

export async function readPersistedQuote(
  cacheKey: string,
): Promise<PersistedQuoteRecord | null> {
  const admin = createAdminClient();
  if (!admin) return null;

  const { data, error } = await admin
    .from("market_quote_cache")
    .select("*")
    .eq("cache_key", cacheKey)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as QuoteRow;
  const now = Date.now();
  const staleUntil = Date.parse(row.stale_until);
  if (!Number.isFinite(staleUntil) || now > staleUntil) {
    return null;
  }

  const fresh = now <= Date.parse(row.expires_at);
  return {
    cacheKey: row.cache_key,
    quote: {
      ...row.quote_json,
      isStale: !fresh,
      cacheStatus: fresh ? "fresh" : "stale",
      dataStatus: fresh ? row.quote_json.dataStatus : "stale",
    },
    fresh,
    status: row.status,
    lastError: row.last_error,
  };
}

export async function writePersistedQuote(input: {
  cacheKey: string;
  providerId: string;
  providerSymbol: string;
  quote: NormalizedProviderQuote;
  lastError?: string | null;
}): Promise<void> {
  const admin = createAdminClient();
  if (!admin) return;

  const now = Date.now();
  const freshMs = getQuoteFreshTtlMs(input.providerSymbol);
  const staleMs = getQuoteStaleWindowMs(input.providerSymbol);
  const fetchedAt = new Date(now).toISOString();
  const expiresAt = new Date(now + freshMs).toISOString();
  const staleUntil = new Date(now + staleMs).toISOString();

  await admin.from("market_quote_cache").upsert(
    {
      cache_key: input.cacheKey,
      provider_id: input.providerId,
      provider_symbol: input.providerSymbol,
      quote_json: input.quote,
      status: "fresh",
      last_error: input.lastError ?? null,
      fetched_at: fetchedAt,
      expires_at: expiresAt,
      stale_until: staleUntil,
      updated_at: fetchedAt,
    },
    { onConflict: "cache_key" },
  );
}

export async function markPersistedQuoteUnavailable(input: {
  cacheKey: string;
  providerId: string;
  providerSymbol: string;
  quote?: NormalizedProviderQuote | null;
  lastError: string;
}): Promise<void> {
  const admin = createAdminClient();
  if (!admin) return;

  const existing = await readPersistedQuote(input.cacheKey);
  const quote = input.quote ?? existing?.quote;
  if (!quote) return;

  const now = new Date().toISOString();
  await admin.from("market_quote_cache").upsert(
    {
      cache_key: input.cacheKey,
      provider_id: input.providerId,
      provider_symbol: input.providerSymbol,
      quote_json: { ...quote, dataStatus: "stale", cacheStatus: "stale", isStale: true },
      status: "stale",
      last_error: input.lastError,
      fetched_at: existing ? undefined : now,
      expires_at: now,
      stale_until: new Date(Date.now() + getQuoteStaleWindowMs(input.providerSymbol)).toISOString(),
      updated_at: now,
    },
    { onConflict: "cache_key" },
  );
}

export function resetPersistedQuoteCacheForTests(): void {
  // No-op: tests use in-memory cache only.
}
