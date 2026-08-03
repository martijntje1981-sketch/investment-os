import Link from "next/link";
import { Activity, ArrowUpRight } from "lucide-react";

import { DynamicScoreRing } from "@/components/dashboard/DynamicScoreRing";
import { DashboardSectionHeader } from "@/components/dashboard/DashboardSectionHeader";
import {
  appDashboardLightCardClass,
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
        icon={<Activity className="h-4 w-4" />}
        iconToneClassName="h-9 w-9 bg-slate-100 text-slate-700"
        bordered={false}
        variant="compact"
        className="!px-4 !py-2.5 md:!px-5 md:!py-3"
      />

      <div className="px-4 pb-3 pt-0 md:px-5 md:pb-3.5">
        <div className="mx-auto grid min-w-0 max-w-[22rem] grid-cols-2 items-start justify-items-center gap-0 sm:max-w-sm sm:gap-1 md:max-w-md">
          <DynamicScoreRing score={pulse.daily} size={88} emphasis="primary" />
          <DynamicScoreRing score={pulse.weekly} size={80} emphasis="default" />
        </div>

        <div className="mt-1.5 space-y-1">
          <p className="text-[12.5px] font-medium leading-snug text-slate-600">
            {pulse.combinedSummary}
          </p>
          <Link
            href={DASHBOARD_DEEP_LINKS.scorecard}
            className={`${appTextLinkClass} text-[12.5px]`}
          >
            Open Portfolio Scorecard
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
          <p className="text-[10px] font-medium leading-snug text-slate-400">
            Scores describe recent movement — not expected returns or advice.
          </p>
        </div>
      </div>
    </section>
  );
}
