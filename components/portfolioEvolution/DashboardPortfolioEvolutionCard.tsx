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
import { DashboardPortfolioStance } from "@/components/portfolioStance/DashboardPortfolioStance";
import {
  EVOLUTION_BUILDING_BODY,
  EVOLUTION_BUILDING_HEADLINE,
  PORTFOLIO_EVOLUTION_HREF,
  type PortfolioEvolutionTimeline,
} from "@/lib/services/portfolioEvolution";
import type { PortfolioStanceHistory } from "@/lib/services/portfolioStance";
import { DASHBOARD_DEEP_LINKS } from "@/lib/navigation/deepLinks";

export function DashboardPortfolioEvolutionCard({
  timeline,
  stanceHistory,
}: {
  timeline: PortfolioEvolutionTimeline;
  stanceHistory?: PortfolioStanceHistory | null;
}) {
  return (
    <section
      aria-labelledby="dashboard-evolution-heading"
      className={`${appIntelligenceAccentStrongCardClass} min-w-0 overflow-x-clip`}
      data-testid="dashboard-portfolio-evolution"
    >
      <div className={`${appCardPaddingClass} min-w-0`}>
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className={appSectionLabelClass} id="dashboard-evolution-heading">
              Portfolio Evolution
            </p>
            <h2 className={appSectionTitleClass}>See how your portfolio changed</h2>
          </div>
          <div className="flex min-w-0 flex-wrap items-center justify-start gap-x-5 gap-y-1 sm:justify-end">
            <Link href={PORTFOLIO_EVOLUTION_HREF} className={`${appTextLinkClass} shrink-0`}>
              View full evolution →
            </Link>
            <Link
              href={DASHBOARD_DEEP_LINKS.portfolioExposure}
              className="inline-flex min-h-[44px] shrink-0 items-center text-[16px] font-medium text-slate-700 underline-offset-2 transition hover:text-brand-navy hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
            >
              View allocation →
            </Link>
          </div>
        </div>

        {timeline.emptyState === "building" &&
        !timeline.hasValueSeries &&
        timeline.beforeNow.length === 0 &&
        !timeline.mixCheckpoints ? (
          <div className="mt-5">
            <p className="text-[1.15rem] font-semibold text-slate-950">
              {EVOLUTION_BUILDING_HEADLINE}
            </p>
            <p className={`mt-1 ${appSectionMetaClass}`}>{EVOLUTION_BUILDING_BODY}</p>
            {stanceHistory ? (
              <div className="mt-5">
                <DashboardPortfolioStance history={stanceHistory} />
              </div>
            ) : null}
          </div>
        ) : (
          <div className="mt-5">
            <PortfolioEvolutionVisual
              timeline={timeline}
              variant="dashboard"
              stance={
                stanceHistory ? (
                  <DashboardPortfolioStance history={stanceHistory} />
                ) : null
              }
            />
          </div>
        )}
      </div>
    </section>
  );
}
