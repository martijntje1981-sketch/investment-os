import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import {
  appDarkCardClass,
  appDashboardDarkBodyClass,
  appDashboardDarkMetaClass,
  appHeroMetricLabelClass,
} from "@/components/layout/appSurface";
import type { DashboardPersonalIntelligenceView } from "@/lib/client/dashboardPersonalIntelligence";

const actionClass =
  "inline-flex min-h-11 items-center gap-1 text-[14px] font-medium text-white/70 underline-offset-2 hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40";

export function DashboardPersonalIntelligence({
  view,
}: {
  view: DashboardPersonalIntelligenceView;
}) {
  const quiet = view.kind === "quiet";

  return (
    <section
      className={`${appDarkCardClass} min-w-0 overflow-x-clip`}
      data-testid="dashboard-personal-intelligence"
      data-kind={view.kind}
      aria-labelledby="personal-intelligence-heading"
    >
      <div className="px-3.5 py-3 sm:px-5 sm:py-3.5">
        <p className={appHeroMetricLabelClass} id="personal-intelligence-heading">
          Personal intelligence
        </p>
        {view.kind === "change" && view.windowLabel ? (
          <p className={`mt-0.5 ${appDashboardDarkMetaClass}`}>{view.windowLabel}</p>
        ) : view.kind === "looking_ahead" && view.modeledDisclaimer ? (
          <p className={`mt-0.5 ${appDashboardDarkMetaClass}`}>
            {view.modeledDisclaimer}
          </p>
        ) : null}

        <p className="mt-1.5 text-[1.0625rem] font-semibold leading-snug tracking-[-0.02em] text-white sm:text-[1.125rem]">
          {view.title}
        </p>
        {view.support ? (
          <p
            className={`mt-1 ${quiet ? appDashboardDarkBodyClass : appDashboardDarkMetaClass}`}
          >
            {view.support}
          </p>
        ) : null}

        {view.kind === "looking_ahead" && view.eventLabel ? (
          <p className={`mt-1.5 ${appDashboardDarkMetaClass}`}>
            Next relevant event · {view.eventLabel}
          </p>
        ) : null}

        {quiet ? (
          <Link href="#explore-tobailey" className={`${actionClass} mt-1.5`}>
            Explore Tobailey
          </Link>
        ) : (
          <Link href={view.href} className={`${actionClass} mt-1.5`}>
            {view.hrefLabel}
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        )}
      </div>
    </section>
  );
}
