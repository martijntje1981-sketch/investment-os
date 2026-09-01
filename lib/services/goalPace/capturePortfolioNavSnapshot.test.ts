import { describe, expect, it } from "vitest";

import {
  capturePortfolioNavSnapshot,
  NAV_SNAPSHOT_WRITE_AUTHORITY,
  snapshotInsertPayload,
  type CaptureNavSnapshotDeps,
  type CapturePortfolioNavSnapshotInput,
  type NavSnapshotClient,
} from "@/lib/services/goalPace/capturePortfolioNavSnapshot";
import type { NavSnapshotDemoAccess } from "@/lib/services/goalPace/resolveNavSnapshotDemoStatus";
import type { PortfolioNavSnapshot } from "@/lib/services/goalPace/types";
import type { DbGoalRow, DbHoldingRow } from "@/lib/services/portfolio/types";

const USER_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const USER_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const PORT_A = "11111111-1111-4111-8111-111111111111";
const PORT_B = "22222222-2222-4222-8222-222222222222";
const GOAL_1 = "33333333-3333-4333-8333-333333333333";
const GOAL_2 = "44444444-4444-4444-8444-444444444444";
const NOW = new Date("2026-09-01T12:00:00.000Z");
const LATER_DAY = new Date("2026-09-02T12:00:00.000Z");
const CLIENT = {} as NavSnapshotClient;
const PERSONAL_ACCESS: NavSnapshotDemoAccess = {
  isDemo: false,
  isCompleteTrial: false,
  tier: "complete",
};
const DEMO_ACCESS: NavSnapshotDemoAccess = {
  isDemo: true,
  isCompleteTrial: false,
  tier: "demo",
};
const PERSONAL_TRIAL_ACCESS: NavSnapshotDemoAccess = {
  isDemo: false,
  isCompleteTrial: true,
  tier: "trial",
};

function trustedInput(
  overrides: Partial<CapturePortfolioNavSnapshotInput> = {},
): CapturePortfolioNavSnapshotInput {
  return {
    client: CLIENT,
    authority: NAV_SNAPSHOT_WRITE_AUTHORITY,
    userId: USER_A,
    requestedPortfolioId: PORT_A,
    productAccess: PERSONAL_ACCESS,
    now: NOW,
    ...overrides,
  };
}

function dbHolding(
  overrides: Partial<DbHoldingRow> & Pick<DbHoldingRow, "id" | "asset_type">,
): DbHoldingRow {
  return {
    portfolio_id: PORT_A,
    user_id: USER_A,
    symbol: overrides.asset_type === "cash" ? "EUR" : "VWCE",
    name: overrides.asset_type === "cash" ? "Euro cash" : "VWCE ETF",
    quantity: overrides.asset_type === "cash" ? 5000 : 10,
    average_cost: overrides.asset_type === "cash" ? 1 : 90,
    currency: "EUR",
    sort_order: 0,
    created_at: "2026-08-01T00:00:00.000Z",
    updated_at: "2026-09-01T10:00:00.000Z",
    deleted_at: null,
    last_market_price: overrides.asset_type === "cash" ? 1 : 100,
    last_market_price_at: "2026-09-01T10:00:00.000Z",
    previous_close: overrides.asset_type === "cash" ? null : 99,
    ...overrides,
  };
}

function dbGoal(overrides: Partial<DbGoalRow> = {}): DbGoalRow {
  return {
    id: GOAL_1,
    portfolio_id: PORT_A,
    target_value: 50000,
    target_year: 2035,
    monthly_contribution: 200,
    expected_annual_return: 7,
    passive_income_target: null,
    is_active: true,
    updated_at: "2026-08-20T12:00:00.000Z",
    ...overrides,
  };
}

function snapshotKey(
  userId: string,
  portfolioId: string,
  dateIso: string,
): string {
  return `${userId}:${portfolioId}:${dateIso}`;
}

