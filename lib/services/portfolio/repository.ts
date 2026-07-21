import type { SupabaseClient } from "@supabase/supabase-js";

import type { GoalSettings, StoredPortfolioHolding } from "@/lib/types/portfolioStorage";
import type { SavedImportMapping } from "@/lib/services/import/mappingMemory";
import {
  approxEqual,
  buildHoldingLedgerIdempotencyKey,
  isUniqueViolation,
} from "@/lib/services/portfolio/idempotency";
import {
  mapDbGoalToStored,
  mapDbHoldingToStored,
  mapDbImportMapping,
  mapGoalToDbInsert,
  mapSavedImportMappingToDbInsert,
  mapStoredHoldingToDbInsert,
  mapStoredMappingToDbInsert,
} from "@/lib/services/portfolio/mappers";
import { buildRemoteSnapshot } from "@/lib/services/portfolio/mappers";
import type {
  DbGoalRow,
  DbHoldingRow,
  DbImportMappingRow,
  RemotePortfolioSnapshot,
} from "@/lib/services/portfolio/types";
import { PORTFOLIO_SYNC_VERSION } from "@/lib/services/portfolio/types";
import {
  holdingUniqueKey,
  resolveHoldingIdForSync,
} from "@/lib/services/portfolio/holdingUniqueness";

export type PortfolioRepository = ReturnType<typeof createPortfolioRepository>;

