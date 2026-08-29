/**
 * GET /api/cron/weekly-review-email
 *
 * Once per week. Sends Complete personal weekly reviews from stored
 * intelligence snapshots. No market-data refresh.
 */

import { NextResponse } from "next/server";

import { isCronAuthorized } from "@/lib/server/cronAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import { deliverPeriodReviewEmails } from "@/lib/services/periodIntelligence/email/deliver";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
      kind: "weekly",
    });
    return NextResponse.json(result);
  } catch {
    console.info("[cron/weekly-review-email] failed");
    return NextResponse.json({ ok: false, error: "job_failed" }, { status: 500 });
  }
}
