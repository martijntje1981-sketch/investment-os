import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createPortfolioRepository } from "@/lib/services/portfolio/repository";
import { resolveHoldingIdForSync } from "@/lib/services/portfolio/holdingUniqueness";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const PORTFOLIO_ID = "22222222-2222-4222-8222-222222222222";
const LEGACY_HOLDING_ID = "33333333-3333-4333-8333-333333333333";
const TOMBSTONE_HOLDING_ID = "44444444-4444-4444-8444-444444444444";

function holding(
  overrides: Partial<StoredPortfolioHolding> = {},
): StoredPortfolioHolding {
  return {
    id: "import-local-id",
    symbol: "VWCE",
    name: "Vanguard FTSE All-World",
    quantity: 10,
    purchasePrice: 100,
    currentPrice: 0,
    currency: "EUR",
    assetType: "investment",
    isin: "IE00BK5BQT80",
    providerSymbol: "VWCE.XETRA",
    ...overrides,
  };
}

function importScreenshotHoldings(): StoredPortfolioHolding[] {
  return [
    holding({ id: "row-vwce", symbol: "VWCE", providerSymbol: "VWCE.XETRA" }),
    holding({
      id: "row-iwda",
      symbol: "IWDA",
      name: "iShares Core MSCI World",
      isin: "IE00B4L5Y983",
      providerSymbol: "IWDA.AS",
    }),
    holding({
      id: "row-strc",
      symbol: "STRC",
      name: "Strategy Inc",
      quantity: 3,
      purchasePrice: 50,
      isin: "NL0015001K93",
      providerSymbol: "STRC.AS",
    }),
    holding({
      id: "row-asml",
      symbol: "ASML",
      name: "ASML Holding",
      quantity: 2,
      purchasePrice: 700,
      isin: "NL0010273215",
      providerSymbol: "ASML.AS",
    }),
    holding({
      id: "row-cash",
      symbol: "EUR",
      name: "EUR Cash",
      quantity: 1000,
      purchasePrice: 1,
      currentPrice: 1,
      assetType: "cash",
      providerSymbol: undefined,
    }),
  ];
}

type QueryResult = { data: unknown; error: unknown };

function naturalKeyMatches(
  row: Record<string, unknown>,
  state: Record<string, unknown>,
  activeOnly: boolean,
) {
  if (row.user_id !== USER_ID || row.portfolio_id !== PORTFOLIO_ID) return false;
  if (activeOnly && row.deleted_at) return false;
  if (state.asset_type && row.asset_type !== state.asset_type) return false;
  if (state.currency && row.currency !== state.currency) return false;
  if (state.symbol && row.symbol !== state.symbol) return false;
  return Boolean(state.symbol || state.currency);
}

