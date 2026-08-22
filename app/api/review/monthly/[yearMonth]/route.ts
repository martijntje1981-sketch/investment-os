import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getMonthlyReviewSnapshot } from "@/lib/services/portfolio/companion/monthlySnapshotRepository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ yearMonth: string }> };

export async function GET(_request: Request, context: RouteParams) {
  const { yearMonth } = await context.params;
  if (!/^\d{4}-\d{2}$/.test(yearMonth)) {
    return NextResponse.json({ error: "Invalid month." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const row = await getMonthlyReviewSnapshot(supabase, user.id, yearMonth);
    if (!row || row.status !== "ready") {
      return NextResponse.json({ error: "Review not found." }, { status: 404 });
    }
    return NextResponse.json({
      success: true,
      snapshot: {
        id: row.id,
        yearMonth: row.year_month,
        periodStart: row.period_start,
        periodEnd: row.period_end,
        generatedAt: row.generated_at,
        baseCurrency: row.base_currency,
        payload: row.payload,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not load review.",
      },
      { status: 500 },
    );
  }
}
