import { beforeEach, describe, expect, it, vi } from "vitest";

import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";
import { resolvePortfolioSyncState } from "@/lib/services/portfolio/conflictDetection";
import {
  approxEqual,
  buildHoldingLedgerIdempotencyKey,
  buildMigrationIdempotencyKey,
  portfolioFingerprint,
  resolveRemoteHoldingId,
} from "@/lib/services/portfolio/idempotency";
import {
  sanitizeLocalHoldings,
  buildRemoteSnapshot,
} from "@/lib/services/portfolio/mappers";
import {
  PortfolioSyncError,
  migrateLocalPortfolio,
  syncPortfolioSnapshot,
} from "@/lib/services/portfolio/syncService";
import type { PortfolioRepository } from "@/lib/services/portfolio/repository";
import type { RemotePortfolioSnapshot } from "@/lib/services/portfolio/types";
import { SYNC_ERROR_CODES } from "@/lib/services/portfolio/types";
import {
  applyRemoteSnapshotToLocalCache,
  resolveClientSyncState,
} from "@/lib/client/portfolioSyncState";
import {
  portfolioStorageKey,
  portfolioSyncMetaKey,
  goalStorageKey,
} from "@/lib/client/portfolioStorageKeys";

const USER_ID = "11111111-1111-4111-8111-111111111111";

function holding(
  id: string,
  symbol: string,
  overrides: Partial<StoredPortfolioHolding> = {},
): StoredPortfolioHolding {
  return {
    id,
    symbol,
    name: `${symbol} Fund`,
    quantity: 10,
    purchasePrice: 100,
    currentPrice: 110,
    currency: "EUR",
    assetType: "investment",
    ...overrides,
  };
}

function emptySnapshot(): RemotePortfolioSnapshot {
  return {
    holdings: [],
    goal: null,
    importMappings: [],
    migrationCompletedAt: null,
    remoteUpdatedAt: null,
    portfolioId: null,
    holdingCount: 0,
  };
}

function snapshotWith(holdings: StoredPortfolioHolding[]): RemotePortfolioSnapshot {
  return buildRemoteSnapshot(
    holdings.map((item, index) => ({
      id: resolveRemoteHoldingId(USER_ID, item.id),
      portfolio_id: "portfolio-1",
      user_id: USER_ID,
      asset_type: item.assetType === "cash" ? "cash" : "investment",
      symbol: item.symbol,
      name: item.name,
      quantity: item.quantity,
      average_cost: item.purchasePrice,
      currency: "EUR",
      sort_order: index,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      deleted_at: null,
      last_market_price:
        item.assetType === "cash"
          ? 1
          : item.currentPrice > 0
            ? item.currentPrice
            : null,
      last_market_price_at:
        item.currentPrice > 0 ? item.marketPriceUpdatedAt ?? item.updatedAt : null,
    })),
    null,
    [],
    null,
    "portfolio-1",
  );
}

