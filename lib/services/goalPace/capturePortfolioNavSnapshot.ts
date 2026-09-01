/**
 * Server-only prospective NAV snapshot writer.
 * Writes through a trusted server/admin client after explicit ownership checks.
 * Never accepts client-supplied NAV, user id, ownership, Goal fields, or isDemo.
 * Phase A1: not invoked from Dashboard, routes, cron, or providers.
 */

import { mapDbHoldingToStored } from "@/lib/services/portfolio/mappers";
import { isUniqueViolation } from "@/lib/services/portfolio/idempotency";
import type { DbGoalRow, DbHoldingRow } from "@/lib/services/portfolio/types";
import {
  evaluateNavSnapshotWrite,
  resolveCanonicalNavValuation,
} from "@/lib/services/goalPace/evaluateNavSnapshotCapture";
import { buildFrozenGoalPlan } from "@/lib/services/goalPace/goalPlanFreeze";
import { resolveNavSnapshotDemoStatus } from "@/lib/services/goalPace/resolveNavSnapshotDemoStatus";
import type { NavSnapshotDemoAccess } from "@/lib/services/goalPace/resolveNavSnapshotDemoStatus";
import {
  PORTFOLIO_NAV_SNAPSHOTS_TABLE,
  type CapturePortfolioNavSnapshotResult,
  type FrozenGoalPlan,
  type PortfolioNavSnapshot,
} from "@/lib/services/goalPace/types";

export const NAV_SNAPSHOT_WRITE_AUTHORITY = "trusted_server" as const;

export type NavSnapshotClient = {
  from: (table: string) => unknown;
};

export type CapturePortfolioNavSnapshotInput = {
  /** Service-role / admin client. Authenticated browser clients cannot INSERT. */
  client: NavSnapshotClient;
  /** Must be the trusted-server marker. Do not accept a browser-supplied authority. */
  authority: typeof NAV_SNAPSHOT_WRITE_AUTHORITY;
  /** Authenticated user id from the trusted server session, never from the request body. */
  userId: string;
  requestedPortfolioId?: string | null;
  /** Server-resolved product access. Never a browser isDemo boolean. */
  productAccess: NavSnapshotDemoAccess | null;
  now?: Date;
};

type NavSnapshotRow = {
  id: string;
  user_id: string;
  portfolio_id: string;
  snapshot_date: string;
  captured_at: string;
  nav_eur: number | string;
  usability: "usable" | "partial";
  holding_count: number;
  valued_holding_count: number;
  excluded_holding_count: number;
  valued_at: string | null;
  goal_id: string | null;
  goal_target_value: number | string | null;
  goal_target_year: number | null;
  goal_target_date: string | null;
  goal_monthly_contribution: number | string | null;
  goal_expected_annual_return: number | string | null;
  goal_updated_at: string | null;
  goal_plan_captured_at: string | null;
};

export type CaptureNavSnapshotDeps = {
  resolveOwnedPortfolioId: (
    client: NavSnapshotClient,
    userId: string,
    requestedPortfolioId?: string | null,
  ) => Promise<string | null>;
  loadHoldings: (
    client: NavSnapshotClient,
    userId: string,
    portfolioId: string,
  ) => Promise<DbHoldingRow[]>;
  loadActiveGoal: (
    client: NavSnapshotClient,
    userId: string,
    portfolioId: string,
  ) => Promise<DbGoalRow | null>;
  loadExistingSnapshot: (
    client: NavSnapshotClient,
    userId: string,
    portfolioId: string,
    snapshotDateIso: string,
  ) => Promise<PortfolioNavSnapshot | null>;
  insertSnapshot: (
    client: NavSnapshotClient,
    row: Record<string, unknown>,
  ) => Promise<{ snapshot: PortfolioNavSnapshot | null; uniqueViolation: boolean }>;
  updateValuation: (
    client: NavSnapshotClient,
    input: {
      id: string;
      userId: string;
      portfolioId: string;
      navEur: number;
      usability: "usable" | "partial";
      holdingCount: number;
      valuedHoldingCount: number;
      excludedHoldingCount: number;
      valuedAt: string | null;
    },
  ) => Promise<PortfolioNavSnapshot | null>;
};

