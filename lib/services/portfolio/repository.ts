import type { SupabaseClient } from "@supabase/supabase-js";

import type { GoalSettings, StoredPortfolioHolding } from "@/lib/types/portfolioStorage";
import type { SavedImportMapping } from "@/lib/services/import/mappingMemory";
import {
  approxEqual,
  buildHoldingLedgerIdempotencyKey,
  isUniqueViolation,
} from "@/lib/services/portfolio/idempotency";
import {
  buildHoldingMarketPriceUpdate,
  buildRemoteSnapshot,
  mapDbGoalToStored,
  mapDbHoldingToStored,
  mapDbImportMapping,
  mapGoalToDbInsert,
  mapSavedImportMappingToDbInsert,
  mapStoredHoldingToDbInsert,
  mapStoredMappingToDbInsert,
} from "@/lib/services/portfolio/mappers";
import { buildCryptoHoldingMetadata } from "@/lib/services/portfolio/cryptoDbMetadata";
import { buildInvestmentHoldingMetadata } from "@/lib/services/portfolio/investmentHoldingMetadata";
import { isCryptoHolding } from "@/lib/services/portfolio/cryptoHolding";
import type {
  DbGoalRow,
  DbHoldingRow,
  DbImportMappingRow,
  RemotePortfolioSnapshot,
} from "@/lib/services/portfolio/types";
import { PORTFOLIO_SYNC_VERSION } from "@/lib/services/portfolio/types";
import {
  holdingUniqueKey,
  canReuseHoldingForPortfolio,
  resolveHoldingIdForSync,
  targetBookHasRequestedHoldings,
} from "@/lib/services/portfolio/holdingUniqueness";

export type PortfolioRepository = ReturnType<typeof createPortfolioRepository>;

