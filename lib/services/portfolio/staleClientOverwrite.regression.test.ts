import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PortfolioRepository } from "@/lib/services/portfolio/repository";
import { createPortfolioRepository } from "@/lib/services/portfolio/repository";
import {
  syncPortfolioSnapshot,
} from "@/lib/services/portfolio/syncService";
import { SYNC_ERROR_CODES } from "@/lib/services/portfolio/types";
import type { RemotePortfolioSnapshot } from "@/lib/services/portfolio/types";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";
import {
  readPortfolioSyncMeta,
  recordLocalPortfolioSave,
} from "@/lib/client/portfolioSyncState";
import { portfolioSyncMetaKey } from "@/lib/client/portfolioStorageKeys";

const USER_ID = "2000c098-4583-4fa3-a62f-1fe43cff8c2c";
const MAIN_ID = "0cbc32a4-79ab-48f5-be4f-5364939af498";
const KIDS_ID = "eb9c9aaf-0000-4000-8000-000000000001";

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

function snapshotOf(
  portfolioId: string,
  holdings: StoredPortfolioHolding[],
  syncVersion: number,
): RemotePortfolioSnapshot {
  return {
    holdings,
    goal: null,
    importMappings: [],
    migrationCompletedAt: null,
    remoteUpdatedAt: "2026-08-25T11:28:00.000Z",
    portfolioId,
    isPrimary: portfolioId === MAIN_ID,
    holdingCount: holdings.length,
    syncVersion,
  };
}

type BookState = {
  holdings: StoredPortfolioHolding[];
  syncVersion: number;
  ledgers: Array<Record<string, unknown>>;
};

function createCasRepo(initial: Record<string, BookState>) {
  const books = new Map<string, BookState>(
    Object.entries(initial).map(([id, state]) => [
      id,
      {
        holdings: [...state.holdings],
        syncVersion: state.syncVersion,
        ledgers: [...state.ledgers],
      },
    ]),
  );

  const repo = {
    fetchSnapshot: vi.fn(async (_userId: string, portfolioId?: string | null) => {
      const id = portfolioId ?? MAIN_ID;
      const book = books.get(id);
      if (!book) {
        return snapshotOf(id, [], 0);
      }
      return snapshotOf(id, book.holdings, book.syncVersion);
    }),
    findCompletedSyncEvent: vi.fn(async () => null),
    recordSyncEvent: vi.fn(async () => undefined),
    markMigrationCompleted: vi.fn(async () => undefined),
    applySnapshot: vi.fn(
      async (
        _userId: string,
        holdings: StoredPortfolioHolding[],
        _goal: unknown,
        _mappings: unknown,
        _prefix: "migrate" | "sync",
        portfolioId?: string | null,
        options?: { baseVersion?: number },
      ) => {
        const id = portfolioId ?? MAIN_ID;
        const book = books.get(id);
        if (!book) throw new Error("portfolio not found");
        if (
          typeof options?.baseVersion !== "number" ||
          options.baseVersion !== book.syncVersion
        ) {
          const error = new Error("stale_version");
          (error as { code?: string }).code = "PT409";
          throw error;
        }
        book.holdings = holdings;
        book.syncVersion += 1;
        book.ledgers.push({
          source: "client_sync",
          superseded_at: null,
          holdings: holdings.map((item) => item.symbol),
        });
        return snapshotOf(id, book.holdings, book.syncVersion);
      },
    ),
    getPrimaryPortfolioId: vi.fn(async () => MAIN_ID),
    findPrimaryPortfolioId: vi.fn(async () => MAIN_ID),
    fetchHoldings: vi.fn(async () => []),
    fetchActiveGoal: vi.fn(async () => null),
    fetchImportMappings: vi.fn(async () => []),
    fetchMigrationCompletedAt: vi.fn(async () => null),
    mapDbHoldingToStored: vi.fn(),
    mapDbGoalToStored: vi.fn(),
    mapDbImportMapping: vi.fn(),
  } as unknown as PortfolioRepository;

  return { repo, books };
}