function toNumber(value: number | string | null | undefined): number | null {
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function utcDateIso(now: Date): string {
  return now.toISOString().slice(0, 10);
}

function result(
  status: CapturePortfolioNavSnapshotResult["status"],
  snapshot: PortfolioNavSnapshot | null,
  message: string,
): CapturePortfolioNavSnapshotResult {
  return { status, snapshot, message };
}

export function mapNavSnapshotRow(row: NavSnapshotRow): PortfolioNavSnapshot {
  return {
    id: row.id,
    userId: row.user_id,
    portfolioId: row.portfolio_id,
    snapshotDateIso: String(row.snapshot_date).slice(0, 10),
    capturedAt: row.captured_at,
    navEur: Number(row.nav_eur),
    usability: row.usability,
    holdingCount: row.holding_count,
    valuedHoldingCount: row.valued_holding_count,
    excludedHoldingCount: row.excluded_holding_count,
    valuedAt: row.valued_at,
    goalId: row.goal_id,
    goalTargetValue: toNumber(row.goal_target_value),
    goalTargetYear: row.goal_target_year,
    goalTargetDateIso: row.goal_target_date
      ? String(row.goal_target_date).slice(0, 10)
      : null,
    goalMonthlyContribution: toNumber(row.goal_monthly_contribution),
    goalExpectedAnnualReturn: toNumber(row.goal_expected_annual_return),
    goalUpdatedAt: row.goal_updated_at,
    goalPlanCapturedAt: row.goal_plan_captured_at,
  };
}

type QueryResult = {
  data: unknown;
  error: { code?: string; message?: string } | null;
};

type FilterBuilder = {
  select: (columns: string) => FilterBuilder;
  eq: (column: string, value: string | boolean | number) => FilterBuilder;
  is: (column: string, value: null) => FilterBuilder;
  order: (column: string, options: { ascending: boolean }) => FilterBuilder;
  insert: (value: Record<string, unknown>) => FilterBuilder;
  update: (value: Record<string, unknown>) => FilterBuilder;
  maybeSingle: () => Promise<QueryResult>;
  then: Promise<QueryResult>["then"];
};

function table(client: NavSnapshotClient, name: string): FilterBuilder {
  return client.from(name) as FilterBuilder;
}

export async function resolveOwnedPortfolioId(
  client: NavSnapshotClient,
  userId: string,
  requestedPortfolioId?: string | null,
): Promise<string | null> {
  if (requestedPortfolioId) {
    const { data, error } = await table(client, "portfolios")
      .select("id")
      .eq("id", requestedPortfolioId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message || "Could not load portfolio.");
    return (data as { id?: string } | null)?.id ?? null;
  }

  const { data, error } = await table(client, "portfolios")
    .select("id")
    .eq("user_id", userId)
    .eq("is_primary", true)
    .maybeSingle();
  if (error) throw new Error(error.message || "Could not load portfolio.");
  return (data as { id?: string } | null)?.id ?? null;
}

async function defaultLoadHoldings(
  client: NavSnapshotClient,
  userId: string,
  portfolioId: string,
): Promise<DbHoldingRow[]> {
  const { data, error } = await table(client, "holdings")
    .select(
      `
        id, portfolio_id, user_id, asset_type, symbol, name, quantity,
        average_cost, currency, sort_order, created_at, updated_at, deleted_at,
        last_market_price, last_market_price_at, previous_close, metadata,
        holding_instrument_mappings (
          holding_id, isin, exchange, provider_symbol, instrument_name,
          match_method, match_confidence, match_warnings, confirmed_at
        )
      `,
    )
    .eq("user_id", userId)
    .eq("portfolio_id", portfolioId)
    .is("deleted_at", null)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message || "Could not load holdings.");
  return (data as DbHoldingRow[] | null) ?? [];
}

