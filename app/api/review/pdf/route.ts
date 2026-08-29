import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import {
  isPeriodIntelligenceReview,
  periodReportPdfFilename,
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

/**
 * On-demand PDF for an already-built PeriodIntelligenceReview.
 * Does not persist the file. Does not recalculate intelligence.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return periodReportPdfError(401, "Unauthorized");
  }

  let body: { review?: unknown; user_id?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return periodReportPdfError(400, "Invalid JSON.");
  }

  if ("user_id" in body && body.user_id != null) {
    return periodReportPdfError(400, "Invalid request.");
  }

  if (!isPeriodIntelligenceReview(body.review)) {
    return periodReportPdfError(400, "A canonical period review is required.");
  }

  const review = body.review;
  if (review.kind !== "weekly" && review.kind !== "monthly") {
    return periodReportPdfError(400, "Only weekly and monthly reports can be downloaded.");
  }

  const access = await resolveProductAccessForPdfRequest(user);
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
      return periodReportPdfError(403, "Demo reports stay isolated from personal data.");
    }
    return periodReportPdfError(400, "This review is not ready to download.");
  }

  if (review.intelligenceDepth !== "complete") {
    return periodReportPdfError(
      403,
      "PDF download is included with Complete.",
    );
  }

  try {
    const bytes = renderPeriodReportPdf(review);
    return periodReportPdfHttpResponse(bytes, periodReportPdfFilename(review));
  } catch {
    console.info("[period-report-pdf] live_failed", { kind: review.kind });
    return periodReportPdfError(
      500,
      "The PDF could not be created. Your review is still available in the app.",
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: "Use POST with a canonical PeriodIntelligenceReview." },
    { status: 405 },
  );
}
