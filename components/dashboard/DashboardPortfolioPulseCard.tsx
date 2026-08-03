import Link from "next/link";
import { Activity, ArrowUpRight } from "lucide-react";

import { DynamicScoreRing } from "@/components/dashboard/DynamicScoreRing";
import { DashboardSectionHeader } from "@/components/dashboard/DashboardSectionHeader";
import {
  appCardPaddingClass,
  appDashboardLightCardClass,
  appSectionMetaClass,
  appTextLinkClass,
} from "@/components/layout/appSurface";
import { DASHBOARD_DEEP_LINKS } from "@/lib/navigation/deepLinks";
import type { PortfolioPulseResult } from "@/lib/services/portfolio/periodScores";

export function DashboardPortfolioPulseCard({
  pulse,
}: {
  pulse: PortfolioPulseResult;
}) {
  return (
    <section
      aria-labelledby="portfolio-pulse-heading"
      className={`min-w-0 overflow-hidden ${appDashboardLightCardClass}`}
    >
      <DashboardSectionHeader
        titleId="portfolio-pulse-heading"
        title="Portfolio pulse"
        subtitle="How your portfolio is doing now"
        icon={<Activity className="h-5 w-5" />}
        iconToneClassName="bg-slate-100 text-slate-700"
        bordered={false}
      />

      <div className={`${appCardPaddingClass} pt-0`}>
        <div className="grid min-w-0 grid-cols-2 gap-2 sm:gap-4">
          <DynamicScoreRing score={pulse.daily} />
          <DynamicScoreRing score={pulse.weekly} />
        </div>

        <p className={`mt-3 ${appSectionMetaClass}`}>{pulse.combinedSummary}</p>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <Link
            href={DASHBOARD_DEEP_LINKS.scorecard}
            className={appTextLinkClass}
          >
            Open Portfolio Scorecard
            <ArrowUpRight className="h-4 w-4" aria-hidden />
          </Link>
          <p className="text-[11px] font-medium text-slate-500">
            Scores describe recent movement — not expected returns or advice.
          </p>
        </div>
      </div>
    </section>
  );
}