function createMockSupabase(initialHoldings: Array<Record<string, unknown>>) {
  const holdings = [...initialHoldings];
  const mappings: Array<Record<string, unknown>> = [];
  const transactions: Array<Record<string, unknown>> = [];
  const tableWrites = {
    insert: [] as string[],
    update: [] as string[],
    delete: [] as string[],
  };
  const portfolio = {
    id: PORTFOLIO_ID,
    user_id: USER_ID,
    name: "Main",
    is_primary: true,
    sync_version: 0,
  };

  const from = vi.fn((table: string) => {
    const state: Record<string, unknown> = {};

    const builder = {
      select: vi.fn(() => builder),
      eq: vi.fn((column: string, value: unknown) => {
        state[column] = value;
        return builder;
      }),
      is: vi.fn((column: string, value: unknown) => {
        state[`is:${column}`] = value;
        return builder;
      }),
      not: vi.fn((column: string, op: string, value: unknown) => {
        state[`not:${column}`] = op;
        state[`not:${column}:value`] = value;
        return builder;
      }),
      limit: vi.fn(() => builder),
      in: vi.fn(() => builder),
      order: vi.fn(() => builder),
      maybeSingle: vi.fn(async (): Promise<QueryResult> => {
        if (table === "portfolios") {
          return {
            data: {
              id: PORTFOLIO_ID,
              name: "Main",
              is_primary: true,
              sync_version: portfolio.sync_version,
            },
            error: null,
          };
        }

        if (table === "holdings") {
          const id = state.id as string | undefined;
          if (id) {
            const row = holdings.find(
              (item) => item.id === id && item.user_id === USER_ID,
            );
            return { data: row ?? null, error: null };
          }

          const isNaturalKeyLookup =
            state.asset_type && (state.symbol || state.currency);
          if (isNaturalKeyLookup) {
            const activeOnly = state["is:deleted_at"] === null;
            const softDeletedOnly =
              state["not:deleted_at"] === "is" &&
              state["not:deleted_at:value"] === null;
            let matches = holdings.filter((row) =>
              naturalKeyMatches(row, state, false),
            );

            if (activeOnly) {
              matches = matches.filter((row) => !row.deleted_at);
            } else if (softDeletedOnly) {
              matches = matches
                .filter((row) => Boolean(row.deleted_at))
                .sort((left, right) =>
                  String(right.deleted_at).localeCompare(String(left.deleted_at)),
                );
            }

            if (activeOnly && matches.length > 1) {
              return {
                data: null,
                error: {
                  code: "PGRST116",
                  message:
                    "JSON object requested, multiple (or no) rows returned",
                  details:
                    "Results contain 2 rows, application/vnd.pgrst.object+json requires 1 row",
                },
              };
            }

            return { data: matches[0] ?? null, error: null };
          }
        }

        if (table === "portfolio_sync_events" || table === "transactions") {
          return { data: null, error: null };
        }

        return { data: null, error: null };
      }),
      single: vi.fn(async (): Promise<QueryResult> => {
        if (table === "portfolios") {
          return {
            data: {
              id: PORTFOLIO_ID,
              name: "Main",
              is_primary: true,
              sync_version: portfolio.sync_version,
            },
            error: null,
          };
        }
        return { data: null, error: null };
      }),
      insert: vi.fn(async (payload: Record<string, unknown> | Record<string, unknown>[]) => {
        tableWrites.insert.push(table);
        const rows = Array.isArray(payload) ? payload : [payload];

        if (table === "holdings") {
          const row = rows[0]!;
          const duplicateActive = holdings.some(
            (item) =>
              !item.deleted_at &&
              item.portfolio_id === row.portfolio_id &&
              item.asset_type === row.asset_type &&
              item.symbol === row.symbol &&
              item.currency === row.currency,
          );

          if (duplicateActive) {
            return {
              data: null,
              error: {
                code: "23505",
                message: "duplicate key value violates unique constraint",
              },
            };
          }

          holdings.push(row);
          return { data: row, error: null };
        }

        if (table === "holding_instrument_mappings") {
          mappings.push(rows[0]!);
          return { data: rows[0], error: null };
        }

        return { data: rows[0], error: null };
      }),
      upsert: vi.fn(async (payload: Record<string, unknown>) => {
        tableWrites.update.push(table);
        if (table === "holding_instrument_mappings") {
          const holdingId = payload.holding_id as string;
          const portfolioId = payload.portfolio_id as string;
          const isin = payload.isin as string | null | undefined;
          const existingIndex = mappings.findIndex(
            (row) => row.holding_id === holdingId,
          );
          if (existingIndex >= 0) {
            mappings[existingIndex] = payload;
            return { data: payload, error: null };
          }

          if (isin) {
            const conflicting = mappings.find(
              (row) => row.portfolio_id === portfolioId && row.isin === isin,
            );
            if (conflicting) {
              return {
                data: null,
                error: {
                  code: "23505",
                  message:
                    'duplicate key value violates unique constraint "holding_instrument_mappings_portfolio_isin_idx"',
                  details: `Key (portfolio_id, isin)=(${portfolioId}, ${isin}) already exists.`,
                },
              };
            }
          }

          mappings.push(payload);
        }
        return { data: payload, error: null };
      }),
      update: vi.fn((payload: Record<string, unknown>) => {
        tableWrites.update.push(table);
        const chain = {
          eq: vi.fn((column: string, value: unknown) => {
            if (table === "holdings") {
              if (column === "id") {
                const row = holdings.find(
                  (item) => item.id === value && item.user_id === USER_ID,
                );
                if (row) Object.assign(row, payload);
              }
              if (column === "user_id") {
                state.user_id = value;
              }
            }
            return chain;
          }),
          in: vi.fn(() => chain),
          is: vi.fn(async () => ({ data: null, error: null })),
        };
        return chain;
      }),
      delete: vi.fn(() => {
        tableWrites.delete.push(table);
        const chain = {
          eq: vi.fn(() => chain),
          in: vi.fn(async () => ({ data: null, error: null })),
        };
        return chain;
      }),
      then(onFulfilled?: (value: QueryResult) => unknown, onRejected?: (reason: unknown) => unknown) {
        if (table === "portfolios") {
          return Promise.resolve({
            data: [
              {
                id: PORTFOLIO_ID,
                user_id: USER_ID,
                is_primary: true,
                name: "Main",
                created_at: "2026-01-01T00:00:00.000Z",
                sync_version: portfolio.sync_version,
              },
            ],
            error: null,
          }).then(onFulfilled, onRejected);
        }

        if (table === "holdings") {
          const activeOnly = state["is:deleted_at"] === null;
          const rows = activeOnly
            ? holdings.filter((row) => !row.deleted_at)
            : holdings;
          return Promise.resolve({ data: rows, error: null }).then(
            onFulfilled,
            onRejected,
          );
        }

        return Promise.resolve({ data: [], error: null }).then(onFulfilled, onRejected);
      },
    };

    return builder;
  });

  const rpc = vi.fn(async (fn: string, args: { p_plan?: Record<string, unknown> }) => {
    if (fn !== "commit_portfolio_sync") {
      return { data: null, error: { message: "unknown rpc" } };
    }
    const plan = args.p_plan ?? {};
    const baseVersion = Number(plan.base_version);
    if (baseVersion !== portfolio.sync_version) {
      return { data: null, error: { code: "PT409", message: "stale_version" } };
    }

    const plannedHoldings = (plan.holdings as Array<Record<string, unknown>>) ?? [];
    for (const row of plannedHoldings) {
      const existing = holdings.find((item) => item.id === row.id);
      if (existing) {
        Object.assign(existing, {
          name: row.name ?? existing.name,
          symbol: row.symbol ?? existing.symbol,
          sort_order: row.sort_order ?? existing.sort_order,
          deleted_at: null,
          metadata: row.metadata ?? existing.metadata,
        });
      } else {
        holdings.push({
          id: row.id,
          portfolio_id: PORTFOLIO_ID,
          user_id: USER_ID,
          asset_type: row.asset_type,
          symbol: row.symbol,
          name: row.name,
          quantity: 0,
          average_cost: row.asset_type === "cash" ? 1 : 0,
          currency: row.currency ?? "EUR",
          sort_order: row.sort_order ?? 0,
          deleted_at: null,
          metadata: row.metadata ?? {},
        });
      }
    }

    const ledgers = (plan.ledgers as Array<Record<string, unknown>>) ?? [];
    for (const ledger of ledgers) {
      if (ledger.supersede_existing) {
        for (const txn of transactions) {
          if (
            txn.holding_id === ledger.holding_id &&
            !txn.superseded_at &&
            (txn.source === "client_sync" || txn.source === "client_migration")
          ) {
            txn.superseded_at = new Date().toISOString();
          }
        }
      }
      if (Number(ledger.quantity) > 0) {
        transactions.push({ ...ledger, superseded_at: null });
        const holding = holdings.find((item) => item.id === ledger.holding_id);
        if (holding) {
          holding.quantity = ledger.quantity;
          holding.average_cost =
            ledger.type === "deposit" ? 1 : ledger.unit_price;
        }
      }
    }

    const softDeleteIds = (plan.soft_delete_ids as string[]) ?? [];
    const deletedAt = new Date().toISOString();
    for (const id of softDeleteIds) {
      const row = holdings.find((item) => item.id === id);
      if (row) row.deleted_at = deletedAt;
    }

    const mappingRows = (plan.mappings as Array<Record<string, unknown>>) ?? [];
    for (const mapping of mappingRows) {
      const existingIndex = mappings.findIndex(
        (row) => row.holding_id === mapping.holding_id,
      );
      if (existingIndex >= 0) mappings[existingIndex] = mapping;
      else mappings.push(mapping);
    }

    portfolio.sync_version += 1;
    return {
      data: {
        portfolio_id: PORTFOLIO_ID,
        resulting_version: portfolio.sync_version,
      },
      error: null,
    };
  });

  return {
    supabase: { from, rpc } as unknown as SupabaseClient,
    holdings,
    mappings,
    transactions,
    portfolio,
    tableWrites,
  };
}

