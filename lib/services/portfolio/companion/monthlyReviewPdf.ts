/**
 * Compatibility adapter for the retired Phase 6B monthly PDF.
 * Canonical path: PeriodIntelligenceReview → renderPeriodReportPdf.
 */

import { buildArchivedMonthlyPeriodIntelligenceReview } from "@/lib/services/periodIntelligence/pdf/archivedMonthlyReview";
import { monthlyArchivePdfFilename } from "@/lib/services/periodIntelligence/pdf/filename";
import { renderPeriodReportPdf } from "@/lib/services/periodIntelligence/pdf/renderPeriodReportPdf";
import type { MonthlyReviewSnapshotPayload } from "@/lib/services/portfolio/companion/snapshotTypes";

export function monthlyReviewPdfFilename(yearMonth: string): string {
  return monthlyArchivePdfFilename(yearMonth);
}

export function buildMonthlyReviewPdfBytes(
  yearMonth: string,
  payload: MonthlyReviewSnapshotPayload,
  generatedAtIso: string,
): Uint8Array {
  void yearMonth;
  void generatedAtIso;
  const review = buildArchivedMonthlyPeriodIntelligenceReview(payload);
  return renderPeriodReportPdf(review);
}
