import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { AnalysisStanceScale } from "@/components/analysis/glance/AnalysisStanceScale";
import {
  appDarkCardClass,
  appDashboardDarkMetaClass,
  appHeroMetricLabelClass,
} from "@/components/layout/appSurface";
import type { AnalysisStanceView } from "@/lib/services/analysisGlance";

const actionClass =
  "inline-flex min-h-11 items-center gap-1 text-[14px] font-medium text-white/70 underline-offset-2 hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40";

export function AnalysisStanceBlock({ view }: { view: AnalysisStanceView }) {
  const limited = view.status === "incomplete";

  return (
    <section
      className={`${appDarkCardClass} min-w-0 overflow-x-clip`}
      data-testid="analysis-stance"
      data-status={view.status}
      aria-labelledby="analysis-stance-heading"
    >
      <div className="px-3.5 py-3 sm:px-5 sm:py-3.5">
        <p className={appHeroMetricLabelClass} id="analysis-stance-heading">
          Your portfolio stance
        </p>
        {limited ? (
          <p className={`mt-2 ${appDashboardDarkMetaClass}`}>{view.conclusion}</p>
        ) : (
          <>
            {view.bandLabel ? (
              <p className="mt-1.5 text-[1.35rem] font-bold tracking-[-0.03em] text-white">
                {view.bandLabel}
              </p>
            ) : null}
            {view.status === "ready" && view.score != null ? (
              <div className="mt-2">
                <AnalysisStanceScale score={view.score} />
              </div>
            ) : null}
            {view.metrics.length > 0 ? (
              <dl className="mt-3 grid grid-cols-3 gap-2">
                {view.metrics.map((metric) => (
                  <div key={metric.id} className="min-w-0">
                    <dd className="text-[1.05rem] font-semibold tabular-nums text-white">
                      {metric.value}
                    </dd>
                    <dt className={`mt-0.5 line-clamp-2 ${appDashboardDarkMetaClass}`}>
                      {metric.label}
                    </dt>
                  </div>
                ))}
              </dl>
            ) : null}
            <p className={`mt-2 line-clamp-2 ${appDashboardDarkMetaClass}`}>
              {view.conclusion}
            </p>
          </>
        )}
        <Link href={view.exploreHref} className={`${actionClass} -mb-1 mt-1`}>
          Explore structure
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>
    </section>
  );
}
