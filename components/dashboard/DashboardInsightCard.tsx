import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

import { DashboardSectionHeader } from "@/components/dashboard/DashboardSectionHeader";
import {
  appCardPaddingClass,
  appDashboardLightCardClass,
  appSectionBodyClass,
  appSectionLabelClass,
  appSectionMetaClass,
  appTextLinkClass,
} from "@/components/layout/appSurface";
import type { DashboardInsightSections } from "@/lib/client/dashboardInsight";
import { DASHBOARD_DEEP_LINKS } from "@/lib/navigation/deepLinks";

export function DashboardInsightCard({
  sections,
}: {
  sections: DashboardInsightSections;
}) {
  return (
    <section
      aria-labelledby="todays-portfolio-insight-heading"
      className={appDashboardLightCardClass}
    >
      <DashboardSectionHeader
        titleId="todays-portfolio-insight-heading"
        title="Today’s portfolio insight"
        subtitle="Based on your saved holdings and today's data"
        icon={<Sparkles className="h-5 w-5" />}
        iconToneClassName="bg-violet-50 text-violet-700 ring-1 ring-violet-100"
        bordered={false}
        trailing={
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-600">
            AI
          </span>
        }
      />

      <div className={`${appCardPaddingClass} space-y-4 pt-0`}>
        <div>
          <p className={appSectionLabelClass}>Lead insight</p>
          <p className="mt-2 text-[17px] font-semibold leading-snug tracking-[-0.02em] text-slate-950 sm:text-[18px]">
            {sections.recommendation}
          </p>
        </div>

        <div className="grid min-w-0 gap-3 sm:grid-cols-2">
          <div className="min-w-0 rounded-2xl bg-slate-50/90 px-3.5 py-3">
            <p className={appSectionLabelClass}>Main risk</p>
            <p className={`mt-1.5 line-clamp-3 ${appSectionBodyClass}`}>
              {sections.mainRisk}
            </p>
          </div>
          <div className="min-w-0 rounded-2xl bg-slate-50/90 px-3.5 py-3">
            <p className={appSectionLabelClass}>Main opportunity</p>
            <p className={`mt-1.5 line-clamp-3 ${appSectionBodyClass}`}>
              {sections.mainOpportunity}
            </p>
          </div>
        </div>

        <p className={appSectionMetaClass}>
          Generated from your portfolio snapshot — not personal financial
          advice.
        </p>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Link
            href={DASHBOARD_DEEP_LINKS.portfolioHealth}
            className={`inline-flex min-h-[40px] items-center gap-1.5 ${appTextLinkClass}`}
          >
            Open Portfolio Health
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link
            href={DASHBOARD_DEEP_LINKS.portfolioExposure}
            className={`inline-flex min-h-[40px] items-center gap-1.5 ${appTextLinkClass}`}
          >
            Open Analysis
          </Link>
        </div>
      </div>
    </section>
  );
}