describe("createPortfolioRepository natural-key sync", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("reuses a legacy active holding id instead of inserting a second row", async () => {
    const naturalId = resolveHoldingIdForSync(USER_ID, holding());
    expect(naturalId).not.toBe(LEGACY_HOLDING_ID);

    const { supabase, holdings, mappings, portfolio } = createMockSupabase([
      {
        id: LEGACY_HOLDING_ID,
        portfolio_id: PORTFOLIO_ID,
        user_id: USER_ID,
        asset_type: "investment",
        symbol: "VWCE",
        name: "Existing VWCE",
        quantity: 1,
        average_cost: 90,
        currency: "EUR",
        sort_order: 0,
        deleted_at: null,
      },
    ]);

    const repo = createPortfolioRepository(supabase);

    await repo.applySnapshot(USER_ID, [holding()], null, [], "sync", undefined, { baseVersion: portfolio.sync_version });

    expect(holdings.filter((row) => !row.deleted_at)).toHaveLength(1);
    expect(holdings.some((row) => row.id === naturalId)).toBe(false);
    expect(mappings).toHaveLength(1);
    expect(mappings[0]?.holding_id).toBe(LEGACY_HOLDING_ID);
  });

  it("findHoldingByUniqueKey returns the active row when a tombstone shares the natural key (no PGRST116)", async () => {
    const { supabase, holdings, mappings, portfolio } = createMockSupabase([
      {
        id: LEGACY_HOLDING_ID,
        portfolio_id: PORTFOLIO_ID,
        user_id: USER_ID,
        asset_type: "investment",
        symbol: "VWCE",
        name: "Active VWCE",
        quantity: 5,
        average_cost: 95,
        currency: "EUR",
        sort_order: 0,
        deleted_at: null,
      },
      {
        id: TOMBSTONE_HOLDING_ID,
        portfolio_id: PORTFOLIO_ID,
        user_id: USER_ID,
        asset_type: "investment",
        symbol: "VWCE",
        name: "Tombstone VWCE",
        quantity: 0,
        average_cost: 0,
        currency: "EUR",
        sort_order: 0,
        deleted_at: "2026-07-21T09:00:00.000Z",
      },
    ]);

    const repo = createPortfolioRepository(supabase);

    await expect(
      repo.applySnapshot(USER_ID, [holding()], null, [], "sync", undefined, { baseVersion: portfolio.sync_version }),
    ).resolves.toBeDefined();

    expect(holdings.filter((row) => !row.deleted_at)).toHaveLength(1);
    expect(holdings.find((row) => !row.deleted_at)?.id).toBe(LEGACY_HOLDING_ID);
    expect(holdings.some((row) => row.id === TOMBSTONE_HOLDING_ID)).toBe(true);
    expect(mappings).toHaveLength(1);
    expect(mappings[0]?.holding_id).toBe(LEGACY_HOLDING_ID);
  });

  it("revives the deterministic row after a failed sync soft-delete without PGRST116", async () => {
    const naturalId = resolveHoldingIdForSync(USER_ID, holding());

    const { supabase, holdings, mappings, portfolio } = createMockSupabase([
      {
        id: naturalId,
        portfolio_id: PORTFOLIO_ID,
        user_id: USER_ID,
        asset_type: "investment",
        symbol: "VWCE",
        name: "Old VWCE",
        quantity: 0,
        average_cost: 0,
        currency: "EUR",
        sort_order: 0,
        deleted_at: "2026-07-21T09:00:00.000Z",
      },
    ]);

    const repo = createPortfolioRepository(supabase);

    await expect(
      repo.applySnapshot(USER_ID, [holding()], null, [], "sync", undefined, { baseVersion: portfolio.sync_version }),
    ).resolves.toBeDefined();

    expect(holdings.filter((row) => !row.deleted_at)).toHaveLength(1);
    expect(holdings[0]?.id).toBe(naturalId);
    expect(mappings).toHaveLength(1);
    expect(mappings[0]?.holding_id).toBe(naturalId);
  });

  it("remains idempotent when the same import is applied repeatedly", async () => {
    const { supabase, holdings, mappings, portfolio } = createMockSupabase([]);
    const repo = createPortfolioRepository(supabase);
    const payload = [
      holding(),
      holding({
        id: "other-row",
        symbol: "IWDA",
        isin: "IE00B4L5Y983",
        providerSymbol: "IWDA.AS",
      }),
    ];

    await repo.applySnapshot(USER_ID, payload, null, [], "sync", undefined, { baseVersion: portfolio.sync_version });
    await repo.applySnapshot(USER_ID, payload, null, [], "sync", undefined, { baseVersion: portfolio.sync_version });

    expect(holdings.filter((row) => !row.deleted_at)).toHaveLength(2);
    expect(mappings).toHaveLength(2);
  });

  it("retry sync after partial failure does not create duplicate active holdings", async () => {
    const naturalId = resolveHoldingIdForSync(USER_ID, holding());
    const { supabase, holdings, portfolio } = createMockSupabase([
      {
        id: naturalId,
        portfolio_id: PORTFOLIO_ID,
        user_id: USER_ID,
        asset_type: "investment",
        symbol: "VWCE",
        name: "Rolled back VWCE",
        quantity: 0,
        average_cost: 0,
        currency: "EUR",
        sort_order: 0,
        deleted_at: "2026-07-21T10:00:00.000Z",
      },
    ]);
    const repo = createPortfolioRepository(supabase);
    const payload = [holding()];

    await repo.applySnapshot(USER_ID, payload, null, [], "sync", undefined, { baseVersion: portfolio.sync_version });
    await repo.applySnapshot(USER_ID, payload, null, [], "sync", undefined, { baseVersion: portfolio.sync_version });

    expect(holdings.filter((row) => !row.deleted_at)).toHaveLength(1);
    expect(holdings.filter((row) => row.symbol === "VWCE" && !row.deleted_at)).toHaveLength(1);
  });

  it("importing the same five-instrument screenshot twice keeps one active row per instrument", async () => {
    const { supabase, holdings, portfolio } = createMockSupabase([]);
    const repo = createPortfolioRepository(supabase);
    const payload = importScreenshotHoldings();

    await repo.applySnapshot(USER_ID, payload, null, [], "sync", undefined, { baseVersion: portfolio.sync_version });
    await repo.applySnapshot(USER_ID, payload, null, [], "sync", undefined, { baseVersion: portfolio.sync_version });

    const active = holdings.filter((row) => !row.deleted_at);
    expect(active).toHaveLength(5);

    const symbols = active.map((row) =>
      row.asset_type === "cash" ? row.currency : row.symbol,
    );
    expect(new Set(symbols).size).toBe(5);
    expect(symbols).toEqual(
      expect.arrayContaining(["VWCE", "IWDA", "STRC", "ASML", "EUR"]),
    );
  });

  it("revives a soft-deleted legacy holding instead of violating holding_instrument_mappings_portfolio_isin_idx", async () => {
    const legacyId = "33333333-3333-4333-8333-333333333333";
    const naturalId = resolveHoldingIdForSync(USER_ID, holding());
    expect(naturalId).not.toBe(legacyId);

    const { supabase, holdings, mappings, portfolio } = createMockSupabase([
      {
        id: legacyId,
        portfolio_id: PORTFOLIO_ID,
        user_id: USER_ID,
        asset_type: "investment",
        symbol: "VWCE",
        name: "Old VWCE",
        quantity: 0,
        average_cost: 0,
        currency: "EUR",
        sort_order: 0,
        deleted_at: "2026-07-21T10:00:00.000Z",
      },
    ]);
    mappings.push({
      holding_id: legacyId,
      user_id: USER_ID,
      portfolio_id: PORTFOLIO_ID,
      isin: "IE00BK5BQT80",
      provider_symbol: "VWCE.XETRA",
    });

    const repo = createPortfolioRepository(supabase);

    await expect(
      repo.applySnapshot(USER_ID, [holding()], null, [], "sync", undefined, { baseVersion: portfolio.sync_version }),
    ).resolves.toBeDefined();

    const active = holdings.filter((row) => !row.deleted_at);
    expect(active).toHaveLength(1);
    expect(active[0]?.id).toBe(legacyId);
    expect(holdings.some((row) => row.id === naturalId && !row.deleted_at)).toBe(
      false,
    );
    expect(mappings).toHaveLength(1);
    expect(mappings[0]?.holding_id).toBe(legacyId);
    expect(mappings[0]?.isin).toBe("IE00BK5BQT80");

    await expect(
      repo.applySnapshot(USER_ID, [holding()], null, [], "sync", undefined, { baseVersion: portfolio.sync_version }),
    ).resolves.toBeDefined();
    expect(holdings.filter((row) => !row.deleted_at)).toHaveLength(1);
  });

  it("B/D. a stale ISIN mapping does not fail or duplicate a successful holding write", async () => {
    const { supabase, holdings, mappings, portfolio } = createMockSupabase([]);
    mappings.push({
      holding_id: "99999999-9999-4999-8999-999999999999",
      user_id: USER_ID,
      portfolio_id: PORTFOLIO_ID,
      isin: "IE00BK5BQT80",
      provider_symbol: "VWCE.XETRA",
    });

    const repo = createPortfolioRepository(supabase);
    const first = holding({ symbol: "VWCE", quantity: 10 });

    await expect(
      repo.applySnapshot(USER_ID, [first], null, [], "sync", PORTFOLIO_ID, { baseVersion: portfolio.sync_version }),
    ).resolves.toBeDefined();

    const activeAfterWrite = holdings.filter((row) => !row.deleted_at);
    expect(activeAfterWrite).toHaveLength(1);
    expect(activeAfterWrite[0]?.symbol).toBe("VWCE");
    expect(activeAfterWrite[0]?.portfolio_id).toBe(PORTFOLIO_ID);

    await expect(
      repo.applySnapshot(USER_ID, [first], null, [], "sync", PORTFOLIO_ID, { baseVersion: portfolio.sync_version }),
    ).resolves.toBeDefined();
    expect(holdings.filter((row) => !row.deleted_at)).toHaveLength(1);
  });

  it("findPrimaryPortfolioId and fetchSnapshot do not insert or update portfolios", async () => {
    const { supabase, tableWrites } = createMockSupabase([]);
    const repo = createPortfolioRepository(supabase);

    await expect(repo.findPrimaryPortfolioId(USER_ID)).resolves.toBe(PORTFOLIO_ID);
    await expect(repo.fetchSnapshot(USER_ID)).resolves.toMatchObject({
      portfolioId: PORTFOLIO_ID,
      syncVersion: 0,
    });

    expect(tableWrites.insert.filter((table) => table === "portfolios")).toEqual([]);
    expect(tableWrites.update.filter((table) => table === "portfolios")).toEqual([]);
    expect(tableWrites.delete.filter((table) => table === "portfolios")).toEqual([]);
  });

  it("applySnapshot never hard-deletes ledger rows", async () => {
    const { supabase, tableWrites, portfolio } = createMockSupabase([]);
    const repo = createPortfolioRepository(supabase);

    await repo.applySnapshot(USER_ID, [holding()], null, [], "sync", PORTFOLIO_ID, {
      baseVersion: portfolio.sync_version,
    });

    expect(tableWrites.delete).not.toContain("transactions");
  });
});
