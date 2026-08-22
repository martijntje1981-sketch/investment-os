/**
 * Monthly review snapshot persistence — ownership via RLS / explicit user_id.
 */

import type {
  MonthlyReviewArchiveItem,
  MonthlyReviewSnapshotPayload,
  MonthlyReviewSnapshotRow,
} from "@/lib/services/portfolio/companion/snapshotTypes";
import {
  archiveDirectionFromMetrics,
  formatYearMonthLabel,
} from "@/lib/services/portfolio/companion/snapshotTypes";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SnapshotClient = { from: (table: string) => any };

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

export async function listMonthlyReviewSnapshots(
  client: SnapshotClient,
  userId: string,
): Promise<MonthlyReviewArchiveItem[]> {
  const { data, error } = await client
    .from("monthly_review_snapshots")
    .select(
      "id, year_month, period_start, period_end, generated_at, status, payload",
    )
    .eq("user_id", userId)
    .eq("status", "ready")
    .order("year_month", { ascending: false });

  if (error) throw new Error(error.message || "Could not load reviews.");

  return (data ?? []).map((row: {
    id: string;
    year_month: string;
    period_start: string;
    period_end: string;
    generated_at: string;
    status: MonthlyReviewArchiveItem["status"];
    payload: MonthlyReviewSnapshotPayload | null;
  }) => ({
    id: row.id,
    yearMonth: row.year_month,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    generatedAt: row.generated_at,
    status: row.status,
    direction: archiveDirectionFromMetrics(row.payload?.metrics),
    label: formatYearMonthLabel(row.year_month),
    isDemo: Boolean(row.payload?.review?.isDemo),
  }));
}

export async function getMonthlyReviewSnapshot(
  client: SnapshotClient,
  userId: string,
  yearMonth: string,
): Promise<MonthlyReviewSnapshotRow | null> {
  const { data, error } = await client
    .from("monthly_review_snapshots")
    .select("*")
    .eq("user_id", userId)
    .eq("year_month", yearMonth)
    .maybeSingle();

  if (error) throw new Error(error.message || "Could not load review.");
  return (data as MonthlyReviewSnapshotRow | null) ?? null;
}

/**
 * Idempotent insert. Never overwrites an existing ready snapshot payload.
 */
export async function insertMonthlyReviewSnapshotIfAbsent(
  client: SnapshotClient,
  input: {
    userId: string;
    portfolioId: string;
    yearMonth: string;
    periodStart: string;
    periodEnd: string;
    periodKind: "calendar_month" | "month_to_date";
    baseCurrency: string;
    payload: MonthlyReviewSnapshotPayload;
    sourceHash: string;
  },
): Promise<{ created: boolean; row: MonthlyReviewSnapshotRow | null }> {
  const existing = await getMonthlyReviewSnapshot(
    client,
    input.userId,
    input.yearMonth,
  );
  if (existing?.status === "ready") {
    return { created: false, row: existing };
  }

  const { data, error } = await client
    .from("monthly_review_snapshots")
    .upsert(
      {
        user_id: input.userId,
        portfolio_id: input.portfolioId,
        year_month: input.yearMonth,
        period_start: input.periodStart,
        period_end: input.periodEnd,
        period_kind: input.periodKind,
        timezone: "Europe/Amsterdam",
        base_currency: input.baseCurrency.toUpperCase(),
        payload: input.payload,
        source_hash: input.sourceHash,
        status: "ready",
        version: existing ? existing.version + 1 : 1,
        generated_at: new Date().toISOString(),
        emailed_at: null,
        email_status: null,
      },
      { onConflict: "user_id,portfolio_id,year_month" },
    )
    .select("*")
    .maybeSingle();

  if (error) {
    // Race: unique constraint — re-read.
    const raced = await getMonthlyReviewSnapshot(
      client,
      input.userId,
      input.yearMonth,
    );
    if (raced) return { created: false, row: raced };
    throw new Error(error.message || "Could not save monthly review.");
  }

  return { created: true, row: (data as MonthlyReviewSnapshotRow) ?? null };
}

export async function markMonthlyReviewEmailed(
  client: SnapshotClient,
  userId: string,
  yearMonth: string,
  emailStatus: string,
): Promise<void> {
  const { error } = await client
    .from("monthly_review_snapshots")
    .update({
      emailed_at: new Date().toISOString(),
      email_status: emailStatus,
    })
    .eq("user_id", userId)
    .eq("year_month", yearMonth)
    .is("emailed_at", null);

  if (error) {
    throw new Error(error.message || "Could not update email status.");
  }
}
