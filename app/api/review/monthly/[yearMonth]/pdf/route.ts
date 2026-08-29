import { createClient } from "@/lib/supabase/server";
import { getMonthlyReviewSnapshot } from "@/lib/services/portfolio/companion/monthlySnapshotRepository";
import {
  buildArchivedMonthlyPeriodIntelligenceReview,
  monthlyArchivePdfFilename,
  renderPeriodReportPdf,
  resolvePeriodReportPdfAccess,
  resolveProductAccessForPdfRequest,
} from "@/lib/services/periodIntelligence/pdf";
import {
  periodReportPdfError,
  periodReportPdfHttpResponse,
} from "@/lib/services/periodIntelligence/pdf/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ yearMonth: string }> };

/**
 * Archived monthly PDF from the saved snapshot only.
 * Does not mix live Change Intelligence into a historical month.
 */
export async function GET(_request: Request, context: RouteParams) {
  const { yearMonth } = await context.params;
  if (!/^\d{4}-\d{2}$/.test(yearMonth)) {
    return periodReportPdfError(400, "Invalid month.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return periodReportPdfError(401, "Unauthorized");
  }

  const access = await resolveProductAccessForPdfRequest(user);
  try {
    const row = await getMonthlyReviewSnapshot(supabase, user.id, yearMonth);
    if (!row || row.status !== "ready" || !row.payload?.review) {
      return periodReportPdfError(404, "Review not found.");
    }

    const review = buildArchivedMonthlyPeriodIntelligenceReview(row.payload);
    const gate = resolvePeriodReportPdfAccess({
      access,
      reviewReady: review.ready,
      reviewIsDemo: review.isDemo,
    });
    if (!gate.allowed) {
      if (gate.reason === "free") {
        return periodReportPdfError(
          403,
          "PDF download is included with Complete.",
        );
      }
      if (gate.reason === "demo_mix") {
        return periodReportPdfError(
          403,
          "Demo reports stay isolated from personal data.",
        );
      }
      return periodReportPdfError(400, "This review is not ready to download.");
    }

    const bytes = renderPeriodReportPdf(review);
    return periodReportPdfHttpResponse(
      bytes,
      monthlyArchivePdfFilename(yearMonth),
    );
  } catch {
    console.info("[monthly-review-pdf] failed", { yearMonth });
    return periodReportPdfError(
      500,
      "The PDF could not be created. Your review is still available in the app.",
    );
  }
}
