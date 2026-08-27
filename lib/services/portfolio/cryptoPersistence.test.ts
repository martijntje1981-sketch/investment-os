import { beforeEach, describe, expect, it, vi } from "vitest";

import { getHoldingMarketValue } from "@/lib/client/portfolioAnalysis";
import { applyRemoteSnapshotToLocalCache } from "@/lib/client/portfolioSyncState";
import { portfolioStorageKey } from "@/lib/client/portfolioStorageKeys";
import { writePortfolioToStorage, readPortfolioFromStorage } from "@/lib/client/userPortfolioStorage";
import {
  mapDbHoldingToStored,
  mapStoredHoldingToDbInsert,
  buildRemoteSnapshot,
} from "@/lib/services/portfolio/mappers";
import {
  localHasPendingCryptoUpload,
  portfolioRemoteHoldingsAreSubsetOfLocal,
  portfoliosPersistedMatch,
  normalizeHoldingForPersistedVerification,
} from "@/lib/services/portfolio/idempotency";
import { resolvePortfolioSyncState } from "@/lib/services/portfolio/conflictDetection";
import {
  syncPortfolioSnapshot,
} from "@/lib/services/portfolio/syncService";
import type { PortfolioRepository } from "@/lib/services/portfolio/repository";
import type { RemotePortfolioSnapshot } from "@/lib/services/portfolio/types";
import {
  buildCryptoHoldingMetadata,
  parseCryptoHoldingMetadata,
} from "@/lib/services/portfolio/cryptoDbMetadata";
import {
  createEmptyCryptoDraft,
  prepareCryptoHoldingForSave,
} from "@/lib/services/portfolio/cryptoHolding";
import {
  holdingIdentityKey,
  resolveHoldingIdForSync,
} from "@/lib/services/portfolio/holdingUniqueness";
import type { DbHoldingRow } from "@/lib/services/portfolio/types";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const PORTFOLIO_ID = "22222222-2222-4222-8222-222222222222";

function cryptoHolding(
  overrides: Partial<StoredPortfolioHolding> = {},
): StoredPortfolioHolding {
  return prepareCryptoHoldingForSave({
    ...createEmptyCryptoDraft(),
    id: overrides.id ?? "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    name: overrides.name ?? "Bitcoin",
    symbol: overrides.symbol ?? "BTC",
    quantity: overrides.quantity ?? 0.5,
    pairCurrency: overrides.pairCurrency ?? "EUR",
    purchasePrice: overrides.purchasePrice ?? 0,
    pricingStatus: overrides.pricingStatus ?? "price_unavailable",
    platform: overrides.platform ?? null,
    ...overrides,
    assetType: "crypto",
  });
}

function investment(
  overrides: Partial<StoredPortfolioHolding> = {},
): StoredPortfolioHolding {
  return {
    id: overrides.id ?? "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    symbol: "VWCE",
    name: "VWCE",
    quantity: 10,
    purchasePrice: 100,
    currentPrice: 110,
    currency: "EUR",
    assetType: "investment",
    ...overrides,
  };
}

function dbCryptoRow(
  holding: StoredPortfolioHolding,
  overrides: Partial<DbHoldingRow> = {},
): DbHoldingRow {
  return {
    id: holding.id,
    portfolio_id: PORTFOLIO_ID,
    user_id: USER_ID,
    asset_type: "crypto",
    symbol: holding.symbol,
    name: holding.name,
    quantity: holding.quantity,
    average_cost: holding.purchasePrice,
    currency: "EUR",
    sort_order: 0,
    created_at: holding.createdAt ?? "2026-07-18T08:00:00.000Z",
    updated_at: holding.updatedAt ?? "2026-07-18T08:00:00.000Z",
    deleted_at: null,
    metadata: buildCryptoHoldingMetadata(holding),
    ...overrides,
  };
}

