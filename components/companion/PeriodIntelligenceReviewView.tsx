import { InAppReportRenderer } from "@/components/report/InAppReportRenderer";
import type { PeriodIntelligenceReview } from "@/lib/services/periodIntelligence";

type PeriodIntelligenceReviewViewProps = {
  review: PeriodIntelligenceReview;
};

/** Weekly/monthly Review uses the Phase 9A in-app report renderer. */
export function PeriodIntelligenceReviewView({
  review,
}: PeriodIntelligenceReviewViewProps) {
  return <InAppReportRenderer review={review} />;
}