async function defaultLoadActiveGoal(
  client: NavSnapshotClient,
  userId: string,
  portfolioId: string,
): Promise<DbGoalRow | null> {
  const { data, error } = await table(client, "financial_goals")
    .select(
      "id, portfolio_id, target_value, target_year, monthly_contribution, expected_annual_return, passive_income_target, is_active, updated_at",
    )
    .eq("user_id", userId)
    .eq("portfolio_id", portfolioId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw new Error(error.message || "Could not load goal.");
  return (data as DbGoalRow | null) ?? null;
}

async function defaultLoadExisting(
  client: NavSnapshotClient,
  userId: string,
  portfolioId: string,
  snapshotDateIso: string,
): Promise<PortfolioNavSnapshot | null> {
  const { data, error } = await table(client, PORTFOLIO_NAV_SNAPSHOTS_TABLE)
    .select("*")
    .eq("user_id", userId)
    .eq("portfolio_id", portfolioId)
    .eq("snapshot_date", snapshotDateIso)
    .maybeSingle();

  if (error) throw new Error(error.message || "Could not load NAV snapshot.");
  return data ? mapNavSnapshotRow(data as NavSnapshotRow) : null;
}

export function snapshotInsertPayload(input: {
  userId: string;
  portfolioId: string;
  snapshotDateIso: string;
  capturedAt: string;
  navEur: number;
  usability: "usable" | "partial";
  holdingCount: number;
  valuedHoldingCount: number;
  excludedHoldingCount: number;
  valuedAt: string | null;
  plan: FrozenGoalPlan | null;
}): Record<string, unknown> {
  return {
    user_id: input.userId,
    portfolio_id: input.portfolioId,
    snapshot_date: input.snapshotDateIso,
    captured_at: input.capturedAt,
    nav_eur: input.navEur,
    nav_currency: "EUR",
    usability: input.usability,
    holding_count: input.holdingCount,
    valued_holding_count: input.valuedHoldingCount,
    excluded_holding_count: input.excludedHoldingCount,
    valued_at: input.valuedAt,
    goal_id: input.plan?.goalId ?? null,
    goal_target_value: input.plan?.targetValue ?? null,
    goal_target_year: input.plan?.targetYear ?? null,
    goal_target_date: input.plan?.targetDateIso ?? null,
    goal_monthly_contribution: input.plan?.monthlyContribution ?? null,
    goal_expected_annual_return: input.plan?.expectedAnnualReturn ?? null,
    goal_updated_at: input.plan?.goalUpdatedAt ?? null,
    goal_plan_captured_at: input.plan?.planCapturedAt ?? null,
  };
}

async function defaultInsert(
  client: NavSnapshotClient,
  row: Record<string, unknown>,
): Promise<{ snapshot: PortfolioNavSnapshot | null; uniqueViolation: boolean }> {
  const { data, error } = await table(client, PORTFOLIO_NAV_SNAPSHOTS_TABLE)
    .insert(row)
    .select("*")
    .maybeSingle();

  if (error) {
    if (isUniqueViolation(error)) {
      return { snapshot: null, uniqueViolation: true };
    }
    throw new Error(error.message || "Could not save NAV snapshot.");
  }
  return {
    snapshot: data ? mapNavSnapshotRow(data as NavSnapshotRow) : null,
    uniqueViolation: false,
  };
}

async function defaultUpdateValuation(
  client: NavSnapshotClient,
  input: {
    id: string;
    userId: string;
    portfolioId: string;
    navEur: number;
    usability: "usable" | "partial";
    holdingCount: number;
    valuedHoldingCount: number;
    excludedHoldingCount: number;
    valuedAt: string | null;
  },
): Promise<PortfolioNavSnapshot | null> {
  const { data, error } = await table(client, PORTFOLIO_NAV_SNAPSHOTS_TABLE)
    .update({
      nav_eur: input.navEur,
      usability: input.usability,
      holding_count: input.holdingCount,
      valued_holding_count: input.valuedHoldingCount,
      excluded_holding_count: input.excludedHoldingCount,
      valued_at: input.valuedAt,
    })
    .eq("id", input.id)
    .eq("user_id", input.userId)
    .eq("portfolio_id", input.portfolioId)
    .select("*")
    .maybeSingle();

  if (error) throw new Error(error.message || "Could not update NAV snapshot.");
  return data ? mapNavSnapshotRow(data as NavSnapshotRow) : null;
}

const defaultDeps: CaptureNavSnapshotDeps = {
  resolveOwnedPortfolioId,
  loadHoldings: defaultLoadHoldings,
  loadActiveGoal: defaultLoadActiveGoal,
  loadExistingSnapshot: defaultLoadExisting,
  insertSnapshot: defaultInsert,
  updateValuation: defaultUpdateValuation,
};

export async function capturePortfolioNavSnapshot(
  input: CapturePortfolioNavSnapshotInput,
  deps: CaptureNavSnapshotDeps = defaultDeps,
): Promise<CapturePortfolioNavSnapshotResult> {
  try {
    if (!input.userId) {
      return result("forbidden", null, "Authenticated user is required.");
    }
    if (input.authority !== NAV_SNAPSHOT_WRITE_AUTHORITY) {
      return result(
        "forbidden",
        null,
        "NAV snapshots can only be written through the trusted server path.",
      );
    }

    const demoStatus = resolveNavSnapshotDemoStatus(input.productAccess);
    if (demoStatus.outcome === "unresolved") {
      return result(
        "skipped_unresolved_access",
        null,
        "Demo status could not be resolved from server product access.",
      );
    }
    if (demoStatus.outcome === "skip_demo") {
      return result(
        "skipped_demo",
        null,
        "Demo and example portfolios are not captured.",
      );
    }

    const now = input.now ?? new Date();
    const snapshotDateIso = utcDateIso(now);
    const portfolioId = await deps.resolveOwnedPortfolioId(
      input.client,
      input.userId,
      input.requestedPortfolioId,
    );

    if (input.requestedPortfolioId && !portfolioId) {
      return result("forbidden", null, "Portfolio not found.");
    }
    if (!portfolioId) {
      return result(
        "skipped_unavailable",
        null,
        "No owned portfolio is available to capture.",
      );
    }

    const holdingRows = await deps.loadHoldings(
      input.client,
      input.userId,
      portfolioId,
    );
    const holdings = holdingRows.map((row) => mapDbHoldingToStored(row));
    const valuation = resolveCanonicalNavValuation(holdings);
    const existing = await deps.loadExistingSnapshot(
      input.client,
      input.userId,
      portfolioId,
      snapshotDateIso,
    );
    const decision = evaluateNavSnapshotWrite({ valuation, existing });

    if (decision.action === "skip_unavailable") {
      return result(
        "skipped_unavailable",
        existing,
        "Portfolio value is unavailable, so no NAV snapshot was written.",
      );
    }

    if (decision.action === "keep") {
      return result(
        "already_captured",
        existing,
        "Today's snapshot is already captured.",
      );
    }

    if (decision.action === "improve" && existing) {
      const updated = await deps.updateValuation(input.client, {
        id: existing.id,
        userId: input.userId,
        portfolioId,
        navEur: decision.navEur,
        usability: decision.usability,
        holdingCount: valuation.holdingCount,
        valuedHoldingCount: valuation.valuedHoldingCount,
        excludedHoldingCount: valuation.excludedHoldingCount,
        valuedAt: valuation.valuedAt,
      });
      return result(
        "improved",
        updated ?? existing,
        "Same-day valuation evidence was improved.",
      );
    }

    const goal = await deps.loadActiveGoal(
      input.client,
      input.userId,
      portfolioId,
    );
    const plan = buildFrozenGoalPlan(goal, now);
    const inserted = await deps.insertSnapshot(
      input.client,
      snapshotInsertPayload({
        userId: input.userId,
        portfolioId,
        snapshotDateIso,
        capturedAt: now.toISOString(),
        navEur: decision.navEur,
        usability: decision.usability,
        holdingCount: valuation.holdingCount,
        valuedHoldingCount: valuation.valuedHoldingCount,
        excludedHoldingCount: valuation.excludedHoldingCount,
        valuedAt: valuation.valuedAt,
        plan,
      }),
    );

    if (inserted.uniqueViolation) {
      const raced = await deps.loadExistingSnapshot(
        input.client,
        input.userId,
        portfolioId,
        snapshotDateIso,
      );
      if (!raced) {
        return result(
          "already_captured",
          null,
          "Today's snapshot was captured concurrently.",
        );
      }
      const racedDecision = evaluateNavSnapshotWrite({
        valuation,
        existing: raced,
      });
      if (racedDecision.action === "improve") {
        const updated = await deps.updateValuation(input.client, {
          id: raced.id,
          userId: input.userId,
          portfolioId,
          navEur: racedDecision.navEur,
          usability: racedDecision.usability,
          holdingCount: valuation.holdingCount,
          valuedHoldingCount: valuation.valuedHoldingCount,
          excludedHoldingCount: valuation.excludedHoldingCount,
          valuedAt: valuation.valuedAt,
        });
        return result(
          "improved",
          updated ?? raced,
          "Same-day valuation evidence was improved after a concurrent insert.",
        );
      }
      return result(
        "already_captured",
        raced,
        "Today's snapshot was captured concurrently.",
      );
    }

    return result("created", inserted.snapshot, "NAV snapshot captured.");
  } catch (error) {
    return result(
      "error",
      null,
      error instanceof Error ? error.message : "Could not capture NAV snapshot.",
    );
  }
}