describe("crypto Supabase mappers", () => {
  it("maps crypto to a valid database insert", () => {
    const holding = cryptoHolding({ pairCurrency: "EUR" });
    const insert = mapStoredHoldingToDbInsert(
      holding,
      USER_ID,
      PORTFOLIO_ID,
      0,
      holding.id,
    );

    expect(insert.asset_type).toBe("crypto");
    expect(insert.symbol).toBe("BTC");
    expect(insert.quantity).toBe(0);
    expect(insert.average_cost).toBe(0);
    expect(insert.metadata).toMatchObject({
      pairCurrency: "EUR",
      portfolioCurrency: "EUR",
      tradingPair: "BTC/EUR",
    });
  });

  it("maps database crypto back without losing pair currency", () => {
    const source = cryptoHolding({ pairCurrency: "USDC" });
    const restored = mapDbHoldingToStored(dbCryptoRow(source));

    expect(restored.assetType).toBe("crypto");
    expect(restored.pairCurrency).toBe("USDC");
    expect(restored.tradingPair).toBe("BTC/USDC");
    expect(restored.portfolioCurrency).toBe("EUR");
  });

  it("keeps USDC distinct from USD after round trip", () => {
    const usdc = mapDbHoldingToStored(
      dbCryptoRow(cryptoHolding({ pairCurrency: "USDC" })),
    );
    const usd = mapDbHoldingToStored(
      dbCryptoRow(
        cryptoHolding({
          id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
          pairCurrency: "USD",
        }),
      ),
    );

    expect(usdc.pairCurrency).toBe("USDC");
    expect(usd.pairCurrency).toBe("USD");
    expect(usdc.tradingPair).toBe("BTC/USDC");
    expect(usd.tradingPair).toBe("BTC/USD");
  });

  it("keeps USDT distinct from USD after round trip", () => {
    const restored = mapDbHoldingToStored(
      dbCryptoRow(cryptoHolding({ pairCurrency: "USDT" })),
    );
    expect(restored.pairCurrency).toBe("USDT");
    expect(restored.tradingPair).toBe("BTC/USDT");
  });

  it("preserves unknown crypto after round trip", () => {
    const unknown = cryptoHolding({
      name: "Mystery Coin",
      symbol: "MYST",
      pricingStatus: "needs_review",
    });
    const restored = mapDbHoldingToStored(dbCryptoRow(unknown));

    expect(restored.symbol).toBe("MYST");
    expect(restored.pricingStatus).toBe("needs_review");
    expect(restored.assetType).toBe("crypto");
    expect(restored.providerName).toBeNull();
  });

  it("preserves manual valuation after round trip", () => {
    const manual = cryptoHolding({
      pricingStatus: "manual",
      currentManualPrice: 42_000,
      manualCurrentValue: 21_000,
    });
    const metadata = buildCryptoHoldingMetadata({
      ...manual,
      pricingStatus: "manual",
      currentManualPrice: 42_000,
      manualCurrentValue: 21_000,
    });
    const restored = mapDbHoldingToStored(
      dbCryptoRow(manual, { metadata }),
    );

    expect(restored.pricingStatus).toBe("manual");
    expect(restored.currentManualPrice).toBe(42_000);
    expect(restored.manualCurrentValue).toBe(21_000);
    expect(getHoldingMarketValue(restored)).toBe(21_000);
  });

  it("keeps unpriced crypto unvalued after round trip", () => {
    const unpriced = cryptoHolding({ purchasePrice: 50_000 });
    const restored = mapDbHoldingToStored(dbCryptoRow(unpriced));

    expect(restored.currentPrice).toBe(0);
    expect(restored.priceDataStatus).toBe("unavailable");
    expect(getHoldingMarketValue(restored)).toBeNull();
  });

  it("allows BTC/EUR and BTC/USDC to coexist by identity", () => {
    const eur = cryptoHolding({
      id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      pairCurrency: "EUR",
    });
    const usdc = cryptoHolding({
      id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
      pairCurrency: "USDC",
    });

    expect(holdingIdentityKey(eur)).not.toBe(holdingIdentityKey(usdc));
    expect(resolveHoldingIdForSync(USER_ID, eur)).not.toBe(
      resolveHoldingIdForSync(USER_ID, usdc),
    );
  });

  it("allows two separate BTC/USDC holdings with different ids", () => {
    const first = cryptoHolding({
      id: "ffffffff-ffff-4fff-8fff-ffffffffffff",
      pairCurrency: "USDC",
      platform: "Kraken",
    });
    const second = cryptoHolding({
      id: "10101010-1010-4101-8101-010101010101",
      pairCurrency: "USDC",
      platform: "Ledger",
    });

    expect(resolveHoldingIdForSync(USER_ID, first)).not.toBe(
      resolveHoldingIdForSync(USER_ID, second),
    );
  });

  it("does not store pair currency in exchange-like columns", () => {
    const holding = cryptoHolding({ pairCurrency: "USDC" });
    const insert = mapStoredHoldingToDbInsert(
      holding,
      USER_ID,
      PORTFOLIO_ID,
      0,
      holding.id,
    );

    expect(insert.metadata?.pairCurrency).toBe("USDC");
    expect(insert).not.toHaveProperty("exchange");
  });

  it("round-trips SHIB/USD with CC exchange metadata and provider symbol intact", () => {
    const holding = cryptoHolding({
      id: "shib-1",
      name: "Shiba Inu",
      symbol: "SHIB",
      pairCurrency: "USD",
      providerSymbol: "SHIB-USD.CC",
      exchange: "CC",
    });

    const restored = mapDbHoldingToStored(dbCryptoRow(holding));
    expect(restored.symbol).toBe("SHIB");
    expect(restored.pairCurrency).toBe("USD");
    expect(restored.providerSymbol).toBe("SHIB-USD.CC");
    expect(restored.exchange).toBe("CC");
    expect(restored.tradingPair).toBe("SHIB/USD");
  });

  it("parses metadata safely when fields are missing", () => {
    const parsed = parseCryptoHoldingMetadata({});
    expect(parsed?.pairCurrency).toBe("EUR");
    expect(parsed?.pricingStatus).toBe("needs_review");
  });
});

