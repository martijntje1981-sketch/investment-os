import { ReportConfidence } from "@/components/report/ReportConfidence";
import { ReportContextItem } from "@/components/report/ReportContextItem";
import { ReportExecutiveSummary } from "@/components/report/ReportExecutiveSummary";
import { ReportHero } from "@/components/report/ReportHero";
import { ReportSection } from "@/components/report/ReportSection";
import { toPersonalReportViewModel } from "@/lib/services/periodIntelligence";
import type { PeriodIntelligenceReview } from "@/lib/services/periodIntelligence";

type InAppReportRendererProps = {
  review: PeriodIntelligenceReview;
};

/**
 * In-app renderer for PeriodIntelligenceReview.
 * Does not recalculate intelligence. PDF renderer consumes the same
 * PeriodIntelligenceReview (via toPersonalReportViewModel).
 */
export function InAppReportRenderer({ review }: InAppReportRendererProps) {
  const report = toPersonalReportViewModel(review);

  return (
    <article
      data-testid="personal-investment-report"
      data-report-kind={report.kind}
      data-report-depth={report.depth}
      className="min-w-0 overflow-hidden"
    >
      <ReportHero report={report} />
      <ReportExecutiveSummary points={report.executiveSummary} />
      {report.sections.map((section) => (
        <ReportSection key={section.id} section={section} />
      ))}
      {report.context ? <ReportContextItem item={report.context} /> : null}
      <ReportConfidence notes={report.confidenceNotes} />
      {report.completeTease ? (
        <p className="px-5 pb-2 text-[13px] font-semibold text-brand-navy sm:px-7">
          {report.completeTease}
        </p>
      ) : null}
      <p className="px-5 pb-6 text-[12px] leading-relaxed text-slate-500 sm:px-7">
        {report.trustLine}
      </p>
    </article>
  );
}
