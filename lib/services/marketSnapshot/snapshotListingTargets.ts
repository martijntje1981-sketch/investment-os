/**
 * Snapshot collection uses the same confirmed listing identity as holdings
 * pricing: provider symbol, exchange, persisted quote currency, ISIN, and
 * confirmation metadata. Mixed-currency venues are listing-specific.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { resolveQuoteCurrencyForConfirmedListing } from "@/lib/services/instruments/confirmedListingIdentity";
import { parseProviderSymbolParts } from "@/lib/services/instruments/listingMetadata";
import { normalizeProviderQuoteCurrency } from "@/lib/services/instruments/quoteCurrency";
import { resolveDefaultWatchlist } from "@/lib/services/prices/resolvePriceTargets";
import type {
  PriceCurrency,
  PriceHoldingInput,
  ResolvedPriceTarget,
} from "@/lib/services/prices/types";
import type { MarketSnapshotSlot } from "@/lib/services/marketSnapshot/amsterdamSchedule";
import { filterProviderSymbolsForSnapshotSlot } from "@/lib/services/marketSnapshot/snapshotSymbolFilter";

export type SnapshotListingIdentity = {
  providerSymbol: string;
  exchange: string | null;
  quoteCurrency: PriceCurrency | null;
  isin: string | null;
  name: string | null;
  matchMethod: string | null;
  matchConfidence: number | null;
  confirmedAt: string | null;
};

type MappingRow = {
  provider_symbol?: string | null;
  exchange?: string | null;
  quote_currency?: string | null;
  isin?: string | null;
  instrument_name?: string | null;
  match_method?: string | null;
  match_confidence?: number | string | null;
  confirmed_at?: string | null;
};

function normalizeProviderSymbol(value: string | null | undefined): string | null {
  const normalized = value?.trim().toUpperCase();
  return normalized || null;
}

function mappingToListing(mapping: MappingRow): SnapshotListingIdentity | null {
  const providerSymbol = normalizeProviderSymbol(mapping.provider_symbol);
  if (!providerSymbol) {
    return null;
  }

  const parts = parseProviderSymbolParts(providerSymbol);
  const exchange =
    mapping.exchange?.trim().toUpperCase() || parts?.exchange || null;
  const matchConfidence =
    mapping.match_confidence == null ? null : Number(mapping.match_confidence);

  return {
    providerSymbol,
    exchange,
    quoteCurrency: normalizeProviderQuoteCurrency(mapping.quote_currency),
    isin: mapping.isin?.trim().toUpperCase() || null,
    name: mapping.instrument_name?.trim() || providerSymbol,
    matchMethod: mapping.match_method?.trim() || null,
    matchConfidence: Number.isFinite(matchConfidence) ? matchConfidence : null,
    confirmedAt: mapping.confirmed_at ?? null,
  };
}

function watchlistTargetToListing(
  target: ResolvedPriceTarget,
): SnapshotListingIdentity {
  const parts = parseProviderSymbolParts(target.providerSymbol);
  return {
    providerSymbol: target.providerSymbol.trim().toUpperCase(),
    exchange: parts?.exchange ?? null,
    quoteCurrency: target.currency,
    isin: target.isin,
    name: target.name,
    matchMethod: null,
    matchConfidence: null,
    confirmedAt: null,
  };
}

function mergeListings(
  listings: SnapshotListingIdentity[],
): SnapshotListingIdentity[] {
  const bySymbol = new Map<string, SnapshotListingIdentity>();
  for (const listing of listings) {
    const key = listing.providerSymbol;
    const existing = bySymbol.get(key);
    if (!existing) {
      bySymbol.set(key, listing);
      continue;
    }

    bySymbol.set(key, {
      providerSymbol: key,
      exchange: existing.exchange ?? listing.exchange,
      quoteCurrency: existing.quoteCurrency ?? listing.quoteCurrency,
      isin: existing.isin ?? listing.isin,
      name: existing.name ?? listing.name,
      matchMethod: existing.matchMethod ?? listing.matchMethod,
      matchConfidence: existing.matchConfidence ?? listing.matchConfidence,
      confirmedAt: existing.confirmedAt ?? listing.confirmedAt,
    });
  }
  return [...bySymbol.values()];
}

export function snapshotListingToPriceHoldingInput(
  listing: SnapshotListingIdentity,
): PriceHoldingInput {
  const parts = parseProviderSymbolParts(listing.providerSymbol);
  return {
    symbol: parts?.ticker ?? listing.providerSymbol,
    name: listing.name ?? listing.providerSymbol,
    instrumentName: listing.name,
    providerSymbol: listing.providerSymbol,
    exchange: listing.exchange,
    isin: listing.isin,
    quoteCurrency: listing.quoteCurrency,
    assetType: "investment",
    matchMethod: listing.matchMethod,
    matchConfidence: listing.matchConfidence,
  };
}

export function snapshotListingsToPriceTargets(
  listings: SnapshotListingIdentity[],
): ResolvedPriceTarget[] {
  const targets: ResolvedPriceTarget[] = [];

  for (const listing of listings) {
    const holding = snapshotListingToPriceHoldingInput(listing);
    const currency = resolveQuoteCurrencyForConfirmedListing({
      persistedQuoteCurrency: holding.quoteCurrency ?? null,
      providerSymbol: holding.providerSymbol,
      exchange: holding.exchange,
    }).currency;

    if (!currency) {
      continue;
    }

    targets.push({
      symbol: holding.symbol,
      providerSymbol: listing.providerSymbol,
      isin: listing.isin,
      name: holding.name ?? listing.providerSymbol,
      currency,
    });
  }

  return targets;
}

export function filterSnapshotListingsForSlot(
  listings: SnapshotListingIdentity[],
  slot: MarketSnapshotSlot,
): SnapshotListingIdentity[] {
  const allowed = new Set(
    filterProviderSymbolsForSnapshotSlot(
      listings.map((listing) => listing.providerSymbol),
      slot,
    ),
  );
  return listings.filter((listing) => allowed.has(listing.providerSymbol));
}

export async function collectSnapshotListings(): Promise<SnapshotListingIdentity[]> {
  const listings: SnapshotListingIdentity[] = [];
  const admin = createAdminClient();

  if (admin) {
    const { data, error } = await admin
      .from("holdings")
      .select(
        "asset_type, deleted_at, holding_instrument_mappings(provider_symbol, exchange, quote_currency, isin, instrument_name, match_method, match_confidence, confirmed_at)",
      )
      .is("deleted_at", null)
      .eq("asset_type", "investment");

    if (!error && Array.isArray(data)) {
      for (const row of data) {
        const mappings = row.holding_instrument_mappings as
          | MappingRow
          | MappingRow[]
          | null;
        const mappingList = Array.isArray(mappings)
          ? mappings
          : mappings
            ? [mappings]
            : [];

        for (const mapping of mappingList) {
          const listing = mappingToListing(mapping);
          if (listing) {
            listings.push(listing);
          }
        }
      }
    }
  }

  const watchlist = await resolveDefaultWatchlist();
  for (const target of watchlist) {
    if (target.providerSymbol) {
      listings.push(watchlistTargetToListing(target));
    }
  }

  return mergeListings(listings);
}