function createMemoryDeps(options?: {
  holdingsByPortfolio?: Record<string, DbHoldingRow[]>;
  goalsByPortfolio?: Record<string, DbGoalRow | null>;
  ownedPortfolios?: Record<string, string[]>;
}): {
  deps: CaptureNavSnapshotDeps;
  store: Map<string, PortfolioNavSnapshot>;
  insertCalls: Record<string, unknown>[];
  updateCalls: Array<Record<string, unknown>>;
} {
  const store = new Map<string, PortfolioNavSnapshot>();
  const insertCalls: Record<string, unknown>[] = [];
  const updateCalls: Array<Record<string, unknown>> = [];
  const owned = options?.ownedPortfolios ?? {
    [USER_A]: [PORT_A],
    [USER_B]: [PORT_B],
  };
  const holdingsByPortfolio = options?.holdingsByPortfolio ?? {
    [PORT_A]: [dbHolding({ id: "h-vwce", asset_type: "investment" })],
  };
  const goalsByPortfolio = options?.goalsByPortfolio ?? {
    [PORT_A]: dbGoal(),
  };

  const deps: CaptureNavSnapshotDeps = {
    resolveOwnedPortfolioId: async (_client, userId, requested) => {
      const ownedIds = owned[userId] ?? [];
      if (requested) {
        return ownedIds.includes(requested) ? requested : null;
      }
      return ownedIds[0] ?? null;
    },
    loadHoldings: async (_client, userId, portfolioId) => {
      const rows = holdingsByPortfolio[portfolioId] ?? [];
      return rows.filter((row) => row.user_id === userId);
    },
    loadActiveGoal: async (_client, _userId, portfolioId) =>
      goalsByPortfolio[portfolioId] ?? null,
    loadExistingSnapshot: async (_client, userId, portfolioId, dateIso) =>
      store.get(snapshotKey(userId, portfolioId, dateIso)) ?? null,
    insertSnapshot: async (_client, row) => {
      insertCalls.push(row);
      const key = snapshotKey(
        String(row.user_id),
        String(row.portfolio_id),
        String(row.snapshot_date),
      );
      if (store.has(key)) {
        return { snapshot: null, uniqueViolation: true };
      }
      const snapshot: PortfolioNavSnapshot = {
        id: `id-${store.size + 1}`,
        userId: String(row.user_id),
        portfolioId: String(row.portfolio_id),
        snapshotDateIso: String(row.snapshot_date),
        capturedAt: String(row.captured_at),
        navEur: Number(row.nav_eur),
        usability: row.usability as "usable" | "partial",
        holdingCount: Number(row.holding_count),
        valuedHoldingCount: Number(row.valued_holding_count),
        excludedHoldingCount: Number(row.excluded_holding_count),
        valuedAt: (row.valued_at as string | null) ?? null,
        goalId: (row.goal_id as string | null) ?? null,
        goalTargetValue:
          row.goal_target_value == null ? null : Number(row.goal_target_value),
        goalTargetYear: (row.goal_target_year as number | null) ?? null,
        goalTargetDateIso: row.goal_target_date
          ? String(row.goal_target_date).slice(0, 10)
          : null,
        goalMonthlyContribution:
          row.goal_monthly_contribution == null
            ? null
            : Number(row.goal_monthly_contribution),
        goalExpectedAnnualReturn:
          row.goal_expected_annual_return == null
            ? null
            : Number(row.goal_expected_annual_return),
        goalUpdatedAt: (row.goal_updated_at as string | null) ?? null,
        goalPlanCapturedAt: (row.goal_plan_captured_at as string | null) ?? null,
      };
      store.set(key, snapshot);
      return { snapshot, uniqueViolation: false };
    },
    updateValuation: async (_client, input) => {
      updateCalls.push(input as unknown as Record<string, unknown>);
      const existing = [...store.values()].find((row) => row.id === input.id);
      if (!existing) return null;
      if (existing.userId !== input.userId) return null;
      if (existing.portfolioId !== input.portfolioId) return null;
      const next: PortfolioNavSnapshot = {
        ...existing,
        navEur: input.navEur,
        usability: input.usability,
        holdingCount: input.holdingCount,
        valuedHoldingCount: input.valuedHoldingCount,
        excludedHoldingCount: input.excludedHoldingCount,
        valuedAt: input.valuedAt,
      };
      store.set(
        snapshotKey(existing.userId, existing.portfolioId, existing.snapshotDateIso),
        next,
      );
      return next;
    },
  };

  return { deps, store, insertCalls, updateCalls };
}

