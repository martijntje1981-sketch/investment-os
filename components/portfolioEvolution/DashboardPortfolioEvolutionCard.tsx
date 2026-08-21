"use client";

import Link from "next/link";

import { PortfolioEvolutionVisual } from "@/components/portfolioEvolution/PortfolioEvolutionVisual";
import {
  appCardPaddingClass,
  appIntelligenceAccentStrongCardClass,
  appSectionLabelClass,
  appSectionMetaClass,
  appSectionTitleClass,
  appTextLinkClass,
} from "@/components/layout/appSurface";
import {
  EVOLUTION_BUILDING_BODY,
  EVOLUTION_BUILDING_HEADLINE,
  PORTFOLIO_EVOLUTION_HREF,
  type PortfolioEvolutionTimeline,
} from "@/lib/services/portfolioEvolution";
import { DASHBOARD_DEEP_LINKS } from "@/lib/navigation/deepLinks";

export function DashboardPortfolioEvolutionCard({
  timeline,
}: {
  timeline: PortfolioEvolutionTimeline;
}) {
  return (
    <section
      aria-labelledby="dashboard-evolution-heading"
      className={`${appIntelligenceAccentStrongCardClass} min-w-0 overflow-x-clip`}
      data-testid="dashboard-portfolio-evolution"
    >
      <div className={`${appCardPaddingClass} min-w-0`}>
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className={appSectionLabelClass} id="dashboard-evolution-heading">
              Portfolio Evolution
            </p>
            <h2 className={appSectionTitleClass}>See how your portfolio changed</h2>
          </div>
          <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end">
            <Link href={PORTFOLIO_EVOLUTION_HREF} className={`${appTextLinkClass} shrink-0`}>
              View full evolution →
            </Link>
            <Link
              href={DASHBOARD_DEEP_LINKS.portfolioExposure}
              className={`${appTextLinkClass} shrink-0`}
            >
              View allocation →
            </Link>
          </div>
        </div>

        {timeline.emptyState === "building" && !timeline.hasValueSeries ? (
          <div className="mt-5">
            <p className="text-[1.15rem] font-semibold text-slate-950">
              {EVOLUTION_BUILDING_HEADLINE}
            </p>
            <p className={`mt-1 ${appSectionMetaClass}`}>{EVOLUTION_BUILDING_BODY}</p>
          </div>
        ) : (
          <div className="mt-5">
            <PortfolioEvolutionVisual timeline={timeline} variant="dashboard" />
          </div>
        )}
      </div>
    </section>
  );
}
