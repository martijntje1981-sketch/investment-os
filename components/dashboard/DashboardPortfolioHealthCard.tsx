import Link from "next/link";
import { Activity, ArrowRight } from "lucide-react";

import { DashboardSectionHeader } from "@/components/dashboard/DashboardSectionHeader";
import {
  appCardPaddingClass,
  appDashboardLightCardClass,
  appSectionBodyClass,
  appSectionLabelClass,
  appSectionMetaClass,
  appTextLinkClass,
} from "@/components/layout/appSurface";
import { buildHeroHealthPreview } from "@/lib/client/dashboardHeroIntelligence";
import { DASHBOARD_DEEP_LINKS } from "@/lib/navigation/deepLinks";
import type { PortfolioHealthProfile } from "@/lib/services/portfolio/portfolioHealthProfile";

function VolatilityRing({
  progress,
  available,
  label,
}: {
  progress: number | null;
  available: boolean;
  label: string;
}) {
  const size = 72;
  const stroke = 7;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const fill =
    available && progress != null ? Math.min(1, Math.max(0, progress)) : 0;
  const offset = circumference * (1 - fill);

  return (
    <div className="relative shrink-0" aria-hidden={!available}>
      <svg
        width={size}
        height={size}
        className="-rotate-90"
        role="img"
        aria-label={
          available
            ? `Expected volatility intensity: ${label}`
            : "Expected volatility unavailable"
        }
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgb(226 232 240)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={available ? "rgb(14 165 233)" : "rgb(203 213 225)"}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={available ? offset : circumference * 0.82}
        />
      </svg>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-2 text-center">
        <span className="text-[11px] font-bold leading-tight tracking-[-0.01em] text-slate-800">
          {available ? label : "—"}
        </span>
      </div>
    </div>
  );
}

/**
 * Compact Portfolio Health preview — descriptive identity, not a numeric score.
 */
export function DashboardPortfolioHealthCard({
  profile,
}: {
  profile: PortfolioHealthProfile;
}) {
  const preview = buildHeroHealthPreview(profile);

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

      <div className={`${appCardPaddingClass} space-y-4`}>
        <div className="flex min-w-0 items-center gap-4">
          <VolatilityRing
            progress={preview.ringProgress}
            available={preview.available}
            label={profile.expectedVolatility.level}
          />
          <div className="min-w-0 flex-1">
            <p className={appSectionLabelClass}>Portfolio identity</p>
            <p className="mt-1 text-lg font-bold tracking-[-0.03em] text-slate-950 sm:text-xl">
              {profile.hero.identity}
            </p>
            <p className={`mt-1 ${appSectionMetaClass}`}>
              Ring shows expected volatility intensity — not a health score.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="min-w-0 rounded-2xl bg-slate-50/90 px-3.5 py-3">
            <p className={appSectionLabelClass}>Expected volatility</p>
            <p className="mt-1 text-[15px] font-semibold text-slate-900">
              {profile.expectedVolatility.level}
            </p>
          </div>
          <div className="min-w-0 rounded-2xl bg-slate-50/90 px-3.5 py-3">
            <p className={appSectionLabelClass}>Goal alignment</p>
            <p className="mt-1 text-[15px] font-semibold text-slate-900">
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
