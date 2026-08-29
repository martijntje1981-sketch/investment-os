import { describe, expect, it } from "vitest";

import {
  applyPricesOntoCurrentHoldings,
  decideStaleVersionRecovery,
  idsRemovedFrom,
  isNonemptyStrictIdSubset,
  omitDeletedHoldings,
  rememberDeletedHoldingIds,
  shouldPreserveLocalOnlyCrypto,
} from "@/lib/client/portfolioDeletePersistence";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function holding(
  id: string,
  overrides: Partial<StoredPortfolioHolding> = {},
): StoredPortfolioHolding {
  return {
    id,
    symbol: overrides.symbol ?? id.toUpperCase(),
    name: overrides.name ?? id,
    quantity: overrides.quantity ?? 1,
    purchasePrice: overrides.purchasePrice ?? 10,
    currentPrice: overrides.currentPrice ?? 11,
    currency: "EUR",
    assetType: overrides.assetType ?? "investment",
    ...overrides,
  };
}

describe("portfolioDeletePersistence", () => {
  it("delete one holding remains omitted after a later hydrate snapshot", () => {
    const previous = [holding("btc"), holding("eth"), holding("sol")];
    const afterDelete = [holding("eth"), holding("sol")];
    expect(isNonemptyStrictIdSubset(afterDelete, previous)).toBe(true);

    const deletedIds = new Set<string>();
    rememberDeletedHoldingIds(deletedIds, previous, afterDelete);
    const hydrated = omitDeletedHoldings(previous, deletedIds);
    expect(hydrated.map((row) => row.id)).toEqual(["eth", "sol"]);
  });

  it("delete multiple holdings in one session all remain omitted", () => {
    const previous = [holding("a"), holding("b"), holding("c"), holding("d")];
    const deletedIds = new Set<string>();

    const afterA = previous.filter((row) => row.id !== "a");
    rememberDeletedHoldingIds(deletedIds, previous, afterA);
    const staleSecondClick = previous.filter((row) => row.id !== "b");
    rememberDeletedHoldingIds(deletedIds, previous, staleSecondClick);

    const sanitized = omitDeletedHoldings(staleSecondClick, deletedIds);
    expect(sanitized.map((row) => row.id)).toEqual(["c", "d"]);
  });

  it("price refresh cannot restore a holding removed while refresh was in flight", () => {
    const beforeRefresh = [holding("btc", { currentPrice: 1 }), holding("eth", { currentPrice: 2 })];
    const priced = [
      holding("btc", { currentPrice: 99 }),
      holding("eth", { currentPrice: 88 }),
    ];
    const afterDelete = [holding("eth", { currentPrice: 2 })];

    const merged = applyPricesOntoCurrentHoldings(afterDelete, priced);
    expect(merged.map((row) => row.id)).toEqual(["eth"]);
    expect(merged[0]?.currentPrice).toBe(88);
    expect(merged.some((row) => row.id === "btc")).toBe(false);
    expect(beforeRefresh).toHaveLength(2);
  });

  it("stale client saving an old holding after deletion retries local deletes, not the old snapshot", () => {
    const remoteAfterOtherTabDelete = [holding("kept")];
    const staleTabFull = [holding("kept"), holding("deleted")];
    expect(
      decideStaleVersionRecovery({
        latestLocal: staleTabFull,
        remote: remoteAfterOtherTabDelete,
        sentHoldings: staleTabFull,
      }),
    ).toBe("apply_remote");

    const thisTabAfterTwoDeletes = [holding("kept")];
    const remoteAfterFirstDelete = [holding("kept"), holding("gone")];
    expect(
      decideStaleVersionRecovery({
        latestLocal: thisTabAfterTwoDeletes,
        remote: remoteAfterFirstDelete,
        sentHoldings: thisTabAfterTwoDeletes,
      }),
    ).toBe("retry_local");
  });

  it("does not treat an empty first-load cache as a wipe vs a populated remote", () => {
    expect(isNonemptyStrictIdSubset([], [holding("a")])).toBe(false);
    expect(
      decideStaleVersionRecovery({
        latestLocal: [],
        remote: [holding("a")],
        sentHoldings: [holding("a")],
      }),
    ).toBe("apply_remote");
  });

  it("does not leak deleted ids across books", () => {
    const mainDeleted = new Set<string>();
    const testingDeleted = new Set<string>();
    rememberDeletedHoldingIds(
      testingDeleted,
      [holding("btc"), holding("eth")],
      [holding("eth")],
    );
    expect(
      omitDeletedHoldings([holding("btc"), holding("eth")], mainDeleted).map(
        (row) => row.id,
      ),
    ).toEqual(["btc", "eth"]);
    expect(
      omitDeletedHoldings([holding("btc"), holding("eth")], testingDeleted).map(
        (row) => row.id,
      ),
    ).toEqual(["eth"]);
  });

  it("does not preserve deleted crypto when remote is newer", () => {
    const local = [holding("btc", { assetType: "crypto" }), holding("eth", { assetType: "crypto" })];
    const remote = [holding("eth", { assetType: "crypto" })];
    expect(
      shouldPreserveLocalOnlyCrypto({
        localHoldings: local,
        remoteHoldings: remote,
        deletedIds: new Set(["btc"]),
        remoteIsNewerThanLastHydrate: false,
      }),
    ).toBe(false);
    expect(
      shouldPreserveLocalOnlyCrypto({
        localHoldings: local,
        remoteHoldings: remote,
        deletedIds: new Set(),
        remoteIsNewerThanLastHydrate: true,
      }),
    ).toBe(false);
  });

  it("still preserves unsynced local crypto adds against an older remote", () => {
    expect(
      shouldPreserveLocalOnlyCrypto({
        localHoldings: [
          holding("eth", { assetType: "crypto" }),
          holding("new", { assetType: "crypto" }),
        ],
        remoteHoldings: [holding("eth", { assetType: "crypto" })],
        deletedIds: new Set(),
        remoteIsNewerThanLastHydrate: false,
      }),
    ).toBe(true);
  });

  it("idsRemovedFrom lists every dropped holding", () => {
    expect(
      idsRemovedFrom(
        [holding("a"), holding("b"), holding("c")],
        [holding("c")],
      ),
    ).toEqual(["a", "b"]);
  });
});
