import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  applyRemoteSnapshotToLocalCache,
  recordLocalPortfolioSave,
  resolveClientSyncState,
} from "@/lib/client/portfolioSyncState";
import { portfolioStorageKey, portfolioSyncMetaKey } from "@/lib/client/portfolioStorageKeys";
import { writePortfolioToStorage } from "@/lib/client/userPortfolioStorage";
import {
  getPortfolioBackupRecoveryOffer,
  restorePortfolioFromBackup,
  writePortfolioBackupIfComplete,
} from "@/lib/client/portfolioLocalBackup";
import { loadUserPortfolioHoldings } from "@/lib/client/portfolioPricing";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";
import type { RemotePortfolioSnapshot } from "@/lib/services/portfolio/types";

const USER = "persistence-sync-user";

function holding(
  overrides: Partial<StoredPortfolioHolding> & Pick<StoredPortfolioHolding, "symbol">,
): StoredPortfolioHolding {
  return {
    ...overrides,
    id: overrides.id ?? crypto.randomUUID(),
    symbol: overrides.symbol,
    name: overrides.name ?? overrides.symbol,
    quantity: overrides.quantity ?? 10,
    purchasePrice: overrides.purchasePrice ?? 100,
    currentPrice: overrides.currentPrice ?? 0,
    currency: "EUR",
    assetType: overrides.assetType ?? "investment",
    providerSymbol: overrides.providerSymbol ?? null,
    exchange: overrides.exchange ?? null,
    pricingExchange: overrides.pricingExchange,
    isin: overrides.isin,
    quoteCurrency: overrides.quoteCurrency,
    confirmationSource: overrides.confirmationSource,
  };
}

function snapshotWith(
  holdings: StoredPortfolioHolding[],
): RemotePortfolioSnapshot {
  return {
    holdings,
    holdingCount: holdings.length,
    goal: null,
    importMappings: [],
    remoteUpdatedAt: "2026-07-22T10:00:00.000Z",
    migrationCompletedAt: null,
    portfolioId: "portfolio-test",
    syncVersion: 0,
  };
}

