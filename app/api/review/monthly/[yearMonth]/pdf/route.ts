import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getMonthlyReviewSnapshot } from "@/lib/services/portfolio/companion/monthlySnapshotRepository";
import {
  buildMonthlyReviewPdfBytes,
  monthlyReviewPdfFilename,
} from "@/lib/services/portfolio/companion/monthlyReviewPdf";

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
    if (!row || row.status !== "ready" || !row.payload?.review) {
      return NextResponse.json({ error: "Review not found." }, { status: 404 });
    }

    const bytes = buildMonthlyReviewPdfBytes(
      yearMonth,
      row.payload,
      row.generated_at,
    );
    const filename = monthlyReviewPdfFilename(yearMonth);

    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    console.info("[monthly-review-pdf] failed", { yearMonth });
    return NextResponse.json(
      { error: "The PDF could not be created. Your review is still available in the app." },
      { status: 500 },
    );
  }
}
