/**
 * Picks a compact Market Pulse strip for the Dashboard from an existing snapshot.
 * No fabricated prices — only assets already present in the snapshot.
 */

import type {
  MarketPulseAsset,
  MarketPulseSnapshot,
} from "@/lib/services/marketPulse/types";

const FALLBACK_IDS = [
  "bitcoin",
  "gold",
  "global_equities",
  "technology_ai",
  "ethereum",
] as const;

function assetUsable(asset: MarketPulseAsset): boolean {
  if (
    asset.availability === "unavailable" ||
    asset.availability === "unsupported"
  ) {
    return false;
  }
  return asset.displayPrice != null || asset.price != null;
}

function dedupePush(
  selected: MarketPulseAsset[],
  seen: Set<string>,
  asset: MarketPulseAsset | undefined,
  limit: number,
) {
  if (!asset || selected.length >= limit || seen.has(asset.id)) return;
  if (!assetUsable(asset)) return;
  seen.add(asset.id);
  selected.push(asset);
}

/**
 * Selection priority:
 * 1. Linked / portfolio-relevant markets (by weight when available)
 * 2. Portfolio-driving hero market when available
 * 3. Broad fallbacks already in the snapshot (BTC, gold, equity index, …)
 */
export function selectDashboardMarketPulseItems(
  snapshot: MarketPulseSnapshot | null | undefined,
  limit = 3,
): MarketPulseAsset[] {
  if (!snapshot || limit <= 0) return [];

  const selected: MarketPulseAsset[] = [];
  const seen = new Set<string>();

  const byId = new Map<string, MarketPulseAsset>();
  for (const asset of [
    ...snapshot.linkedMarkets,
    ...snapshot.commodities,
    ...snapshot.crypto,
  ]) {
    byId.set(asset.id, asset);
  }

  const linkedSorted = [...snapshot.linkedMarkets]
    .filter(assetUsable)
    .sort(
      (a, b) =>
        (b.portfolioWeightPercent ?? 0) - (a.portfolioWeightPercent ?? 0),
    );

  for (const asset of linkedSorted) {
    dedupePush(selected, seen, asset, limit);
  }

  if (snapshot.heroDriver.marketId) {
    dedupePush(selected, seen, byId.get(snapshot.heroDriver.marketId), limit);
  }

  for (const id of FALLBACK_IDS) {
    dedupePush(selected, seen, byId.get(id), limit);
  }

  for (const asset of [...snapshot.crypto, ...snapshot.commodities]) {
    dedupePush(selected, seen, asset, limit);
  }

  return selected;
}
