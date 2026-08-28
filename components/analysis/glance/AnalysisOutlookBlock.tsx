import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import {
  appDarkCardClass,
  appDashboardDarkMetaClass,
  appHeroMetricLabelClass,
} from "@/components/layout/appSurface";
import { useBaseCurrencyDisplay } from "@/lib/client/baseCurrencyDisplay";
import { formatPortfolioPercent } from "@/lib/client/portfolioAnalysis";
import type {
  AnalysisOutlookScenarioView,
  AnalysisOutlookView,
} from "@/lib/services/analysisGlance";

const actionClass =
  "inline-flex min-h-11 items-center gap-1 text-[14px] font-medium text-white/70 underline-offset-2 hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40";

function formatImpactPercent(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatPortfolioPercent(value)}`;
}

function impactToneClass(value: number | null): string {
  if (value === null || value === 0) return "text-white";
  return value < 0 ? "text-rose-400" : "text-emerald-400";
}

function barWidthPercent(value: number | null): number {
  if (value == null || !Number.isFinite(value)) return 0;
  return Math.min(100, (Math.abs(value) / 20) * 100);
}

function ScenarioBar({
  row,
  formatEur,
  prominent,
}: {
  row: AnalysisOutlookScenarioView;
  formatEur: (value: number) => string;
  prominent: boolean;
}) {
  const width = barWidthPercent(row.impactPercent);
  const negative = (row.impactPercent ?? 0) < 0;

  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[13px] font-semibold uppercase tracking-[0.06em] text-white">
          {row.shortLabel}
        </p>
        <p
          className={`shrink-0 tabular-nums ${
            prominent
              ? `text-[1.35rem] font-bold leading-none tracking-[-0.03em] ${impactToneClass(row.impactPercent)}`
              : `text-[15px] font-bold ${impactToneClass(row.impactPercent)}`
          }`}
        >
          {formatImpactPercent(row.impactPercent)}
        </p>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full ${negative ? "bg-rose-400/80" : "bg-emerald-400/80"}`}
          style={{ width: `${width}%` }}
        />
      </div>
      {prominent && row.impactAmount != null ? (
        <p className={`mt-1.5 ${appDashboardDarkMetaClass}`}>
          ≈ {formatEur(row.impactAmount)}
          {row.affectedWeightPercent != null
            ? ` · ${formatPortfolioPercent(row.affectedWeightPercent)} affected`
            : ""}
        </p>
      ) : null}
    </div>
  );
}

export function AnalysisOutlookBlock({ view }: { view: AnalysisOutlookView }) {
  const { formatEur } = useBaseCurrencyDisplay();
  const primary = view.primary;

  return (
    <section
      className={`${appDarkCardClass} min-w-0 overflow-x-clip`}
      data-testid="analysis-outlook"
      data-status={view.status}
      aria-labelledby="analysis-outlook-heading"
    >
      <div className="px-3.5 py-3 sm:px-5 sm:py-3.5">
        <p className={appHeroMetricLabelClass} id="analysis-outlook-heading">
          What could change the picture
        </p>
        {primary ? (
          <div className="mt-2.5 space-y-3">
            <p className={appDashboardDarkMetaClass}>
              Estimated portfolio impact
            </p>
            <ScenarioBar row={primary} formatEur={formatEur} prominent />
            {view.comparisons.map((row) => (
              <ScenarioBar
                key={row.scenarioId}
                row={row}
                formatEur={formatEur}
                prominent={false}
              />
            ))}
            {view.resilienceScore != null ? (
              <p className={appDashboardDarkMetaClass}>
                Resilience {view.resilienceScore} / 100
              </p>
            ) : null}
            {view.goalImpactLine ? (
              <p className={appDashboardDarkMetaClass}>{view.goalImpactLine}</p>
            ) : null}
          </div>
        ) : (
          <p className={`mt-2 ${appDashboardDarkMetaClass}`}>{view.message}</p>
        )}
        <p className={`mt-2 text-[12px] font-medium text-white/55`}>
          {view.disclaimer}
        </p>
        <Link href={view.exploreHref} className={`${actionClass} -mb-1 mt-0.5`}>
          Explore scenarios
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>
    </section>
  );
}