export class PortfolioAccessError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

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
        name: "My Portfolio",
        is_primary: true,
      })
      .select("id")
      .single();

    if (createError) throw createError;
    return created.id;
  }

  async function listPortfolios(userId: string): Promise<
    Array<{ id: string; name: string; isPrimary: boolean; createdAt: string }>
  > {
    const { data, error } = await supabase
      .from("portfolios")
      .select("id, name, is_primary, created_at")
      .eq("user_id", userId)
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: true })
      .order("id", { ascending: true });
    if (error) throw error;
    return (data ?? []).map((row) => ({
      id: row.id as string,
      name: typeof row.name === "string" && row.name.trim() ? row.name.trim() : "My Portfolio",
      isPrimary: row.is_primary === true,
      createdAt: String(row.created_at ?? ""),
    }));
  }

  async function getOwnedPortfolio(
    userId: string,
    portfolioId: string,
  ): Promise<{ id: string; name: string; isPrimary: boolean } | null> {
    const { data, error } = await supabase
      .from("portfolios")
      .select("id, name, is_primary")
      .eq("id", portfolioId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    if (!data?.id) return null;
    return {
      id: data.id as string,
      name: typeof data.name === "string" ? data.name : "My Portfolio",
      isPrimary: data.is_primary === true,
    };
  }

  async function resolvePortfolioForAccess(
    userId: string,
    requestedId: string | null | undefined,
    options?: { allowLocked?: boolean; maxPortfolios?: number },
  ): Promise<{ id: string; isPrimary: boolean; name: string }> {
    const primaryId = await getPrimaryPortfolioId(userId);
    const owned = requestedId
      ? await getOwnedPortfolio(userId, requestedId)
      : await getOwnedPortfolio(userId, primaryId);

    if (requestedId && !owned) {
      throw new PortfolioAccessError(
        "portfolio_not_found",
        "Portfolio not found.",
        404,
      );
    }

    const resolved = owned ?? (await getOwnedPortfolio(userId, primaryId));
    if (!resolved) {
      throw new PortfolioAccessError(
        "portfolio_not_found",
        "Portfolio not found.",
        404,
      );
    }

    if (!options?.allowLocked && options?.maxPortfolios != null) {
      const listed = await listPortfolios(userId);
      const annotated = listed.map((portfolio) => {
        const withinLimit = listed.length <= options.maxPortfolios!;
        const accessible = withinLimit || portfolio.isPrimary;
        return { ...portfolio, accessible };
      });
      const current = annotated.find((portfolio) => portfolio.id === resolved.id);
      if (current && !current.accessible) {
        throw new PortfolioAccessError(
          "portfolio_locked",
          "This portfolio is saved. Complete gives you access to up to 3 portfolios.",
          403,
        );
      }
    }

    return resolved;
  }

  async function createPortfolio(
    userId: string,
    name: string,
    maxPortfolios: number,
  ): Promise<{ id: string; name: string; isPrimary: boolean }> {
    const existing = await listPortfolios(userId);
    if (existing.length >= maxPortfolios) {
      throw new PortfolioAccessError(
        "portfolio_limit",
        maxPortfolios <= 1
          ? "Multiple portfolios are part of Tobailey Complete. Your Free portfolio stays exactly as it is."
          : "Complete includes up to 3 portfolios.",
        403,
      );
    }

    const next =
      typeof name === "string" && name.trim().length > 0
        ? name.trim().slice(0, 60)
        : "My Portfolio";

    const { data, error } = await supabase
      .from("portfolios")
      .insert({
        user_id: userId,
        name: next,
        is_primary: false,
      })
      .select("id, name, is_primary")
      .single();
    if (error) throw error;
    return {
      id: data.id as string,
      name: typeof data.name === "string" ? data.name : next,
      isPrimary: false,
    };
  }

  async function renamePortfolio(
    userId: string,
    portfolioId: string,
    name: string,
  ): Promise<{ id: string; name: string }> {
    const owned = await getOwnedPortfolio(userId, portfolioId);
    if (!owned) {
      throw new PortfolioAccessError(
        "portfolio_not_found",
        "Portfolio not found.",
        404,
      );
    }
    const next =
      typeof name === "string" && name.trim().length > 0
        ? name.trim().slice(0, 60)
        : "My Portfolio";
    const { error } = await supabase
      .from("portfolios")
      .update({ name: next, updated_at: new Date().toISOString() })
      .eq("id", owned.id)
      .eq("user_id", userId);
    if (error) throw error;
    return { id: owned.id, name: next };
  }

  async function renamePrimaryPortfolio(
    userId: string,
    name: string,
  ): Promise<{ id: string; name: string }> {
    const id = await getPrimaryPortfolioId(userId);
    return renamePortfolio(userId, id, name);
  }

  async function fetchHoldings(
    userId: string,
    portfolioId?: string,
  ): Promise<DbHoldingRow[]> {
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
        previous_close,
        metadata,
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
      .eq("portfolio_id", portfolioId ?? (await getPrimaryPortfolioId(userId)))
      .is("deleted_at", null)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) throw error;
    return (data ?? []) as DbHoldingRow[];
  }

  async function fetchActiveGoal(
    userId: string,
    portfolioId?: string,
  ): Promise<DbGoalRow | null> {
    const resolvedId = portfolioId ?? (await getPrimaryPortfolioId(userId));
    const { data, error } = await supabase
      .from("financial_goals")
      .select(
        "id, portfolio_id, target_value, target_year, monthly_contribution, expected_annual_return, passive_income_target, is_active, updated_at",
      )
      .eq("user_id", userId)
      .eq("portfolio_id", resolvedId)
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

  async function fetchSnapshot(
    userId: string,
    portfolioId?: string | null,
    options?: { maxPortfolios?: number },
  ): Promise<RemotePortfolioSnapshot> {
    const resolved = await resolvePortfolioForAccess(userId, portfolioId, {
      allowLocked: false,
      maxPortfolios: options?.maxPortfolios,
    });
    const [rows, goal, importMappings, migrationCompletedAt] = await Promise.all([
      fetchHoldings(userId, resolved.id),
      fetchActiveGoal(userId, resolved.id),
      fetchImportMappings(userId),
      fetchMigrationCompletedAt(userId),
    ]);

    return buildRemoteSnapshot(
      rows,
      goal,
      importMappings,
      migrationCompletedAt,
      resolved.id,
      resolved.isPrimary,
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

  async function upsertGoal(
    userId: string,
    goal: GoalSettings | null,
    portfolioId?: string,
  ) {
    const resolvedId = portfolioId ?? (await getPrimaryPortfolioId(userId));
    if (!goal) {
      const existing = await fetchActiveGoal(userId, resolvedId);
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

    const existing = await fetchActiveGoal(userId, resolvedId);
    const payload = mapGoalToDbInsert(goal, userId, resolvedId);

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
    options?: { includeSoftDeleted?: boolean },
  ): Promise<{ id: string } | null> {
    if (holding.assetType === "crypto") {
      const scopedId = resolveHoldingIdForSync(userId, holding, portfolioId);
      const legacyId = resolveHoldingIdForSync(userId, holding);
      for (const holdingId of [...new Set([scopedId, legacyId])]) {
        const { data, error } = await supabase
          .from("holdings")
          .select("id")
          .eq("user_id", userId)
          .eq("portfolio_id", portfolioId)
          .eq("id", holdingId)
          .is("deleted_at", null)
          .maybeSingle();
        if (error) throw error;
        if (data) return data;
      }
      return null;
    }

    const key = holdingUniqueKey(holding);

    let query = supabase
      .from("holdings")
      .select("id")
      .eq("user_id", userId)
      .eq("portfolio_id", portfolioId)
      .eq("asset_type", key.assetType);

    if (options?.includeSoftDeleted) {
      query = query.not("deleted_at", "is", null).order("deleted_at", {
        ascending: false,
      });
    } else {
      query = query.is("deleted_at", null);
    }

    if (key.assetType === "cash") {
      query = query.eq("currency", key.currency);
    } else {
      query = query.eq("symbol", key.symbol).eq("currency", key.currency);
    }

    const { data, error } = await query.limit(1).maybeSingle();
    if (error) throw error;
    return data ?? null;
  }

  async function updateHoldingRow(
    userId: string,
    holdingId: string,
    holding: StoredPortfolioHolding,
    sortOrder: number,
    portfolioId: string,
  ) {
    const payload: Record<string, unknown> = {
      name: holding.name.trim() || holding.symbol,
      symbol:
        holding.assetType === "cash"
          ? String(holding.currency).toUpperCase()
          : String(holding.symbol).trim().toUpperCase(),
      sort_order: sortOrder,
      deleted_at: null,
    };

    if (isCryptoHolding(holding)) {
      payload.metadata = buildCryptoHoldingMetadata(holding);
    } else if (holding.assetType !== "cash") {
      payload.metadata = buildInvestmentHoldingMetadata(holding);
    }

    const { error: updateError } = await supabase
      .from("holdings")
      .update(payload)
      .eq("id", holdingId)
      .eq("user_id", userId)
      .eq("portfolio_id", portfolioId);

    if (updateError) throw updateError;
  }

  async function lookupHoldingById(
    userId: string,
    holdingId: string,
  ): Promise<{ id: string; portfolio_id: string; deleted_at: string | null } | null> {
    const { data, error } = await supabase
      .from("holdings")
      .select("id, portfolio_id, deleted_at")
      .eq("id", holdingId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    return data ?? null;
  }

  async function insertHoldingRow(
    userId: string,
    portfolioId: string,
    holding: StoredPortfolioHolding,
    sortOrder: number,
    holdingId: string,
  ): Promise<string> {
    const insertRow = mapStoredHoldingToDbInsert(
      holding,
      userId,
      portfolioId,
      sortOrder,
      holdingId,
    );

    const { error: insertError } = await supabase
      .from("holdings")
      .insert(insertRow as Record<string, unknown>);

    if (insertError) {
      if (!isUniqueViolation(insertError)) throw insertError;

      const raced = await findHoldingByUniqueKey(userId, portfolioId, holding);
      if (!raced) throw insertError;

      await updateHoldingRow(userId, raced.id, holding, sortOrder, portfolioId);
      return raced.id;
    }

    return holdingId;
  }

  async function allocateHoldingId(
    userId: string,
    portfolioId: string,
    holding: StoredPortfolioHolding,
  ): Promise<string> {
    const legacyId = resolveHoldingIdForSync(userId, holding);
    const scopedId = resolveHoldingIdForSync(userId, holding, portfolioId);
    const legacyRow = await lookupHoldingById(userId, legacyId);

    if (canReuseHoldingForPortfolio(legacyRow?.portfolio_id, portfolioId)) {
      return legacyId;
    }

    if (legacyRow && legacyRow.portfolio_id !== portfolioId) {
      return scopedId;
    }

    return legacyId;
  }

  async function ensureHoldingExists(
    userId: string,
    portfolioId: string,
    holding: StoredPortfolioHolding,
    sortOrder: number,
  ) {
    const active = await findHoldingByUniqueKey(userId, portfolioId, holding);
    if (active) {
      await updateHoldingRow(userId, active.id, holding, sortOrder, portfolioId);
      return active.id;
    }

    const softDeleted = await findHoldingByUniqueKey(userId, portfolioId, holding, {
      includeSoftDeleted: true,
    });
    if (softDeleted) {
      await updateHoldingRow(
        userId,
        softDeleted.id,
        holding,
        sortOrder,
        portfolioId,
      );
      return softDeleted.id;
    }

    const holdingId = await allocateHoldingId(userId, portfolioId, holding);
    const existing = await lookupHoldingById(userId, holdingId);

    if (canReuseHoldingForPortfolio(existing?.portfolio_id, portfolioId)) {
      await updateHoldingRow(userId, holdingId, holding, sortOrder, portfolioId);
      return holdingId;
    }

    if (existing && existing.portfolio_id !== portfolioId) {
      const scopedId = resolveHoldingIdForSync(userId, holding, portfolioId);
      return insertHoldingRow(userId, portfolioId, holding, sortOrder, scopedId);
    }

    return insertHoldingRow(userId, portfolioId, holding, sortOrder, holdingId);
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

    // Same ISIN in this book is already mapped (often a stale row from an
    // earlier cross-book id collision). The holding write already succeeded.
    if (error && !isUniqueViolation(error)) throw error;
  }

  async function applyHoldingLedger(
    userId: string,
    portfolioId: string,
    holding: StoredPortfolioHolding,
    prefix: "migrate" | "sync",
    holdingId: string,
  ) {
    const assetType =
      holding.assetType === "cash"
        ? "cash"
        : isCryptoHolding(holding)
          ? "crypto"
          : "investment";
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
    const update = buildHoldingMarketPriceUpdate(holding);
    if (!update) return;

    const { error } = await supabase
      .from("holdings")
      .update(update)
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
      holding.assetType === "cash"
        ? 1
        : isCryptoHolding(holding)
          ? holding.purchasePrice
          : holding.purchasePrice;
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
    portfolioId: string,
  ) {
    const { data: existing, error } = await supabase
      .from("holdings")
      .select("id")
      .eq("user_id", userId)
      .eq("portfolio_id", portfolioId)
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
    portfolioId?: string | null,
    options?: { maxPortfolios?: number },
  ): Promise<RemotePortfolioSnapshot> {
    const resolved = await resolvePortfolioForAccess(userId, portfolioId, {
      allowLocked: false,
      maxPortfolios: options?.maxPortfolios,
    });
    const remoteRows = await fetchHoldings(userId, resolved.id);
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
          resolved.id,
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
        await softDeleteMissingHoldings(userId, keepIds, resolved.id);
      }

      if (goal !== undefined) {
        await upsertGoal(userId, goal ?? null, resolved.id);
      }

      if (importMappings) {
        await upsertImportMappings(userId, importMappings);
      }
    } catch (error) {
      if (isUniqueViolation(error as { code?: string })) {
        const snapshot = await fetchSnapshot(userId, resolved.id);
        if (targetBookHasRequestedHoldings(holdings, snapshot.holdings)) {
          return snapshot;
        }
      }
      if (newlyCreatedIds.size > 0) {
        await softDeleteHoldingsByIds(userId, newlyCreatedIds);
      }
      throw error;
    }

    return fetchSnapshot(userId, resolved.id);
  }

  return {
    getPrimaryPortfolioId,
    listPortfolios,
    getOwnedPortfolio,
    resolvePortfolioForAccess,
    createPortfolio,
    renamePortfolio,
    renamePrimaryPortfolio,
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
