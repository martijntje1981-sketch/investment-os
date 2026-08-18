/**
 * Intelligence-state snapshot persistence — insert-if-absent, never overwrite.
 */

import type {
  IntelligenceSnapshotKind,
  IntelligenceStatePayload,
  IntelligenceStateSnapshot,
} from "@/lib/services/changeIntelligence/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SnapshotClient = { from: (table: string) => any };

export type IntelligenceStateSnapshotRow = {
  id: string;
  user_id: string;
  portfolio_id: string;
  snapshot_kind: IntelligenceSnapshotKind;
  period_key: string;
  period_start: string;
  period_end: string;
  timezone: string;
  schema_version: number;
  captured_at: string;
  payload: IntelligenceStatePayload;
};

function mapRow(row: IntelligenceStateSnapshotRow): IntelligenceStateSnapshot {
  return {
    id: row.id,
    userId: row.user_id,
    portfolioId: row.portfolio_id,
    snapshotKind: row.snapshot_kind,
    periodKey: row.period_key,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    timezone: row.timezone,
    schemaVersion: 1,
    capturedAt: row.captured_at,
    payload: row.payload,
  };
}

export async function getPrimaryPortfolioId(
  client: SnapshotClient,
  userId: string,
): Promise<string | null> {
  const { data, error } = await client
    .from("portfolios")
    .select("id")
    .eq("user_id", userId)
    .eq("is_primary", true)
    .maybeSingle();

  if (error) throw new Error(error.message || "Could not load portfolio.");
  return data?.id ?? null;
}

export async function getIntelligenceStateSnapshot(
  client: SnapshotClient,
  input: {
    userId: string;
    portfolioId: string;
    snapshotKind: IntelligenceSnapshotKind;
    periodKey: string;
  },
): Promise<IntelligenceStateSnapshot | null> {
  const { data, error } = await client
    .from("intelligence_state_snapshots")
    .select("*")
    .eq("user_id", input.userId)
    .eq("portfolio_id", input.portfolioId)
    .eq("snapshot_kind", input.snapshotKind)
    .eq("period_key", input.periodKey)
    .maybeSingle();

  if (error) throw new Error(error.message || "Could not load snapshot.");
  return data ? mapRow(data as IntelligenceStateSnapshotRow) : null;
}

export async function listIntelligenceStateSnapshots(
  client: SnapshotClient,
  input: {
    userId: string;
    snapshotKind?: IntelligenceSnapshotKind;
    limit?: number;
  },
): Promise<IntelligenceStateSnapshot[]> {
  let query = client
    .from("intelligence_state_snapshots")
    .select("*")
    .eq("user_id", input.userId)
    .order("period_key", { ascending: false });

  if (input.snapshotKind) {
    query = query.eq("snapshot_kind", input.snapshotKind);
  }
  if (input.limit) {
    query = query.limit(input.limit);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message || "Could not load snapshots.");
  return (data ?? []).map((row: IntelligenceStateSnapshotRow) => mapRow(row));
}

/**
 * Previous comparable snapshot of the same kind with an earlier period key.
 */
export async function getPreviousIntelligenceStateSnapshot(
  client: SnapshotClient,
  input: {
    userId: string;
    portfolioId: string;
    snapshotKind: IntelligenceSnapshotKind;
    periodKey: string;
  },
): Promise<IntelligenceStateSnapshot | null> {
  const { data, error } = await client
    .from("intelligence_state_snapshots")
    .select("*")
    .eq("user_id", input.userId)
    .eq("portfolio_id", input.portfolioId)
    .eq("snapshot_kind", input.snapshotKind)
    .lt("period_key", input.periodKey)
    .order("period_key", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message || "Could not load snapshot.");
  return data ? mapRow(data as IntelligenceStateSnapshotRow) : null;
}

/**
 * Idempotent insert. Never overwrites an existing period snapshot.
 */
export async function insertIntelligenceStateSnapshotIfAbsent(
  client: SnapshotClient,
  input: {
    userId: string;
    portfolioId: string;
    snapshot: IntelligenceStateSnapshot;
  },
): Promise<{ created: boolean; snapshot: IntelligenceStateSnapshot | null }> {
  const existing = await getIntelligenceStateSnapshot(client, {
    userId: input.userId,
    portfolioId: input.portfolioId,
    snapshotKind: input.snapshot.snapshotKind,
    periodKey: input.snapshot.periodKey,
  });
  if (existing) {
    return { created: false, snapshot: existing };
  }

  const { data, error } = await client
    .from("intelligence_state_snapshots")
    .insert({
      user_id: input.userId,
      portfolio_id: input.portfolioId,
      snapshot_kind: input.snapshot.snapshotKind,
      period_key: input.snapshot.periodKey,
      period_start: input.snapshot.periodStart,
      period_end: input.snapshot.periodEnd,
      timezone: input.snapshot.timezone,
      schema_version: input.snapshot.schemaVersion,
      captured_at: input.snapshot.capturedAt,
      payload: input.snapshot.payload,
    })
    .select("*")
    .maybeSingle();

  if (error) {
    const raced = await getIntelligenceStateSnapshot(client, {
      userId: input.userId,
      portfolioId: input.portfolioId,
      snapshotKind: input.snapshot.snapshotKind,
      periodKey: input.snapshot.periodKey,
    });
    if (raced) return { created: false, snapshot: raced };
    throw new Error(error.message || "Could not save intelligence snapshot.");
  }

  return {
    created: true,
    snapshot: data ? mapRow(data as IntelligenceStateSnapshotRow) : null,
  };
}
