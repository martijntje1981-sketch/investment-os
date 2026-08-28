import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import {
  appDarkCardClass,
  appDashboardDarkMetaClass,
  appHeroMetricLabelClass,
} from "@/components/layout/appSurface";
import { useBaseCurrencyDisplay } from "@/lib/client/baseCurrencyDisplay";
import { formatPortfolioPercent } from "@/lib/client/portfolioAnalysis";
import type { AnalysisOutlookView } from "@/lib/services/analysisGlance";

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

export function AnalysisOutlookBlock({ view }: { view: AnalysisOutlookView }) {
  const { formatEur } = useBaseCurrencyDisplay();
  const primary = view.primary;

  return (
    <section
      className={`${appDarkCardClass} min-w-0 overflow-x-clip`}
      data-testid="analysis-outlook"
      aria-labelledby="analysis-outlook-heading"
    >
      <div className="px-3.5 py-3 sm:px-5 sm:py-3.5">
        <p className={appHeroMetricLabelClass} id="analysis-outlook-heading">
          What could change the picture
        </p>
        <p className={`mt-0.5 ${appDashboardDarkMetaClass}`}>Stress & outlook</p>

        {primary ? (
          <>
            <p className="mt-2 text-[1.25rem] font-bold tracking-[-0.03em] text-white">
              {primary.title}
            </p>
            <dl className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div>
                <dt className={appDashboardDarkMetaClass}>
                  Estimated portfolio impact
                </dt>
                <dd
                  className={`mt-0.5 text-[1.25rem] font-bold tabular-nums ${impactToneClass(primary.impactPercent)}`}
                >
                  {formatImpactPercent(primary.impactPercent)}
                </dd>
              </div>
              <div>
                <dt className={appDashboardDarkMetaClass}>Approx. value impact</dt>
                <dd
                  className={`mt-0.5 text-[1.05rem] font-semibold tabular-nums ${impactToneClass(primary.impactAmount)}`}
                >
                  {primary.impactAmount == null
                    ? "—"
                    : formatEur(primary.impactAmount)}
                </dd>
              </div>
              <div>
                <dt className={appDashboardDarkMetaClass}>Portfolio affected</dt>
                <dd className="mt-0.5 text-[1.05rem] font-semibold tabular-nums text-white">
                  {primary.affectedWeightPercent == null
                    ? "—"
                    : formatPortfolioPercent(primary.affectedWeightPercent)}
                </dd>
              </div>
            </dl>
            {view.secondary ? (
              <p className={`mt-3 ${appDashboardDarkMetaClass}`}>
                Comparison · {view.secondary.title}
                {view.secondary.impactPercent != null
                  ? ` · ${formatImpactPercent(view.secondary.impactPercent)}`
                  : ""}
              </p>
            ) : null}
            {view.resilienceScore != null ? (
              <p className={`mt-2 ${appDashboardDarkMetaClass}`}>
                Resilience {view.resilienceScore} / 100
              </p>
            ) : null}
            {view.goalImpactLine ? (
              <p className={`mt-2 ${appDashboardDarkMetaClass}`}>
                {view.goalImpactLine}
              </p>
            ) : null}
          </>
        ) : (
          <p className="mt-2 text-[1.0625rem] font-semibold leading-snug tracking-[-0.02em] text-white">
            {view.message}
          </p>
        )}

        <p className={`mt-3 ${appDashboardDarkMetaClass}`}>{view.disclaimer}</p>
        <Link href={view.exploreHref} className={`${actionClass} mt-1`}>
          Explore scenarios
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>
    </section>
  );
}