function toNumber(value: number | string | null | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function createPortfolioRepository(supabase: SupabaseClient) {
  async function getPrimaryPortfolioId(userId: string): Promise<string> {
    const { data: primaries, error } = await supabase
      .from("portfolios")
      .select("id, created_at")
      .eq("user_id", userId)
      .eq("is_primary", true)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true });

    if (error) throw error;

    if (primaries && primaries.length > 1) {
      const canonical = primaries[0]!;
      const duplicateIds = primaries.slice(1).map((row) => row.id as string);
      const { error: demoteError } = await supabase
        .from("portfolios")
        .update({ is_primary: false })
        .eq("user_id", userId)
        .in("id", duplicateIds);
      if (demoteError) throw demoteError;
      return canonical.id;
    }

    if (primaries?.[0]?.id) return primaries[0].id as string;

    const { data: created, error: createError } = await supabase
      .from("portfolios")
      .insert({
        user_id: userId,
        name: "Main portfolio",
        is_primary: true,
      })
      .select("id")
      .single();

    if (createError) throw createError;
    return created.id;
  }

  async function fetchHoldings(userId: string): Promise<DbHoldingRow[]> {
    const { data, error } = await supabase
      .from("holdings")
      .select(
        `
        id,
        portfolio_id,
        user_id,
        asset_type,
        symbol,
        name,
        quantity,
        average_cost,
        currency,
        sort_order,
        created_at,
        updated_at,
        deleted_at,
        last_market_price,
        last_market_price_at,
        holding_instrument_mappings (
          holding_id,
          isin,
          exchange,
          provider_symbol,
          instrument_name,
          match_method,
          match_confidence,
          match_warnings,
          confirmed_at
        )
      `,
      )
      .eq("user_id", userId)
      .is("deleted_at", null)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) throw error;
    return (data ?? []) as DbHoldingRow[];
  }

  async function fetchActiveGoal(userId: string): Promise<DbGoalRow | null> {
    const { data, error } = await supabase
      .from("financial_goals")
      .select(
        "id, target_value, target_year, monthly_contribution, expected_annual_return, passive_income_target, is_active, updated_at",
      )
      .eq("user_id", userId)
      .eq("is_active", true)
      .maybeSingle();

    if (error) throw error;
    return (data as DbGoalRow | null) ?? null;
  }

  async function fetchImportMappings(userId: string): Promise<DbImportMappingRow[]> {
    const { data, error } = await supabase
      .from("saved_import_mappings")
      .select(
        "id, lookup_key, isin, symbol, exchange, instrument_name, provider_symbol, match_method, confirmed_at",
      )
      .eq("user_id", userId)
      .order("confirmed_at", { ascending: false });

    if (error) throw error;
    return (data ?? []) as DbImportMappingRow[];
  }

  async function fetchMigrationCompletedAt(
    userId: string,
  ): Promise<string | null> {
    const { data, error } = await supabase
      .from("user_settings")
      .select("migration_completed_at")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    return data?.migration_completed_at ?? null;
  }

  async function fetchSnapshot(userId: string): Promise<RemotePortfolioSnapshot> {
    const [portfolioId, rows, goal, importMappings, migrationCompletedAt] =
      await Promise.all([
        getPrimaryPortfolioId(userId),
        fetchHoldings(userId),
        fetchActiveGoal(userId),
        fetchImportMappings(userId),
        fetchMigrationCompletedAt(userId),
      ]);

    return buildRemoteSnapshot(
      rows,
      goal,
      importMappings,
      migrationCompletedAt,
      portfolioId,
    );
  }

  async function findCompletedSyncEvent(
    userId: string,
    idempotencyKey: string,
  ) {
    const { data, error } = await supabase
      .from("portfolio_sync_events")
      .select("id, status, payload_hash, completed_at")
      .eq("user_id", userId)
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async function recordSyncEvent(
    userId: string,
    kind: "migrate" | "sync",
    idempotencyKey: string,
    payloadHash: string,
    status: "completed" | "failed" = "completed",
  ) {
    const { error } = await supabase.from("portfolio_sync_events").upsert(
      {
        user_id: userId,
        kind,
        idempotency_key: idempotencyKey,
        status,
        payload_hash: payloadHash,
        completed_at: new Date().toISOString(),
      },
      { onConflict: "user_id,idempotency_key" },
    );

    if (error && !isUniqueViolation(error)) throw error;
  }

  async function markMigrationCompleted(userId: string) {
    const { error } = await supabase.from("user_settings").upsert(
      {
        user_id: userId,
        migration_completed_at: new Date().toISOString(),
        preferences: { portfolio_sync_version: PORTFOLIO_SYNC_VERSION },
      },
      { onConflict: "user_id" },
    );

    if (error) throw error;
  }

  async function upsertGoal(userId: string, goal: GoalSettings | null) {
    if (!goal) {
      const existing = await fetchActiveGoal(userId);
      if (existing?.id) {
        const { error } = await supabase
          .from("financial_goals")
          .update({ is_active: false })
          .eq("id", existing.id)
          .eq("user_id", userId);
        if (error) throw error;
      }
      return;
    }

    const existing = await fetchActiveGoal(userId);
    const payload = mapGoalToDbInsert(goal, userId);

    if (existing?.id) {
      const { error } = await supabase
        .from("financial_goals")
        .update(payload)
        .eq("id", existing.id)
        .eq("user_id", userId);
      if (error) throw error;
      return;
    }

    const { error } = await supabase.from("financial_goals").insert(payload);
    if (error) throw error;
  }

  async function upsertImportMappings(
    userId: string,
    mappings: SavedImportMapping[],
  ) {
    if (mappings.length === 0) return;

    const rows = mappings.map((mapping) =>
      mapSavedImportMappingToDbInsert(mapping, userId),
    );

    const { error } = await supabase
      .from("saved_import_mappings")
      .upsert(rows, { onConflict: "user_id,lookup_key" });

    if (error) throw error;
  }

  /** Active holding for one instrument slot (natural key). Excludes soft-deleted rows. */
  async function findHoldingByUniqueKey(
    userId: string,
    portfolioId: string,
    holding: StoredPortfolioHolding,
  ): Promise<{ id: string } | null> {
    const key = holdingUniqueKey(holding);

    let query = supabase
      .from("holdings")
      .select("id")
      .eq("user_id", userId)
      .eq("portfolio_id", portfolioId)
      .eq("asset_type", key.assetType)
      .is("deleted_at", null);

    if (key.assetType === "cash") {
      query = query.eq("currency", key.currency);
    } else {
      query = query.eq("symbol", key.symbol).eq("currency", key.currency);
    }

    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    return data ?? null;
  }

  async function updateHoldingRow(
    userId: string,
    holdingId: string,
    holding: StoredPortfolioHolding,
    sortOrder: number,
  ) {
    const { error: updateError } = await supabase
      .from("holdings")
      .update({
        name: holding.name.trim() || holding.symbol,
        symbol:
          holding.assetType === "cash"
            ? String(holding.currency).toUpperCase()
            : String(holding.symbol).trim().toUpperCase(),
        sort_order: sortOrder,
        deleted_at: null,
      })
      .eq("id", holdingId)
      .eq("user_id", userId);

    if (updateError) throw updateError;
  }

  async function ensureHoldingExists(
    userId: string,
    portfolioId: string,
    holding: StoredPortfolioHolding,
    sortOrder: number,
  ) {
    const active = await findHoldingByUniqueKey(userId, portfolioId, holding);
    if (active) {
      await updateHoldingRow(userId, active.id, holding, sortOrder);
      return active.id;
    }

    const holdingId = resolveHoldingIdForSync(userId, holding);
    // Primary-key lookup: may return a soft-deleted tombstone to revive by deterministic id.
    const { data: existing, error: readError } = await supabase
      .from("holdings")
      .select("id, deleted_at")
      .eq("id", holdingId)
      .eq("user_id", userId)
      .maybeSingle();

    if (readError) throw readError;

    if (existing) {
      await updateHoldingRow(userId, holdingId, holding, sortOrder);
      return holdingId;
    }

    const { error: insertError } = await supabase
      .from("holdings")
      .insert(
        mapStoredHoldingToDbInsert(holding, userId, portfolioId, sortOrder, holdingId),
      );

    if (insertError) {
      if (!isUniqueViolation(insertError)) throw insertError;

      const raced = await findHoldingByUniqueKey(userId, portfolioId, holding);
      if (!raced) throw insertError;

      await updateHoldingRow(userId, raced.id, holding, sortOrder);
      return raced.id;
    }

    return holdingId;
  }

  async function upsertHoldingMapping(
    userId: string,
    portfolioId: string,
    holding: StoredPortfolioHolding,
    holdingId: string,
  ) {
    const mapping = mapStoredMappingToDbInsert(
      holding,
      userId,
      portfolioId,
      holdingId,
    );
    if (!mapping) return;

    const { error } = await supabase
      .from("holding_instrument_mappings")
      .upsert(mapping, { onConflict: "holding_id" });

    if (error) throw error;
  }

  async function applyHoldingLedger(
    userId: string,
    portfolioId: string,
    holding: StoredPortfolioHolding,
    prefix: "migrate" | "sync",
    holdingId: string,
  ) {
    const assetType = holding.assetType === "cash" ? "cash" : "investment";
    const txnType = assetType === "cash" ? "deposit" : "buy";
    const unitPrice = assetType === "cash" ? 1 : holding.purchasePrice;
    const idempotencyKey = buildHoldingLedgerIdempotencyKey(
      prefix,
      holdingId,
      holding.quantity,
      unitPrice,
    );

    const { error } = await supabase.from("transactions").insert({
      portfolio_id: portfolioId,
      user_id: userId,
      holding_id: holdingId,
      type: txnType,
      quantity: holding.quantity,
      unit_price: unitPrice,
      currency: String(holding.currency ?? "EUR").toUpperCase(),
      executed_at: new Date().toISOString().slice(0, 10),
      source: prefix === "migrate" ? "client_migration" : "client_sync",
      idempotency_key: idempotencyKey,
      metadata: {
        portfolio_sync_version: PORTFOLIO_SYNC_VERSION,
        local_holding_id: holding.id,
        updated_at: holding.updatedAt ?? null,
      },
    });

    if (error && !isUniqueViolation(error)) throw error;
  }

  async function syncHoldingMarketPrice(
    userId: string,
    holdingId: string,
    holding: StoredPortfolioHolding,
  ) {
    if (holding.assetType === "cash") return;

    const price = Number(holding.currentPrice);
    if (!Number.isFinite(price) || price <= 0) return;

    const { error } = await supabase
      .from("holdings")
      .update({
        last_market_price: price,
        last_market_price_at:
          holding.marketPriceUpdatedAt ??
          holding.updatedAt ??
          new Date().toISOString(),
      })
      .eq("id", holdingId)
      .eq("user_id", userId);

    if (error) throw error;
  }

  async function reconcileHolding(
    userId: string,
    portfolioId: string,
    holding: StoredPortfolioHolding,
    remoteById: Map<string, DbHoldingRow>,
    prefix: "migrate" | "sync",
    sortOrder: number,
  ) {
    const holdingId = await ensureHoldingExists(
      userId,
      portfolioId,
      holding,
      sortOrder,
    );

    const remoteRow = remoteById.get(holdingId);

    await upsertHoldingMapping(userId, portfolioId, holding, holdingId);

    const desiredQty = holding.quantity;
    const desiredPrice =
      holding.assetType === "cash" ? 1 : holding.purchasePrice;
    const remoteQty = remoteRow ? toNumber(remoteRow.quantity) : 0;
    const remotePrice = remoteRow
      ? toNumber(remoteRow.average_cost)
      : 0;

    const ledgerKey = buildHoldingLedgerIdempotencyKey(
      prefix,
      holdingId,
      desiredQty,
      desiredPrice,
    );

    const { data: existingTxn } = await supabase
      .from("transactions")
      .select("id")
      .eq("user_id", userId)
      .eq("idempotency_key", ledgerKey)
      .maybeSingle();

    if (
      existingTxn &&
      approxEqual(remoteQty, desiredQty) &&
      approxEqual(remotePrice, desiredPrice)
    ) {
      await syncHoldingMarketPrice(userId, holdingId, holding);
      return holdingId;
    }

    if (
      remoteRow &&
      (!approxEqual(remoteQty, desiredQty) ||
        !approxEqual(remotePrice, desiredPrice))
    ) {
      const { error: deleteError } = await supabase
        .from("transactions")
        .delete()
        .eq("user_id", userId)
        .eq("holding_id", holdingId)
        .in("source", ["client_migration", "client_sync"]);
      if (deleteError) throw deleteError;
    }

    if (desiredQty > 0) {
      await applyHoldingLedger(userId, portfolioId, holding, prefix, holdingId);
    }

    await syncHoldingMarketPrice(userId, holdingId, holding);

    return holdingId;
  }

  async function softDeleteHoldingsByIds(userId: string, holdingIds: Set<string>) {
    if (holdingIds.size === 0) return;

    const deletedAt = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("holdings")
      .update({ deleted_at: deletedAt })
      .eq("user_id", userId)
      .in("id", [...holdingIds]);

    if (updateError) throw updateError;
  }

  async function softDeleteMissingHoldings(
    userId: string,
    keepIds: Set<string>,
  ) {
    const { data: existing, error } = await supabase
      .from("holdings")
      .select("id")
      .eq("user_id", userId)
      .is("deleted_at", null);

    if (error) throw error;

    const toDelete = (existing ?? [])
      .map((row) => row.id as string)
      .filter((id) => !keepIds.has(id));

    if (toDelete.length === 0) return;

    const deletedAt = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("holdings")
      .update({ deleted_at: deletedAt })
      .eq("user_id", userId)
      .in("id", toDelete);

    if (updateError) throw updateError;
  }

  async function applySnapshot(
    userId: string,
    holdings: StoredPortfolioHolding[],
    goal: GoalSettings | null | undefined,
    importMappings: SavedImportMapping[] | undefined,
    prefix: "migrate" | "sync",
  ): Promise<RemotePortfolioSnapshot> {
    const portfolioId = await getPrimaryPortfolioId(userId);
    const remoteRows = await fetchHoldings(userId);
    const remoteById = new Map(
      remoteRows.map((row) => [row.id, row]),
    );
    const remoteIdsBefore = new Set(remoteRows.map((row) => row.id));

    const keepIds = new Set<string>();
    const newlyCreatedIds = new Set<string>();

    try {
      for (let index = 0; index < holdings.length; index += 1) {
        const holding = holdings[index]!;
        const holdingId = await reconcileHolding(
          userId,
          portfolioId,
          holding,
          remoteById,
          prefix,
          index,
        );
        keepIds.add(holdingId);
        if (!remoteIdsBefore.has(holdingId)) {
          newlyCreatedIds.add(holdingId);
        }
      }

      if (prefix === "sync") {
        await softDeleteMissingHoldings(userId, keepIds);
      }

      if (goal !== undefined) {
        await upsertGoal(userId, goal ?? null);
      }

      if (importMappings) {
        await upsertImportMappings(userId, importMappings);
      }
    } catch (error) {
      if (newlyCreatedIds.size > 0) {
        await softDeleteHoldingsByIds(userId, newlyCreatedIds);
      }
      throw error;
    }

    return fetchSnapshot(userId);
  }

  return {
    getPrimaryPortfolioId,
    fetchHoldings,
    fetchActiveGoal,
    fetchImportMappings,
    fetchMigrationCompletedAt,
    fetchSnapshot,
    findCompletedSyncEvent,
    recordSyncEvent,
    markMigrationCompleted,
    applySnapshot,
    mapDbHoldingToStored,
    mapDbGoalToStored,
    mapDbImportMapping,
  };
}
