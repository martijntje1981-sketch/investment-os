import Link from "next/link";
import { Activity, ArrowRight } from "lucide-react";

import { DashboardSectionHeader } from "@/components/dashboard/DashboardSectionHeader";
import {
  appCardPaddingClass,
  appDashboardLightCardClass,
  appSectionBodyClass,
  appSectionLabelClass,
  appTextLinkClass,
} from "@/components/layout/appSurface";
import { DASHBOARD_DEEP_LINKS } from "@/lib/navigation/deepLinks";
import type { PortfolioHealthProfile } from "@/lib/services/portfolio/portfolioHealthProfile";

/**
 * Compact Portfolio Health preview — descriptive identity, not a numeric score.
 */
export function DashboardPortfolioHealthCard({
  profile,
}: {
  profile: PortfolioHealthProfile;
}) {
  if (!profile.hasValuedPortfolio) {
    return (
      <section
        aria-labelledby="portfolio-health-heading"
        className={appDashboardLightCardClass}
      >
        <DashboardSectionHeader
          titleId="portfolio-health-heading"
          title="Portfolio Health"
          subtitle="Identity, behaviour and goal fit"
          icon={<Activity className="h-5 w-5" />}
          iconToneClassName="bg-slate-100 text-slate-700"
          bordered={false}
        />
        <div className={appCardPaddingClass}>
          <p className={`${appSectionBodyClass} text-slate-600`}>
            Add valued holdings to see your portfolio identity.
          </p>
          <Link
            href={DASHBOARD_DEEP_LINKS.portfolioHealth}
            className={`mt-4 ${appTextLinkClass}`}
          >
            View full analysis
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="portfolio-health-heading"
      className={appDashboardLightCardClass}
    >
      <DashboardSectionHeader
        titleId="portfolio-health-heading"
        title="Portfolio Health"
        subtitle="Identity, behaviour and goal fit"
        icon={<Activity className="h-5 w-5" />}
        iconToneClassName="bg-slate-100 text-slate-700"
        bordered={false}
      />

      <div className={`${appCardPaddingClass} space-y-5`}>
        <div>
          <p className={appSectionLabelClass}>Identity</p>
          <p className="mt-1.5 text-xl font-bold tracking-[-0.03em] text-slate-950">
            {profile.hero.identity}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className={appSectionLabelClass}>Expected volatility</p>
            <p className="mt-1.5 text-[15px] font-semibold text-slate-900">
              {profile.expectedVolatility.level}
            </p>
          </div>
          <div>
            <p className={appSectionLabelClass}>Goal alignment</p>
            <p className="mt-1.5 text-[15px] font-semibold text-slate-900">
              {profile.goalAlignment.label}
            </p>
          </div>
        </div>

        <Link
          href={DASHBOARD_DEEP_LINKS.portfolioHealth}
          className={`inline-flex min-h-[40px] items-center gap-1.5 ${appTextLinkClass}`}
        >
          View full analysis
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