describe("portfolio persistence and sync safety", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("preserves investments when stale cash-only remote snapshot is rejected", () => {
    const local = [
      holding({ id: "strc", symbol: "STRC", providerSymbol: "STRC.AS", exchange: "AS" }),
      holding({ id: "cash", symbol: "EUR", assetType: "cash", quantity: 5000, purchasePrice: 1, currentPrice: 1 }),
    ];
    writePortfolioToStorage(USER, local);

    const result = applyRemoteSnapshotToLocalCache(
      USER,
      snapshotWith([
        holding({ id: "cash", symbol: "EUR", assetType: "cash", quantity: 5000, purchasePrice: 1, currentPrice: 1 }),
      ]),
      {
        preserveLocalPrices: local,
        sentHoldings: local,
        context: "push_response",
      },
    );

    expect(result).toHaveLength(2);
    expect(result.some((row) => row.symbol === "STRC")).toBe(true);
    expect(JSON.parse(localStorage.getItem(portfolioStorageKey(USER)) ?? "[]")).toHaveLength(2);
  });

  it("preserves providerSymbol when merging remote snapshot", () => {
    const local = [
      holding({
        id: "aifs",
        symbol: "AIFS",
        providerSymbol: "AIFS.XETRA",
        exchange: "XETRA",
        confirmationSource: "verified_mapping",
      }),
    ];

    const merged = applyRemoteSnapshotToLocalCache(
      USER,
      snapshotWith([
        holding({
          id: "aifs",
          symbol: "AIFS",
          providerSymbol: null,
          exchange: null,
        }),
      ]),
      {
        preserveLocalPrices: local,
        context: "hydrate",
      },
    );

    expect(merged[0]?.providerSymbol).toBe("AIFS.XETRA");
    expect(merged[0]?.confirmationSource).toBe("verified_mapping");
  });

  it("persists auto-enrichment without dropping other holdings", () => {
    writePortfolioToStorage(USER, [
      holding({ id: "aifs", symbol: "AIFS", exchange: "XETRA", providerSymbol: null }),
      holding({ id: "cash", symbol: "EUR", assetType: "cash", quantity: 1000, purchasePrice: 1, currentPrice: 1 }),
    ]);

    const loaded = loadUserPortfolioHoldings(USER);
    expect(loaded).toHaveLength(2);
    expect(loaded.find((row) => row.symbol === "AIFS")?.providerSymbol).toBe("AIFS.XETRA");

    const stored = JSON.parse(localStorage.getItem(portfolioStorageKey(USER)) ?? "[]") as StoredPortfolioHolding[];
    expect(stored.find((row) => row.symbol === "AIFS")?.providerSymbol).toBe("AIFS.XETRA");
  });

  it("offers backup recovery when active portfolio lost investments", () => {
    const complete = [
      holding({ id: "strc", symbol: "STRC", providerSymbol: "STRC.AS" }),
      holding({ id: "cash", symbol: "EUR", assetType: "cash", quantity: 1000, purchasePrice: 1, currentPrice: 1 }),
    ];
    writePortfolioBackupIfComplete(USER, complete);
    writePortfolioToStorage(USER, [
      holding({ id: "cash", symbol: "EUR", assetType: "cash", quantity: 1000, purchasePrice: 1, currentPrice: 1 }),
    ]);

    const offer = getPortfolioBackupRecoveryOffer(USER);
    expect(offer?.canRecover).toBe(true);
    expect(offer?.investmentCount).toBe(1);

    expect(restorePortfolioFromBackup(USER)).toBe(true);
    const restored = JSON.parse(localStorage.getItem(portfolioStorageKey(USER)) ?? "[]") as StoredPortfolioHolding[];
    expect(restored.some((row) => row.symbol === "STRC")).toBe(true);
  });

  it("keeps fuller local without conflict UI when cloud is cash-only incomplete", () => {
    const local = [
      holding({ id: "strc", symbol: "STRC", quantity: 5, purchasePrice: 10 }),
      holding({ id: "cash", symbol: "EUR", assetType: "cash", quantity: 1000, purchasePrice: 1, currentPrice: 1 }),
    ];
    const remote = snapshotWith([
      holding({ id: "cash", symbol: "EUR", assetType: "cash", quantity: 1000, purchasePrice: 1, currentPrice: 1 }),
    ]);

    const state = resolveClientSyncState(USER, local, remote, false, null, []);
    expect(state.status).toBe("ready");
    if (state.status === "ready") {
      expect(state.source).toBe("local");
    }
  });

  it("does not show conflict for identical portfolios", () => {
    const holdings = [
      holding({ id: "strc", symbol: "STRC", quantity: 5, purchasePrice: 10 }),
      holding({ id: "cash", symbol: "EUR", assetType: "cash", quantity: 1000, purchasePrice: 1, currentPrice: 1 }),
    ];

    const state = resolveClientSyncState(
      USER,
      holdings,
      snapshotWith(holdings),
      false,
      null,
      [],
    );

    expect(state.status).toBe("ready");
    if (state.status === "ready") {
      expect(state.source).toBe("remote");
    }
  });

  it("records local revision metadata on save", () => {
    const holdings = [holding({ symbol: "STRC", providerSymbol: "STRC.AS" })];
    recordLocalPortfolioSave(USER, holdings, 3);
    const meta = JSON.parse(localStorage.getItem(portfolioSyncMetaKey(USER)) ?? "{}") as {
      lastLocalRevision?: number;
      lastLocalInvestmentCount?: number;
    };
    expect(meta.lastLocalRevision).toBe(3);
    expect(meta.lastLocalInvestmentCount).toBe(1);
  });

  it("scopes sync meta per portfolio and treats local revision as cache only", () => {
    const main = "main-book";
    const kids = "kids-book";
    const holdings = [holding({ symbol: "STRC", providerSymbol: "STRC.AS" })];

    recordLocalPortfolioSave(USER, holdings, 124, main);
    recordLocalPortfolioSave(USER, holdings, 1, kids);

    const mainMeta = JSON.parse(
      localStorage.getItem(portfolioSyncMetaKey(USER, main)) ?? "{}",
    ) as { lastLocalRevision?: number; lastHydratedSyncVersion?: number };
    const kidsMeta = JSON.parse(
      localStorage.getItem(portfolioSyncMetaKey(USER, kids)) ?? "{}",
    ) as { lastLocalRevision?: number; lastHydratedSyncVersion?: number };

    expect(mainMeta.lastLocalRevision).toBe(124);
    expect(kidsMeta.lastLocalRevision).toBe(1);
    expect(mainMeta.lastHydratedSyncVersion).toBeUndefined();
    expect(kidsMeta.lastHydratedSyncVersion).toBeUndefined();
    expect(localStorage.getItem(portfolioSyncMetaKey(USER, main))).not.toBe(
      localStorage.getItem(portfolioSyncMetaKey(USER, kids)),
    );
  });

  it("stores lastHydratedSyncVersion from cloud apply without using local revision", () => {
    const holdings = [holding({ id: "aifs", symbol: "AIFS", quantity: 4, purchasePrice: 20 })];
    recordLocalPortfolioSave(USER, holdings, 124, "portfolio-test");

    applyRemoteSnapshotToLocalCache(USER, {
      ...snapshotWith(holdings),
      syncVersion: 2,
    }, { context: "hydrate" });

    const meta = JSON.parse(
      localStorage.getItem(portfolioSyncMetaKey(USER, "portfolio-test")) ?? "{}",
    ) as { lastLocalRevision?: number; lastHydratedSyncVersion?: number };

    expect(meta.lastHydratedSyncVersion).toBe(2);
    expect(meta.lastLocalRevision).toBe(124);
  });

  it("restores quoteCurrency, pricingExchange, and confirmationSource on sync round-trip", () => {
    const local = [
      holding({
        id: "kids-vusa",
        symbol: "VUSA",
        providerSymbol: "VUSA.AS",
        exchange: "AS",
        pricingExchange: "AS",
        isin: "IE00B3XXRP09",
        quoteCurrency: "EUR",
        confirmationSource: "manual_exact_listing",
      }),
    ];

    const merged = applyRemoteSnapshotToLocalCache(
      USER,
      snapshotWith([
        holding({
          id: "kids-vusa",
          symbol: "VUSA",
          providerSymbol: "VUSA.AS",
          exchange: "AS",
          quoteCurrency: null,
          confirmationSource: undefined,
          pricingExchange: undefined,
        }),
      ]),
      {
        preserveLocalPrices: local,
        context: "hydrate",
      },
    );

    expect(merged[0]?.providerSymbol).toBe("VUSA.AS");
    expect(merged[0]?.exchange).toBe("AS");
    expect(merged[0]?.pricingExchange).toBe("AS");
    expect(merged[0]?.quoteCurrency).toBe("EUR");
    expect(merged[0]?.confirmationSource).toBe("manual_exact_listing");
    expect(merged[0]?.isin).toBe("IE00B3XXRP09");
  });

  it("does not cross-merge the same ticker listed on two exchanges", () => {
    const local = [
      holding({
        id: "kids-vusa",
        symbol: "VUSA",
        providerSymbol: "VUSA.AS",
        exchange: "AS",
        quoteCurrency: "EUR",
        confirmationSource: "manual_exact_listing",
      }),
    ];

    const merged = applyRemoteSnapshotToLocalCache(
      USER,
      snapshotWith([
        holding({
          id: "lse-vusa",
          symbol: "VUSA",
          providerSymbol: "VUSA.LSE",
          exchange: "LSE",
          quoteCurrency: "GBP",
          confirmationSource: "verified_mapping",
        }),
      ]),
      {
        preserveLocalPrices: local,
        context: "hydrate",
        force: true,
      },
    );

    expect(merged).toHaveLength(1);
    expect(merged[0]?.id).toBe("lse-vusa");
    expect(merged[0]?.providerSymbol).toBe("VUSA.LSE");
    expect(merged[0]?.quoteCurrency).toBe("GBP");
    expect(merged[0]?.exchange).toBe("LSE");
  });
});
