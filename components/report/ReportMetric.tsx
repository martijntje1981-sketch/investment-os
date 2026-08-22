import {
  appHeroMetricLabelClass,
  appSectionLabelClass,
} from "@/components/layout/appSurface";
import type { PeriodReportHeroMetric } from "@/lib/services/periodIntelligence";

type ReportMetricProps = {
  label: string;
  value: string;
  onDark?: boolean;
};

export function ReportMetric({ label, value, onDark = false }: ReportMetricProps) {
  return (
    <div className="min-w-0">
      <p className={onDark ? appHeroMetricLabelClass : appSectionLabelClass}>
        {label}
      </p>
      <p
        className={`mt-1 truncate text-[18px] font-bold tabular-nums tracking-[-0.03em] sm:text-[20px] ${
          onDark ? "text-white" : "text-slate-950"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

export function ReportMetricRow({
  metrics,
  onDark = false,
}: {
  metrics: PeriodReportHeroMetric[];
  onDark?: boolean;
}) {
  if (metrics.length === 0) return null;
  return (
    <div className="mt-5 grid grid-cols-1 gap-4 min-[420px]:grid-cols-2">
      {metrics.map((metric) => (
        <ReportMetric
          key={metric.id}
          label={metric.label}
          value={metric.value}
          onDark={onDark}
        />
      ))}
    </div>
  );
}
