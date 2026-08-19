import { appSectionLabelClass } from "@/components/layout/appSurface";

type ReportExecutiveSummaryProps = {
  points: string[];
};

export function ReportExecutiveSummary({ points }: ReportExecutiveSummaryProps) {
  if (points.length === 0) return null;
  return (
    <section className="px-5 py-5 sm:px-7">
      <p className={appSectionLabelClass}>
        At a glance
      </p>
      <ol className="mt-3 space-y-2.5">
        {points.map((point, index) => (
          <li key={point} className="flex gap-3 text-[15px] leading-snug text-slate-800">
            <span className="mt-0.5 w-5 shrink-0 text-[12px] font-bold tabular-nums text-slate-400">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="min-w-0 font-medium">{point}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
