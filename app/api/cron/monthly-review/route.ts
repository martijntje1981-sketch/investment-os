/**
 * GET /api/cron/monthly-review
 *
 * Timezone: Europe/Amsterdam calendar.
 * Runs after month end — sends Complete personal monthly reviews from
 * saved monthly_review_snapshots. No live market-data refresh.
 */

import { NextResponse } from "next/server";

import { isCronAuthorized } from "@/lib/server/cronAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import { deliverPeriodReviewEmails } from "@/lib/services/periodIntelligence/email/deliver";
import { resolveCompanionPeriodWindow } from "@/lib/services/portfolio/companion/periodWindows";
import { yearMonthFromIsoDate } from "@/lib/services/portfolio/companion/snapshotTypes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function previousCompletedYearMonth(now = new Date()): string | null {
  const window = resolveCompanionPeriodWindow("monthly", now, {
    preferCompletedMonth: true,
  });
  if (window.periodKind !== "calendar_month") return null;
  return yearMonthFromIsoDate(window.startDate);
}

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
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

  try {
    const result = await deliverPeriodReviewEmails({
      admin,
      kind: "monthly",
    });
    return NextResponse.json({ ...result, yearMonth });
  } catch {
    console.info("[cron/monthly-review] failed");
    return NextResponse.json({ ok: false, error: "job_failed" }, { status: 500 });
  }
}