describe("stale-client overwrite incident regressions", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("Device B cannot overwrite Device A with a higher local revision and stale baseVersion", async () => {
    const deviceA = [holding("aifs", "AIFS"), holding("btc", "BTC", { assetType: "crypto" })];
    const staleDeviceB = [holding("vwce", "VWCE")];
    const { repo, books } = createCasRepo({
      [MAIN_ID]: { holdings: deviceA, syncVersion: 2, ledgers: [{ source: "client_sync" }] },
    });

    await expect(
      syncPortfolioSnapshot(
        repo,
        USER_ID,
        {
          idempotencyKey: `save:${USER_ID}:${MAIN_ID}:124:933f39aaaaaaaaaa`,
          holdings: staleDeviceB,
          portfolioId: MAIN_ID,
          baseVersion: 1,
          clientId: "device-b",
        },
        null,
        [],
      ),
    ).rejects.toMatchObject({
      code: SYNC_ERROR_CODES.STALE_VERSION,
      snapshot: expect.objectContaining({
        syncVersion: 2,
        holdings: expect.arrayContaining([
          expect.objectContaining({ symbol: "AIFS" }),
        ]),
      }),
    });

    expect(repo.applySnapshot).not.toHaveBeenCalled();
    expect(books.get(MAIN_ID)?.syncVersion).toBe(2);
    expect(books.get(MAIN_ID)?.holdings.map((item) => item.symbol)).toEqual([
      "AIFS",
      "BTC",
    ]);
  });

  it("rolls back when commit_portfolio_sync throws so books stay unchanged", async () => {
    const original = [holding("aifs", "AIFS")];
    const { repo, books } = createCasRepo({
      [MAIN_ID]: {
        holdings: original,
        syncVersion: 2,
        ledgers: [{ source: "client_sync", superseded_at: null }],
      },
    });
    vi.mocked(repo.applySnapshot).mockImplementation(async () => {
      throw new Error("commit_portfolio_sync failed");
    });

    await expect(
      syncPortfolioSnapshot(
        repo,
        USER_ID,
        {
          idempotencyKey: `save:${USER_ID}:${MAIN_ID}:3:c9a933aaaaaaaaaa`,
          holdings: [holding("vwce", "VWCE")],
          portfolioId: MAIN_ID,
          baseVersion: 2,
        },
        null,
        [],
      ),
    ).rejects.toThrow(/commit_portfolio_sync failed/);

    expect(books.get(MAIN_ID)?.syncVersion).toBe(2);
    expect(books.get(MAIN_ID)?.holdings).toEqual(original);
    expect(books.get(MAIN_ID)?.ledgers).toHaveLength(1);
    expect(books.get(MAIN_ID)?.ledgers[0]?.superseded_at).toBeNull();
  });

  it("kids PUT increments only the kids sync_version", async () => {
    const { repo, books } = createCasRepo({
      [MAIN_ID]: {
        holdings: [holding("aifs", "AIFS")],
        syncVersion: 2,
        ledgers: [],
      },
      [KIDS_ID]: {
        holdings: [holding("vusa", "VUSA")],
        syncVersion: 0,
        ledgers: [],
      },
    });

    const kidsResult = await syncPortfolioSnapshot(
      repo,
      USER_ID,
      {
        idempotencyKey: `save:${USER_ID}:${KIDS_ID}:1:kidsfingerprint00`,
        holdings: [holding("vusa", "VUSA"), holding("cash", "EUR", { assetType: "cash", purchasePrice: 1 })],
        portfolioId: KIDS_ID,
        baseVersion: 0,
      },
      null,
      [],
    );

    expect(kidsResult.syncVersion).toBe(1);
    expect(books.get(KIDS_ID)?.syncVersion).toBe(1);
    expect(books.get(MAIN_ID)?.syncVersion).toBe(2);

    await expect(
      syncPortfolioSnapshot(
        repo,
        USER_ID,
        {
          idempotencyKey: `save:${USER_ID}:${MAIN_ID}:124:933f39aaaaaaaaaa`,
          holdings: [holding("vwce", "VWCE")],
          portfolioId: MAIN_ID,
          baseVersion: books.get(KIDS_ID)!.syncVersion,
        },
        null,
        [],
      ),
    ).rejects.toMatchObject({ code: SYNC_ERROR_CODES.STALE_VERSION });

    expect(books.get(MAIN_ID)?.syncVersion).toBe(2);
    expect(books.get(MAIN_ID)?.holdings[0]?.symbol).toBe("AIFS");
  });

  it("keeps Main and Testing sync meta keys independent", () => {
    const testingId = "9de386e2-0000-4000-8000-000000000002";
    recordLocalPortfolioSave(USER_ID, [holding("aifs", "AIFS")], 9, MAIN_ID);
    recordLocalPortfolioSave(USER_ID, [holding("cash", "EUR", { assetType: "cash" })], 2, testingId);

    expect(readPortfolioSyncMeta(USER_ID, MAIN_ID).lastLocalRevision).toBe(9);
    expect(readPortfolioSyncMeta(USER_ID, testingId).lastLocalRevision).toBe(2);
    expect(readPortfolioSyncMeta(USER_ID, MAIN_ID).lastHydratedSyncVersion).toBeUndefined();
    expect(localStorage.getItem(portfolioSyncMetaKey(USER_ID, MAIN_ID))).not.toBe(
      localStorage.getItem(portfolioSyncMetaKey(USER_ID, testingId)),
    );
  });

  it("planner TypeScript path never hard-deletes ledger rows", () => {
    const source = readFileSync(
      resolve(process.cwd(), "lib/services/portfolio/repository.ts"),
      "utf8",
    );
    expect(source).toMatch(/commit_portfolio_sync/);
    expect(source).not.toMatch(/from\(["']transactions["']\)[\s\S]{0,240}\.delete\(/);
  });
});

describe("production-readiness static guards", () => {
  it("migration preamble does not rewrite holdings, goals, ledgers, or primary flags", () => {
    const sql = readFileSync(
      resolve(
        process.cwd(),
        "supabase/migrations/20260827120000_portfolio_sync_version_guard.sql",
      ),
      "utf8",
    );
    const preamble = sql.slice(0, sql.indexOf("CREATE OR REPLACE FUNCTION"));
    expect(preamble).toMatch(/sync_version bigint NOT NULL DEFAULT 0/);
    expect(preamble).toMatch(/superseded_at timestamptz/);
    expect(preamble).not.toMatch(/UPDATE public\.holdings/i);
    expect(preamble).not.toMatch(/UPDATE public\.financial_goals/i);
    expect(preamble).not.toMatch(/UPDATE public\.portfolios/i);
    expect(preamble).not.toMatch(/UPDATE public\.transactions/i);
    expect(preamble).not.toMatch(
      /DELETE FROM public\.(holdings|transactions|portfolios|financial_goals)/i,
    );
    expect(preamble).not.toMatch(/is_primary/i);
  });

  it("commit_portfolio_sync is owner-scoped and not granted to PUBLIC", () => {
    const sql = readFileSync(
      resolve(
        process.cwd(),
        "supabase/migrations/20260827120000_portfolio_sync_version_guard.sql",
      ),
      "utf8",
    );
    expect(sql).toMatch(/v_uid uuid := auth\.uid\(\)/);
    expect(sql).toMatch(/IF v_uid IS NULL THEN/);
    expect(sql).toMatch(/v_portfolio\.user_id <> v_uid/);
    expect(sql).toMatch(/AND user_id = v_uid/);
    expect(sql).toMatch(/SET search_path = ''/);
    expect(sql).toMatch(
      /REVOKE ALL ON FUNCTION public\.commit_portfolio_sync\(jsonb\) FROM PUBLIC/,
    );
    expect(sql).toMatch(
      /GRANT EXECUTE ON FUNCTION public\.commit_portfolio_sync\(jsonb\) TO authenticated/,
    );
  });

  it("409 rehydrate does not retry the rejected PUT payload", () => {
    const source = readFileSync(
      resolve(process.cwd(), "lib/client/useUserPortfolio.ts"),
      "utf8",
    );
    const idx = source.indexOf("result.staleVersion && result.snapshot");
    expect(idx).toBeGreaterThan(0);
    const block = source.slice(idx, idx + 900);
    expect(block).toMatch(/stale version rejected; rehydrated/);
    expect(block.slice(0, block.indexOf("return"))).not.toMatch(
      /pushPortfolioToRemote/,
    );
  });

  it("manual retrySync rehydrates via GET and does not PUT", () => {
    const source = readFileSync(
      resolve(process.cwd(), "lib/client/useUserPortfolio.ts"),
      "utf8",
    );
    const start = source.indexOf("const retrySync = useCallback");
    const end = source.indexOf("const useRemotePortfolio");
    const block = source.slice(start, end);
    expect(block).toMatch(/fetchRemotePortfolio/);
    expect(block).not.toMatch(/pushPortfolioToRemote/);
  });

  it("no longer keeps a process-wide hydratedSyncVersionRef", () => {
    const source = readFileSync(
      resolve(process.cwd(), "lib/client/useUserPortfolio.ts"),
      "utf8",
    );
    expect(source).not.toMatch(/hydratedSyncVersionRef/);
    expect(source).toMatch(/hydratedVersionByBookRef/);
    expect(source).toMatch(/isLiveBookWork/);
    expect(source).toMatch(/bumpBookEpoch/);
  });
});

describe("GET must not mutate portfolios", () => {
  it("findPrimaryPortfolioId only selects", async () => {
    const writes: string[] = [];
    const builder = {
      select: vi.fn(() => builder),
      eq: vi.fn(() => builder),
      order: vi.fn(() => builder),
      limit: vi.fn(() => builder),
      maybeSingle: vi.fn(async () => ({
        data: { id: MAIN_ID, name: "Main", is_primary: true, sync_version: 2 },
        error: null,
      })),
      insert: vi.fn(async () => {
        writes.push("insert");
        return { data: null, error: null };
      }),
      update: vi.fn(() => {
        writes.push("update");
        return builder;
      }),
      delete: vi.fn(() => {
        writes.push("delete");
        return builder;
      }),
      in: vi.fn(() => builder),
      is: vi.fn(() => builder),
      then(
        onFulfilled?: (value: { data: unknown; error: null }) => unknown,
        onRejected?: (reason: unknown) => unknown,
      ) {
        return Promise.resolve({
          data: [
            {
              id: MAIN_ID,
              created_at: "2026-01-01T00:00:00.000Z",
              is_primary: true,
              name: "Main",
              sync_version: 2,
            },
          ],
          error: null,
        }).then(onFulfilled, onRejected);
      },
    };
    const from = vi.fn((table: string) => {
      if (table !== "portfolios") {
        return {
          ...builder,
          then(
            onFulfilled?: (value: { data: unknown; error: null }) => unknown,
            onRejected?: (reason: unknown) => unknown,
          ) {
            return Promise.resolve({ data: [], error: null }).then(
              onFulfilled,
              onRejected,
            );
          },
        };
      }
      return builder;
    });
    const repo = createPortfolioRepository({
      from,
      rpc: vi.fn(),
    } as never);

    await expect(repo.findPrimaryPortfolioId(USER_ID)).resolves.toBe(MAIN_ID);
    expect(writes).toEqual([]);
    expect(from).toHaveBeenCalledWith("portfolios");
  });
});