describe("crypto mapper coexistence with investments", () => {
  it("crypto insert payload does not modify investment rows", () => {
    const equity = investment();
    const equityInsert = mapStoredHoldingToDbInsert(
      equity,
      USER_ID,
      PORTFOLIO_ID,
      0,
      equity.id,
    );
    const cryptoInsert = mapStoredHoldingToDbInsert(
      cryptoHolding(),
      USER_ID,
      PORTFOLIO_ID,
      1,
      cryptoHolding().id,
    );

    expect(equityInsert.asset_type).toBe("investment");
    expect(cryptoInsert.asset_type).toBe("crypto");
    expect(equityInsert.symbol).toBe("VWCE");
  });
});

function snapshotWithHoldings(
  holdings: StoredPortfolioHolding[],
): RemotePortfolioSnapshot {
  return buildRemoteSnapshot(
    holdings.map((item, index) => {
      if (item.assetType === "crypto") {
        const insert = mapStoredHoldingToDbInsert(
          item,
          USER_ID,
          PORTFOLIO_ID,
          index,
          item.id,
        );
        return {
          ...insert,
          quantity: item.quantity,
          average_cost: item.purchasePrice,
          created_at: item.createdAt ?? "2026-07-18T08:00:00.000Z",
          updated_at: item.updatedAt ?? "2026-07-18T08:00:00.000Z",
          last_market_price: null,
          last_market_price_at: null,
          previous_close: null,
        } as DbHoldingRow;
      }

      return {
        id: item.id,
        portfolio_id: PORTFOLIO_ID,
        user_id: USER_ID,
        asset_type: item.assetType === "cash" ? "cash" : "investment",
        symbol: item.symbol,
        name: item.name,
        quantity: item.quantity,
        average_cost: item.purchasePrice,
        currency: "EUR",
        sort_order: index,
        created_at: "2026-07-18T08:00:00.000Z",
        updated_at: "2026-07-18T08:00:00.000Z",
        deleted_at: null,
        last_market_price:
          item.assetType === "cash" ? 1 : item.currentPrice > 0 ? item.currentPrice : null,
        last_market_price_at: null,
        previous_close: null,
        holding_instrument_mappings: item.providerSymbol
          ? {
              holding_id: item.id,
              isin: item.isin ?? null,
              exchange: item.exchange ?? null,
              provider_symbol: item.providerSymbol,
              instrument_name: item.instrumentName ?? item.name,
              match_method: item.matchMethod ?? "manual",
              match_confidence: item.matchConfidence ?? 1,
              match_warnings: item.matchWarnings ?? [],
              quote_currency: item.quoteCurrency ?? null,
              confirmed_at: "2026-07-18T08:00:00.000Z",
            }
          : null,
      } satisfies DbHoldingRow;
    }),
    null,
    [],
    null,
    PORTFOLIO_ID,
  );
}

