/**
 * GET /api/cron/monthly-review
 *
 * Timezone: Europe/Amsterdam calendar.
 * Runs after month end — sends privacy-first emails for ready snapshots
 * that have not been emailed, only when the user is still opted in.
 *
 * Does not perform live market-data refreshes.
 * Snapshot creation is primarily in-app (idempotent POST) for completed months.
 */

import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { readMonthlyReviewEmailOptIn } from "@/lib/services/portfolio/companion/emailPreference";
import {
  sendMonthlyReviewReadyEmail,
  snapshotEligibleForEmail,
} from "@/lib/services/portfolio/companion/monthlyReviewEmail";
import { markMonthlyReviewEmailed } from "@/lib/services/portfolio/companion/monthlySnapshotRepository";
import { resolveCompanionPeriodWindow } from "@/lib/services/portfolio/companion/periodWindows";
import { yearMonthFromIsoDate } from "@/lib/services/portfolio/companion/snapshotTypes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

function previousCompletedYearMonth(now = new Date()): string | null {
  const window = resolveCompanionPeriodWindow("monthly", now, {
    preferCompletedMonth: true,
  });
  if (window.periodKind !== "calendar_month") return null;
  return yearMonthFromIsoDate(window.startDate);
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const yearMonth = previousCompletedYearMonth();
  if (!yearMonth) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "no_completed_month_window",
    });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { ok: false, error: "admin_unavailable" },
      { status: 503 },
    );
  }

  const { data: rows, error } = await admin
    .from("monthly_review_snapshots")
    .select("id, user_id, year_month, status, emailed_at")
    .eq("year_month", yearMonth)
    .eq("status", "ready")
    .is("emailed_at", null)
    .limit(200);

  if (error) {
    console.info("[cron/monthly-review] list_failed");
    return NextResponse.json({ ok: false, error: "list_failed" }, { status: 500 });
  }

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of rows ?? []) {
    if (!snapshotEligibleForEmail(row)) {
      skipped += 1;
      continue;
    }

    try {
      const { data: settings } = await admin
        .from("user_settings")
        .select("preferences")
        .eq("user_id", row.user_id)
        .maybeSingle();

      const optIn = readMonthlyReviewEmailOptIn(
        (settings?.preferences as Record<string, unknown> | null) ?? null,
      );
      if (!optIn) {
        skipped += 1;
        continue;
      }

      const { data: authData, error: authError } =
        await admin.auth.admin.getUserById(row.user_id);
      const email = authData.user?.email?.trim();
      if (authError || !email) {
        skipped += 1;
        continue;
      }

      // Re-check opt-in immediately before send.
      const stillOptedIn = await admin
        .from("user_settings")
        .select("preferences")
        .eq("user_id", row.user_id)
        .maybeSingle();
      if (
        !readMonthlyReviewEmailOptIn(
          (stillOptedIn.data?.preferences as Record<string, unknown> | null) ??
            null,
        )
      ) {
        skipped += 1;
        continue;
      }

      const result = await sendMonthlyReviewReadyEmail({
        to: email,
        yearMonth,
      });

      if (!result.ok) {
        failed += 1;
        continue;
      }

      await markMonthlyReviewEmailed(admin, row.user_id, yearMonth, "sent");
      sent += 1;
    } catch {
      failed += 1;
      console.info("[cron/monthly-review] user_failed");
    }
  }

  console.info("[cron/monthly-review] complete", {
    yearMonth,
    sent,
    skipped,
    failed,
    candidates: rows?.length ?? 0,
  });

  return NextResponse.json({
    ok: true,
    yearMonth,
    sent,
    skipped,
    failed,
    candidates: rows?.length ?? 0,
  });
}