function createMockRepo(overrides: Partial<PortfolioRepository> = {}): PortfolioRepository {
  return {
    fetchSnapshot: vi.fn(async () => emptySnapshot()),
    findCompletedSyncEvent: vi.fn(async () => null),
    recordSyncEvent: vi.fn(async () => undefined),
    markMigrationCompleted: vi.fn(async () => undefined),
    applySnapshot: vi.fn(async (_userId, holdings) => snapshotWith(holdings)),
    getPrimaryPortfolioId: vi.fn(async () => "portfolio-1"),
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

describe("portfolio sync idempotency", () => {
  it("derives stable remote ids for legacy local ids", () => {
    const first = resolveRemoteHoldingId(USER_ID, "legacy-vwce");
    const second = resolveRemoteHoldingId(USER_ID, "legacy-vwce");
    expect(first).toBe(second);
    expect(first).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-a[0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it("builds deterministic migration idempotency keys", () => {
    const holdings = [holding("a", "VWCE")];
    const fingerprint = portfolioFingerprint(holdings, USER_ID);
    expect(buildMigrationIdempotencyKey(USER_ID, fingerprint)).toBe(
      `migrate:${USER_ID}:${fingerprint}`,
    );
  });

  it("builds ledger idempotency keys from quantity and price", () => {
    const holdingId = resolveRemoteHoldingId(USER_ID, "abc");
    expect(
      buildHoldingLedgerIdempotencyKey("migrate", holdingId, 10, 100),
    ).toBe(`migrate:ledger:${holdingId}:10.00000000:100.00000000`);
  });

  it("compares numeric ledger values with tolerance", () => {
    expect(approxEqual(10, 10.00000001)).toBe(true);
    expect(approxEqual(10, 10.1)).toBe(false);
  });
});

describe("portfolio conflict detection", () => {
  it("offers migration when local exists and remote is empty", () => {
    const resolution = resolvePortfolioSyncState(
      [holding("1", "VWCE")],
      emptySnapshot(),
      USER_ID,
    );
    expect(resolution.kind).toBe("migration_offer");
  });

  it("loads remote on second device when local is empty", () => {
    const remote = snapshotWith([holding("1", "VWCE")]);
    const resolution = resolvePortfolioSyncState([], remote, USER_ID);
    expect(resolution.kind).toBe("remote_only");
  });

  it("detects conflict when local and remote differ", () => {
    const remote = snapshotWith([holding("1", "VWCE")]);
    const resolution = resolvePortfolioSyncState(
      [holding("2", "IWDA")],
      remote,
      USER_ID,
    );
    expect(resolution.kind).toBe("conflict");
  });

  it("treats matching fingerprints as aligned", () => {
    const local = [holding("1", "VWCE")];
    const remote = snapshotWith(local);
    const resolution = resolvePortfolioSyncState(local, remote, USER_ID);
    expect(resolution.kind).toBe("aligned");
  });
});

describe("portfolio migration service", () => {
  it("rejects unauthenticated-style empty holdings", async () => {
    const repo = createMockRepo();
    await expect(
      migrateLocalPortfolio(
        repo,
        USER_ID,
        {
          idempotencyKey: "migrate:test",
          holdings: [],
          localFingerprint: "empty",
        },
        null,
        [],
      ),
    ).rejects.toMatchObject({ code: SYNC_ERROR_CODES.VALIDATION });
  });

  it("migrates local holdings when remote is empty", async () => {
    const repo = createMockRepo();
    const local = [holding("legacy-1", "VWCE")];
    const fingerprint = portfolioFingerprint(local, USER_ID);

    const snapshot = await migrateLocalPortfolio(
      repo,
      USER_ID,
      {
        idempotencyKey: buildMigrationIdempotencyKey(USER_ID, fingerprint),
        holdings: local,
        localFingerprint: fingerprint,
      },
      null,
      [],
    );

    expect(repo.applySnapshot).toHaveBeenCalledOnce();
    expect(repo.markMigrationCompleted).toHaveBeenCalledOnce();
    expect(snapshot.holdingCount).toBe(1);
  });

  it("replays idempotent migration without duplicate writes", async () => {
    const local = [holding("legacy-1", "VWCE")];
    const fingerprint = portfolioFingerprint(local, USER_ID);
    const idempotencyKey = buildMigrationIdempotencyKey(USER_ID, fingerprint);

    const repo = createMockRepo({
      findCompletedSyncEvent: vi.fn(async () => ({
        id: "event-1",
        status: "completed",
        payload_hash: fingerprint,
        completed_at: "2026-01-01T00:00:00.000Z",
      })),
      fetchSnapshot: vi.fn(async () => snapshotWith(local)),
    });

    await migrateLocalPortfolio(
      repo,
      USER_ID,
      { idempotencyKey, holdings: local, localFingerprint: fingerprint },
      null,
      [],
    );

    expect(repo.applySnapshot).not.toHaveBeenCalled();
  });

  it("throws conflict when remote already has different holdings", async () => {
    const local = [holding("legacy-1", "VWCE")];
    const remote = snapshotWith([holding("remote-1", "IWDA")]);
    const repo = createMockRepo({
      fetchSnapshot: vi.fn(async () => remote),
    });

    await expect(
      migrateLocalPortfolio(
        repo,
        USER_ID,
        {
          idempotencyKey: "migrate:conflict",
          holdings: local,
          localFingerprint: portfolioFingerprint(local, USER_ID),
        },
        null,
        [],
      ),
    ).rejects.toMatchObject({ code: SYNC_ERROR_CODES.CONFLICT });
  });

  it("records failed migration after provider failure", async () => {
    const local = [holding("legacy-1", "VWCE")];
    const repo = createMockRepo({
      applySnapshot: vi.fn(async () => {
        throw new Error("network");
      }),
    });

    await expect(
      migrateLocalPortfolio(
        repo,
        USER_ID,
        {
          idempotencyKey: "migrate:fail",
          holdings: local,
          localFingerprint: portfolioFingerprint(local, USER_ID),
        },
        null,
        [],
      ),
    ).rejects.toThrow("network");

    expect(repo.recordSyncEvent).toHaveBeenCalledWith(
      USER_ID,
      "migrate",
      "migrate:fail",
      expect.any(String),
      "failed",
    );
  });

  it("fails verification when remote read-back does not match", async () => {
    const local = [holding("legacy-1", "VWCE")];
    const repo = createMockRepo({
      applySnapshot: vi.fn(async () => snapshotWith([holding("x", "OTHER")])),
    });

    await expect(
      migrateLocalPortfolio(
        repo,
        USER_ID,
        {
          idempotencyKey: "migrate:verify-fail",
          holdings: local,
          localFingerprint: portfolioFingerprint(local, USER_ID),
        },
        null,
        [],
      ),
    ).rejects.toBeInstanceOf(PortfolioSyncError);
  });
});

describe("portfolio ongoing sync", () => {
  it("deduplicates sync requests via idempotency key", async () => {
    const repo = createMockRepo({
      findCompletedSyncEvent: vi.fn(async () => ({
        id: "sync-1",
        status: "completed",
        payload_hash: "hash",
        completed_at: "2026-01-01T00:00:00.000Z",
      })),
      fetchSnapshot: vi.fn(async () => snapshotWith([holding("1", "VWCE")])),
    });

    await syncPortfolioSnapshot(
      repo,
      USER_ID,
      {
        idempotencyKey: "sync:dedupe",
        holdings: [holding("1", "VWCE")],
      },
      null,
      [],
    );

    expect(repo.applySnapshot).not.toHaveBeenCalled();
  });
});

describe("legacy local sanitization", () => {
  it("drops malformed legacy rows but keeps valid holdings", () => {
    const sanitized = sanitizeLocalHoldings([
      holding("1", "VWCE"),
      { id: "bad", symbol: "", quantity: -1, purchasePrice: 1 } as StoredPortfolioHolding,
      { id: "bad2", symbol: "X", quantity: "nope", purchasePrice: 1 } as unknown as StoredPortfolioHolding,
    ]);

    expect(sanitized).toHaveLength(1);
    expect(sanitized[0]?.symbol).toBe("VWCE");
  });
});

describe("client portfolio sync state", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("never resolves to empty while local data exists during loading transition", () => {
    const local = [holding("1", "VWCE")];
    writePortfolio(local);

    const state = resolveClientSyncState(
      USER_ID,
      local,
      null,
      true,
      null,
      [],
    );
    expect(state.status).toBe("offline");
  });

  it("offers migration for authenticated user with local data and empty remote", () => {
    const local = [holding("1", "VWCE")];
    const state = resolveClientSyncState(
      USER_ID,
      local,
      emptySnapshot(),
      false,
      null,
      [],
    );
    expect(state.status).toBe("migration_offer");
  });

  it("applies remote snapshot to local cache without deleting prior local copy semantics", () => {
    const remote = snapshotWith([
      holding("remote-1", "VWCE", { currentPrice: 0 }),
    ]);
    const local = [holding("remote-1", "VWCE", { currentPrice: 125 })];

    const merged = applyRemoteSnapshotToLocalCache(USER_ID, remote, {
      preserveLocalPrices: local,
    });

    expect(localStorage.getItem(portfolioStorageKey(USER_ID))).toBeTruthy();
    expect(merged[0]?.currentPrice).toBe(125);
    expect(localStorage.getItem(portfolioSyncMetaKey(USER_ID))).toContain(
      "lastSuccessfulRemoteAt",
    );
  });

  it("restores synced last market price from remote snapshot on second device", () => {
    const remote = snapshotWith([
      holding("remote-1", "TESTSYNC", {
        currentPrice: 120,
        marketPriceUpdatedAt: "2026-07-20T10:00:00.000Z",
      }),
    ]);

    const merged = applyRemoteSnapshotToLocalCache(USER_ID, remote);

    expect(merged[0]?.currentPrice).toBe(120);
    expect(merged[0]?.marketPriceUpdatedAt).toBe("2026-07-20T10:00:00.000Z");
  });

  it("writes goal to local cache when included in remote snapshot", () => {
    const remote = {
      ...emptySnapshot(),
      goal: {
        targetValue: 500000,
        targetYear: 2035,
        monthlyContribution: 1000,
        expectedAnnualReturn: 8,
      },
    };

    applyRemoteSnapshotToLocalCache(USER_ID, remote);
    expect(localStorage.getItem(goalStorageKey(USER_ID))).toContain("500000");
  });
});

function writePortfolio(holdings: StoredPortfolioHolding[]) {
  localStorage.setItem(
    portfolioStorageKey(USER_ID),
    JSON.stringify(holdings),
  );
}

describe("migration SQL security", () => {
  it("includes phase 2 sync tables with RLS enabled", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const sql = readFileSync(
      resolve(
        process.cwd(),
        "supabase/migrations/20260720100000_phase2_portfolio_sync.sql",
      ),
      "utf8",
    );

    expect(sql).toMatch(/saved_import_mappings/);
    expect(sql).toMatch(/portfolio_sync_events/);
    expect(sql).toMatch(/ENABLE ROW LEVEL SECURITY/);
    expect(sql).toMatch(/user_id = auth\.uid\(\)/);
    expect(sql).not.toMatch(/DROP TABLE/i);
    expect(sql).not.toMatch(/TRUNCATE/i);
  });

  it("includes cached market price columns for cross-device sync", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const sql = readFileSync(
      resolve(
        process.cwd(),
        "supabase/migrations/20260720110000_phase2_holding_market_price.sql",
      ),
      "utf8",
    );

    expect(sql).toMatch(/last_market_price/);
    expect(sql).toMatch(/last_market_price_at/);
    expect(sql).not.toMatch(/DROP TABLE/i);
  });
});
