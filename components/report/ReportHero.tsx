import { ReportMetricRow } from "@/components/report/ReportMetric";
import type { PersonalReportViewModel } from "@/lib/services/periodIntelligence";

type ReportHeroProps = {
  report: PersonalReportViewModel;
};

export function ReportHero({ report }: ReportHeroProps) {
  return (
    <header className="bg-slate-950 px-5 py-6 text-white sm:px-7 sm:py-8">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/60">
        {report.kicker}
      </p>
      <h2
        id="companion-review-heading"
        className="mt-3 max-w-3xl text-[1.65rem] font-bold leading-tight tracking-[-0.04em] sm:text-[2rem]"
      >
        {report.conclusion}
      </h2>
      <p className="mt-3 text-[13px] font-medium text-white/55">
        {report.dateRangeLabel}
      </p>
      <ReportMetricRow metrics={report.metrics} onDark />
      {report.dataAsOf ? (
        <p className="mt-4 text-[12px] font-medium text-white/45">{report.dataAsOf}</p>
      ) : null}
      {report.isDemo ? (
        <p className="mt-3 text-[13px] font-semibold text-amber-200">
          Demo Portfolio · example data only
        </p>
      ) : null}
    </header>
  );
}