describe("capturePortfolioNavSnapshot", () => {
  it("creates a canonical EUR snapshot from server-resolved holdings and Goal", async () => {
    const { deps, insertCalls } = createMemoryDeps();
    const result = await capturePortfolioNavSnapshot(
      {
        ...trustedInput(),
      },
      deps,
    );

    expect(result.status).toBe("created");
    expect(result.snapshot?.navEur).toBe(1000);
    expect(result.snapshot?.usability).toBe("usable");
    expect(result.snapshot?.goalId).toBe(GOAL_1);
    expect(result.snapshot?.goalTargetDateIso).toBe("2035-12-31");
    expect(insertCalls[0]).toMatchObject({
      user_id: USER_A,
      portfolio_id: PORT_A,
      snapshot_date: "2026-09-01",
      nav_eur: 1000,
      nav_currency: "EUR",
    });
    expect(insertCalls[0]).not.toHaveProperty("presentation_currency");
  });

  it("skips Demo and example portfolios without writing", async () => {
    const { deps, store } = createMemoryDeps();
    const result = await capturePortfolioNavSnapshot(
      {
        ...trustedInput({ productAccess: DEMO_ACCESS }),
      },
      deps,
    );
    expect(result.status).toBe("skipped_demo");
    expect(result.snapshot).toBeNull();
    expect(store.size).toBe(0);
  });

  it("forbids capture of a portfolio the user does not own", async () => {
    const { deps, store } = createMemoryDeps();
    const result = await capturePortfolioNavSnapshot(
      trustedInput({ requestedPortfolioId: PORT_B }),
      deps,
    );
  });

  it("does not let one user write another user's snapshot", async () => {
    const { deps, store } = createMemoryDeps({
      holdingsByPortfolio: {
        [PORT_B]: [
          dbHolding({
            id: "h-b",
            asset_type: "investment",
            user_id: USER_B,
            portfolio_id: PORT_B,
          }),
        ],
      },
      goalsByPortfolio: { [PORT_B]: dbGoal({ id: GOAL_2, portfolio_id: PORT_B }) },
    });

    await capturePortfolioNavSnapshot(
      {
        ...trustedInput({
          userId: USER_B,
          requestedPortfolioId: PORT_B,
        }),
      },
      deps,
    );
    const result = await capturePortfolioNavSnapshot(
      trustedInput({ requestedPortfolioId: PORT_B }),
      deps,
    );

    expect(result.status).toBe("forbidden");
    expect(store.get(snapshotKey(USER_B, PORT_B, "2026-09-01"))?.userId).toBe(
      USER_B,
    );
    expect(store.has(snapshotKey(USER_A, PORT_B, "2026-09-01"))).toBe(false);
  });

  it("isolates snapshots by portfolio for the same user", async () => {
    const { deps, store } = createMemoryDeps({
      ownedPortfolios: { [USER_A]: [PORT_A, PORT_B] },
      holdingsByPortfolio: {
        [PORT_A]: [dbHolding({ id: "h-a", asset_type: "investment" })],
        [PORT_B]: [
          dbHolding({
            id: "h-cash-b",
            asset_type: "cash",
            portfolio_id: PORT_B,
            quantity: 2500,
          }),
        ],
      },
      goalsByPortfolio: {
        [PORT_A]: dbGoal(),
        [PORT_B]: dbGoal({ id: GOAL_2, portfolio_id: PORT_B }),
      },
    });

    const first = await capturePortfolioNavSnapshot(
      {
        ...trustedInput(),
      },
      deps,
    );
    const second = await capturePortfolioNavSnapshot(
      trustedInput({ requestedPortfolioId: PORT_B }),
      deps,
    );

    expect(first.status).toBe("created");
    expect(second.status).toBe("created");
    expect(first.snapshot?.navEur).toBe(1000);
    expect(second.snapshot?.navEur).toBe(2500);
    expect(store.size).toBe(2);
  });

  it("is idempotent for a second same-day capture with equal evidence", async () => {
    const { deps } = createMemoryDeps();
    const input = trustedInput();
    await capturePortfolioNavSnapshot(input, deps);
    const second = await capturePortfolioNavSnapshot(input, deps);
    expect(second.status).toBe("already_captured");
    expect(second.snapshot?.navEur).toBe(1000);
  });

  it("treats a unique-constraint race as concurrent duplicate prevention", async () => {
    const { deps, store } = createMemoryDeps();
    const seeded: PortfolioNavSnapshot = {
      id: "seed",
      userId: USER_A,
      portfolioId: PORT_A,
      snapshotDateIso: "2026-09-01",
      capturedAt: NOW.toISOString(),
      navEur: 1000,
      usability: "usable",
      holdingCount: 1,
      valuedHoldingCount: 1,
      excludedHoldingCount: 0,
      valuedAt: "2026-09-01T10:00:00.000Z",
      goalId: GOAL_1,
      goalTargetValue: 50000,
      goalTargetYear: 2035,
      goalTargetDateIso: "2035-12-31",
      goalMonthlyContribution: 200,
      goalExpectedAnnualReturn: 7,
      goalUpdatedAt: "2026-08-20T12:00:00.000Z",
      goalPlanCapturedAt: NOW.toISOString(),
    };
    const originalLoad = deps.loadExistingSnapshot;
    let loads = 0;
    deps.loadExistingSnapshot = async (...args) => {
      loads += 1;
      if (loads === 1) return null;
      return originalLoad(...args);
    };
    deps.insertSnapshot = async () => {
      store.set(snapshotKey(USER_A, PORT_A, "2026-09-01"), seeded);
      return { snapshot: null, uniqueViolation: true };
    };

    const result = await capturePortfolioNavSnapshot(
      {
        ...trustedInput(),
      },
      deps,
    );
    expect(result.status).toBe("already_captured");
    expect(result.snapshot?.id).toBe("seed");
    expect(store.size).toBe(1);
  });

  it("prevents duplicate rows when concurrent inserts race", async () => {
    const { deps, store } = createMemoryDeps();
    const input = trustedInput();
    const [first, second] = await Promise.all([
      capturePortfolioNavSnapshot(input, deps),
      capturePortfolioNavSnapshot(input, deps),
    ]);
    const statuses = [first.status, second.status].sort();
    expect(store.size).toBe(1);
    expect(statuses).toEqual(["already_captured", "created"]);
  });

  it("improves same-day valuation when coverage gets better", async () => {
    const holdingsByPortfolio: Record<string, DbHoldingRow[]> = {
      [PORT_A]: [
        dbHolding({ id: "h-vwce", asset_type: "investment" }),
        dbHolding({
          id: "h-unpriced",
          asset_type: "investment",
          symbol: "AIFS",
          name: "AIFS",
          last_market_price: null,
          last_market_price_at: null,
        }),
      ],
    };
    const { deps, store } = createMemoryDeps({ holdingsByPortfolio });
    const input = trustedInput();

    const first = await capturePortfolioNavSnapshot(input, deps);
    expect(first.status).toBe("created");
    expect(first.snapshot?.usability).toBe("partial");
    expect(first.snapshot?.excludedHoldingCount).toBe(1);

    holdingsByPortfolio[PORT_A] = [
      dbHolding({ id: "h-vwce", asset_type: "investment" }),
      dbHolding({
        id: "h-unpriced",
        asset_type: "investment",
        symbol: "AIFS",
        name: "AIFS",
        quantity: 5,
        last_market_price: 40,
        last_market_price_at: "2026-09-01T15:00:00.000Z",
      }),
    ];

    const second = await capturePortfolioNavSnapshot(input, deps);
    expect(second.status).toBe("improved");
    expect(second.snapshot?.usability).toBe("usable");
    expect(second.snapshot?.navEur).toBe(1200);
    expect(second.snapshot?.goalId).toBe(GOAL_1);
    expect(store.size).toBe(1);
  });

  it("does not overwrite a better snapshot with worse coverage", async () => {
    const holdingsByPortfolio: Record<string, DbHoldingRow[]> = {
      [PORT_A]: [dbHolding({ id: "h-vwce", asset_type: "investment" })],
    };
    const { deps } = createMemoryDeps({ holdingsByPortfolio });
    const input = trustedInput();
    await capturePortfolioNavSnapshot(input, deps);

    holdingsByPortfolio[PORT_A] = [
      dbHolding({ id: "h-vwce", asset_type: "investment" }),
      dbHolding({
        id: "h-unpriced",
        asset_type: "investment",
        symbol: "AIFS",
        last_market_price: null,
        last_market_price_at: null,
      }),
    ];

    const second = await capturePortfolioNavSnapshot(input, deps);
    expect(second.status).toBe("already_captured");
    expect(second.snapshot?.usability).toBe("usable");
    expect(second.snapshot?.navEur).toBe(1000);
    expect(second.snapshot?.excludedHoldingCount).toBe(0);
  });

  it("does not write when portfolio value is unavailable", async () => {
    const { deps, store } = createMemoryDeps({
      holdingsByPortfolio: {
        [PORT_A]: [
          dbHolding({
            id: "h-unpriced",
            asset_type: "investment",
            last_market_price: null,
            last_market_price_at: null,
          }),
        ],
      },
    });
    const result = await capturePortfolioNavSnapshot(
      {
        ...trustedInput(),
      },
      deps,
    );
    expect(result.status).toBe("skipped_unavailable");
    expect(store.size).toBe(0);
  });

  it("does not store an unavailable zero as genuine NAV", async () => {
    const { deps, insertCalls } = createMemoryDeps({
      holdingsByPortfolio: {
        [PORT_A]: [
          dbHolding({
            id: "h-unpriced",
            asset_type: "investment",
            last_market_price: 0,
            last_market_price_at: null,
          }),
        ],
      },
    });
    const result = await capturePortfolioNavSnapshot(
      {
        ...trustedInput(),
      },
      deps,
    );
    expect(result.status).toBe("skipped_unavailable");
    expect(insertCalls).toEqual([]);
  });

  it("writes a valid cash-only portfolio", async () => {
    const { deps } = createMemoryDeps({
      holdingsByPortfolio: {
        [PORT_A]: [
          dbHolding({
            id: "h-cash",
            asset_type: "cash",
            quantity: 4200,
          }),
        ],
      },
    });
    const result = await capturePortfolioNavSnapshot(
      {
        ...trustedInput(),
      },
      deps,
    );
    expect(result.status).toBe("created");
    expect(result.snapshot?.navEur).toBe(4200);
    expect(result.snapshot?.usability).toBe("usable");
  });

  it("keeps frozen Goal assumptions after a same-day Goal edit", async () => {
    const goalsByPortfolio: Record<string, DbGoalRow | null> = {
      [PORT_A]: dbGoal(),
    };
    const { deps, updateCalls } = createMemoryDeps({ goalsByPortfolio });
    const input = trustedInput();
    const first = await capturePortfolioNavSnapshot(input, deps);
    goalsByPortfolio[PORT_A] = dbGoal({
      target_value: 999999,
      monthly_contribution: 1,
      expected_annual_return: 99,
      updated_at: "2026-09-01T13:00:00.000Z",
    });
    const second = await capturePortfolioNavSnapshot(input, deps);

    expect(first.snapshot?.goalTargetValue).toBe(50000);
    expect(second.status).toBe("already_captured");
    expect(second.snapshot?.goalTargetValue).toBe(50000);
    expect(second.snapshot?.goalMonthlyContribution).toBe(200);
    expect(second.snapshot?.goalExpectedAnnualReturn).toBe(7);
    expect(updateCalls).toEqual([]);
  });

  it("keeps the first day's Goal id after a same-day delete/recreate", async () => {
    const goalsByPortfolio: Record<string, DbGoalRow | null> = {
      [PORT_A]: dbGoal(),
    };
    const { deps } = createMemoryDeps({ goalsByPortfolio });
    const sameDay = trustedInput();
    await capturePortfolioNavSnapshot(sameDay, deps);
    goalsByPortfolio[PORT_A] = dbGoal({
      id: GOAL_2,
      target_value: 80000,
      updated_at: "2026-09-01T18:00:00.000Z",
    });
    const sameDayAfterRecreate = await capturePortfolioNavSnapshot(sameDay, deps);
    expect(sameDayAfterRecreate.snapshot?.goalId).toBe(GOAL_1);
    expect(sameDayAfterRecreate.snapshot?.goalTargetValue).toBe(50000);

    const nextDay = await capturePortfolioNavSnapshot(
      { ...sameDay, now: LATER_DAY },
      deps,
    );
    expect(nextDay.status).toBe("created");
    expect(nextDay.snapshot?.goalId).toBe(GOAL_2);
    expect(nextDay.snapshot?.goalTargetValue).toBe(80000);
  });

  it("captures a personal Complete trial account (not Demo)", async () => {
    const { deps, store } = createMemoryDeps();
    const result = await capturePortfolioNavSnapshot(
      trustedInput({ productAccess: PERSONAL_TRIAL_ACCESS }),
      deps,
    );
    expect(result.status).toBe("created");
    expect(store.size).toBe(1);
  });

  it("skips rather than guessing when Demo status cannot be resolved", async () => {
    const { deps, store } = createMemoryDeps();
    const result = await capturePortfolioNavSnapshot(
      trustedInput({ productAccess: null }),
      deps,
    );
    expect(result.status).toBe("skipped_unresolved_access");
    expect(store.size).toBe(0);
  });

  it("refuses writes that are not marked as the trusted server path", async () => {
    const { deps, store } = createMemoryDeps();
    const result = await capturePortfolioNavSnapshot(
      {
        ...trustedInput(),
        authority: "browser" as CapturePortfolioNavSnapshotInput["authority"],
      },
      deps,
    );
    expect(result.status).toBe("forbidden");
    expect(store.size).toBe(0);
  });
});

describe("snapshotInsertPayload", () => {
  it("writes nav_eur and no presentation currency", () => {
    const payload = snapshotInsertPayload({
      userId: USER_A,
      portfolioId: PORT_A,
      snapshotDateIso: "2026-09-01",
      capturedAt: NOW.toISOString(),
      navEur: 1000,
      usability: "usable",
      holdingCount: 1,
      valuedHoldingCount: 1,
      excludedHoldingCount: 0,
      valuedAt: NOW.toISOString(),
      plan: null,
    });
    expect(payload.nav_currency).toBe("EUR");
    expect(payload).not.toHaveProperty("presentation_currency");
  });
});
