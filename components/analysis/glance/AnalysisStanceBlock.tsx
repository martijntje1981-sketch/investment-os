import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import {
  appDarkCardClass,
  appDashboardDarkBodyClass,
  appDashboardDarkMetaClass,
  appHeroMetricLabelClass,
} from "@/components/layout/appSurface";
import type { AnalysisStanceView } from "@/lib/services/analysisGlance";

const actionClass =
  "inline-flex min-h-11 items-center gap-1 text-[14px] font-medium text-white/70 underline-offset-2 hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40";

export function AnalysisStanceBlock({ view }: { view: AnalysisStanceView }) {
  return (
    <section
      className={`${appDarkCardClass} min-w-0 overflow-x-clip`}
      data-testid="analysis-stance"
      aria-labelledby="analysis-stance-heading"
    >
      <div className="px-3.5 py-3 sm:px-5 sm:py-3.5">
        <p className={appHeroMetricLabelClass} id="analysis-stance-heading">
          Your portfolio stance
        </p>
        <p className={`mt-0.5 ${appDashboardDarkMetaClass}`}>
          How your portfolio behaves
        </p>
        {view.bandLabel ? (
          <p className="mt-2 text-[1.5rem] font-bold tracking-[-0.03em] text-white sm:text-[1.75rem]">
            {view.bandLabel}
          </p>
        ) : null}
        <p
          className={`mt-1.5 ${view.bandLabel ? appDashboardDarkMetaClass : "text-[1.0625rem] font-semibold leading-snug tracking-[-0.02em] text-white"}`}
        >
          {view.conclusion}
        </p>
        {view.metrics.length > 0 ? (
          <dl className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {view.metrics.map((metric) => (
              <div key={metric.id} className="min-w-0">
                <dt className={appDashboardDarkMetaClass}>{metric.label}</dt>
                <dd className="mt-0.5 text-[1.05rem] font-semibold tabular-nums text-white">
                  {metric.value}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}
        <p className={`mt-3 ${appDashboardDarkBodyClass} text-[13px] text-white/70`}>
          {view.disclaimer}
        </p>
        <Link href={view.exploreHref} className={`${actionClass} mt-1`}>
          Explore portfolio structure
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>
    </section>
  );
}