function createMockRepo(
  overrides: Partial<PortfolioRepository> = {},
): PortfolioRepository {
  return {
    fetchSnapshot: vi.fn(async () => snapshotWithHoldings([])),
    findCompletedSyncEvent: vi.fn(async () => null),
    recordSyncEvent: vi.fn(async () => undefined),
    markMigrationCompleted: vi.fn(async () => undefined),
    applySnapshot: vi.fn(async (_userId, holdings) => snapshotWithHoldings(holdings)),
    getPrimaryPortfolioId: vi.fn(async () => PORTFOLIO_ID),
    findPrimaryPortfolioId: vi.fn(async () => PORTFOLIO_ID),
    fetchHoldings: vi.fn(async () => []),
    fetchActiveGoal: vi.fn(async () => null),
    fetchImportMappings: vi.fn(async () => []),
    fetchMigrationCompletedAt: vi.fn(async () => null),
    mapDbHoldingToStored: vi.fn(),
    mapDbGoalToStored: vi.fn(),
    mapDbImportMapping: vi.fn(),
    ...overrides,
  } as PortfolioRepository;
}

describe("crypto sync and merge", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("verifies persisted crypto round trip for sync", () => {
    const crypto = cryptoHolding();
    const restored = mapDbHoldingToStored(dbCryptoRow(crypto));
    const expected = normalizeHoldingForPersistedVerification(crypto, USER_ID);
    const actual = normalizeHoldingForPersistedVerification(restored, USER_ID);
    expect(actual).toEqual(expected);
    expect(portfoliosPersistedMatch([crypto], [restored], USER_ID)).toBe(true);
  });

  it("verifies persisted investment round trip for sync", () => {
    const inv = investment();
    const remote = snapshotWithHoldings([inv]);
    expect(portfoliosPersistedMatch([inv], remote.holdings, USER_ID)).toBe(true);
  });

  it("verifies mixed portfolio persisted round trip for sync", () => {
    const local = [investment(), cryptoHolding()];
    const remote = snapshotWithHoldings([investment()]);

    expect(localHasPendingCryptoUpload(local, remote.holdings)).toBe(true);
    expect(portfolioRemoteHoldingsAreSubsetOfLocal(local, remote.holdings)).toBe(true);
    expect(resolvePortfolioSyncState(local, remote, USER_ID).kind).toBe("aligned");
  });

  it("restores remote crypto on a fresh browser hydrate", () => {
    writePortfolioToStorage(USER_ID, []);
    const remote = snapshotWithHoldings([investment(), cryptoHolding()]);

    const merged = applyRemoteSnapshotToLocalCache(USER_ID, remote, {
      context: "hydrate",
      force: true,
    });

    expect(merged).toHaveLength(2);
    expect(merged.some((row) => row.assetType === "crypto")).toBe(true);
    expect(
      JSON.parse(localStorage.getItem(portfolioStorageKey(USER_ID)) ?? "[]"),
    ).toHaveLength(2);
  });

  it("preserves local crypto until remote confirmation on hydrate", () => {
    const localCrypto = cryptoHolding();
    writePortfolioToStorage(USER_ID, [investment(), localCrypto]);
    const remote = snapshotWithHoldings([investment()]);

    const merged = applyRemoteSnapshotToLocalCache(USER_ID, remote, {
      context: "hydrate",
      preserveLocalPrices: [investment(), localCrypto],
      force: true,
    });

    expect(merged.some((row) => row.id === localCrypto.id)).toBe(true);
  });

  it("does not remove investments when remote crypto snapshot is applied", () => {
    writePortfolioToStorage(USER_ID, [investment()]);
    const remote = snapshotWithHoldings([investment(), cryptoHolding()]);

    const merged = applyRemoteSnapshotToLocalCache(USER_ID, remote, {
      context: "push_response",
      sentHoldings: [investment(), cryptoHolding()],
      force: true,
    });

    expect(merged.some((row) => row.symbol === "VWCE")).toBe(true);
    expect(merged.some((row) => row.assetType === "crypto")).toBe(true);
  });

  it("does not remove crypto when remote investment snapshot is applied locally", () => {
    const local = [investment(), cryptoHolding()];
    writePortfolioToStorage(USER_ID, local);
    const remote = snapshotWithHoldings([investment()]);

    const merged = applyRemoteSnapshotToLocalCache(USER_ID, remote, {
      context: "push_response",
      preserveLocalPrices: local,
      sentHoldings: local,
      force: true,
    });

    expect(merged.some((row) => row.assetType === "crypto")).toBe(true);
  });

  it("keeps local crypto when remote snapshot apply is rejected", () => {
    const local = [
      investment(),
      cryptoHolding(),
      {
        id: "99999999-9999-4999-8999-999999999999",
        symbol: "EUR",
        name: "EUR Cash",
        quantity: 1000,
        purchasePrice: 1,
        currentPrice: 1,
        currency: "EUR" as const,
        assetType: "cash" as const,
      },
    ];
    writePortfolioToStorage(USER_ID, local);
    const remote = snapshotWithHoldings([
      {
        id: "99999999-9999-4999-8999-999999999999",
        symbol: "EUR",
        name: "EUR Cash",
        quantity: 1000,
        purchasePrice: 1,
        currentPrice: 1,
        currency: "EUR" as const,
        assetType: "cash" as const,
      },
    ]);

    const merged = applyRemoteSnapshotToLocalCache(USER_ID, remote, {
      context: "push_response",
      preserveLocalPrices: local,
      sentHoldings: local,
    });

    expect(merged).toHaveLength(3);
    expect(merged.some((row) => row.assetType === "crypto")).toBe(true);
  });

  it("migrates local crypto to remote once via sync service", async () => {
    const local = [investment(), cryptoHolding()];
    const repo = createMockRepo();

    const snapshot = await syncPortfolioSnapshot(
      repo,
      USER_ID,
      {
        idempotencyKey: "sync:crypto-once",
        holdings: local,
        baseVersion: 0,
      },
      null,
      [],
    );

    expect(repo.applySnapshot).toHaveBeenCalledOnce();
    expect(snapshot.holdings.some((row) => row.assetType === "crypto")).toBe(true);
  });

  it("does not duplicate crypto on repeated idempotent sync", async () => {
    const local = [investment(), cryptoHolding()];
    const remote = snapshotWithHoldings(local);
    const repo = createMockRepo({
      findCompletedSyncEvent: vi.fn(async () => ({
        id: "sync-1",
        status: "completed",
        payload_hash: "hash",
        completed_at: "2026-07-18T08:00:00.000Z",
      })),
      fetchSnapshot: vi.fn(async () => remote),
    });

    await syncPortfolioSnapshot(
      repo,
      USER_ID,
      { idempotencyKey: "sync:crypto-dedupe", holdings: local },
      null,
      [],
    );

    expect(repo.applySnapshot).not.toHaveBeenCalled();
  });

  it("records failed remote write without deleting local crypto", async () => {
    const local = [cryptoHolding()];
    writePortfolioToStorage(USER_ID, local);
    const repo = createMockRepo({
      applySnapshot: vi.fn(async () => {
        throw new Error("network");
      }),
    });

    await expect(
      syncPortfolioSnapshot(
        repo,
        USER_ID,
        { idempotencyKey: "sync:crypto-fail", holdings: local, baseVersion: 0 },
        null,
        [],
      ),
    ).rejects.toThrow("network");

    expect(readPortfolioFromStorage(USER_ID)).toHaveLength(1);
  });

  it("retains crypto after logout/login style reload from storage", () => {
    const holdings = [investment(), cryptoHolding()];
    writePortfolioToStorage(USER_ID, holdings);

    const reloaded = JSON.parse(
      localStorage.getItem(portfolioStorageKey(USER_ID)) ?? "[]",
    ) as StoredPortfolioHolding[];

    expect(reloaded.some((row) => row.assetType === "crypto")).toBe(true);
    expect(reloaded.find((row) => row.assetType === "crypto")?.pairCurrency).toBe(
      "EUR",
    );
  });
});
