/**
 * Delete persistence helpers.
 *
 * Deleted holding ids are remembered for the active book so stale snapshots
 * (price refresh, overlapping PUTs, React closures) cannot write them back.
 * Cloud CAS/version is unchanged: a later PUT still needs a matching baseVersion.
 */

import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

export function holdingIdSet(
  holdings: StoredPortfolioHolding[],
): Set<string> {
  return new Set(holdings.map((holding) => holding.id));
}

/** Local is a non-empty strict subset of remote by id (unsynced deletes). */
export function isNonemptyStrictIdSubset(
  local: StoredPortfolioHolding[],
  remote: StoredPortfolioHolding[],
): boolean {
  if (local.length === 0 || remote.length === 0) return false;
  if (local.length >= remote.length) return false;
  const remoteIds = holdingIdSet(remote);
  return local.every((holding) => remoteIds.has(holding.id));
}

export function idsRemovedFrom(
  previous: StoredPortfolioHolding[],
  next: StoredPortfolioHolding[],
): string[] {
  const nextIds = holdingIdSet(next);
  return previous.map((holding) => holding.id).filter((id) => !nextIds.has(id));
}

export function rememberDeletedHoldingIds(
  deletedIds: Set<string>,
  previous: StoredPortfolioHolding[],
  next: StoredPortfolioHolding[],
): string[] {
  const removed = idsRemovedFrom(previous, next);
  for (const id of removed) {
    deletedIds.add(id);
  }
  return removed;
}

export function omitDeletedHoldings(
  holdings: StoredPortfolioHolding[],
  deletedIds: Set<string>,
): StoredPortfolioHolding[] {
  if (deletedIds.size === 0) return holdings;
  return holdings.filter((holding) => !deletedIds.has(holding.id));
}

/**
 * Copy price fields from a refresh onto the live holdings list.
 * Never reinserts ids that are no longer in `current`.
 */
export function applyPricesOntoCurrentHoldings(
  current: StoredPortfolioHolding[],
  priced: StoredPortfolioHolding[],
): StoredPortfolioHolding[] {
  if (current.length === 0) return current;
  const pricedById = new Map(priced.map((holding) => [holding.id, holding]));
  return current.map((holding) => {
    const updated = pricedById.get(holding.id);
    return updated ? { ...holding, ...updated, id: holding.id } : holding;
  });
}

export function decideStaleVersionRecovery(input: {
  latestLocal: StoredPortfolioHolding[];
  remote: StoredPortfolioHolding[];
  sentHoldings: StoredPortfolioHolding[];
}): "retry_local" | "apply_remote" {
  const { latestLocal, remote, sentHoldings } = input;
  if (isNonemptyStrictIdSubset(latestLocal, remote)) {
    return "retry_local";
  }
  if (
    latestLocal.length === 0 &&
    sentHoldings.length < remote.length &&
    isNonemptyStrictIdSubset(sentHoldings, remote)
  ) {
    return "retry_local";
  }
  if (
    latestLocal.length === 0 &&
    sentHoldings.length === 0 &&
    remote.length > 0
  ) {
    return "retry_local";
  }
  return "apply_remote";
}

export function shouldPreserveLocalOnlyCrypto(input: {
  localHoldings: StoredPortfolioHolding[];
  remoteHoldings: StoredPortfolioHolding[];
  deletedIds: Set<string>;
  remoteIsNewerThanLastHydrate: boolean;
}): boolean {
  if (input.remoteIsNewerThanLastHydrate) return false;
  return input.localHoldings.some(
    (holding) =>
      holding.assetType === "crypto" &&
      !input.deletedIds.has(holding.id) &&
      !input.remoteHoldings.some((remote) => remote.id === holding.id),
  );
}

export function bookKey(portfolioId: string | null | undefined): string {
  return portfolioId?.trim() || "primary";
}
