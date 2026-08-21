"use client";

import Link from "next/link";
import { ChartPie } from "lucide-react";

import {
  appCardPaddingCompactClass,
  appDashboardLightCardClass,
  appSectionLabelClass,
  appSectionMetaClass,
  appTextLinkClass,
} from "@/components/layout/appSurface";
import { DASHBOARD_DEEP_LINKS } from "@/lib/navigation/deepLinks";

/**
 * Compact Portfolio-page route to the full exposure experience on Analysis.
 */
export function PortfolioAllocationNavCard() {
  return (
    <section
      className={`${appDashboardLightCardClass} ${appCardPaddingCompactClass} min-w-0 overflow-x-clip`}
      data-testid="portfolio-allocation-nav"
    >
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 ring-1 ring-slate-200">
          <ChartPie className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className={appSectionLabelClass}>Portfolio exposure</p>
          <p className={`mt-1 ${appSectionMetaClass}`}>
            See how your holdings are allocated today.
          </p>
          <Link
            href={DASHBOARD_DEEP_LINKS.portfolioExposure}
            className={`${appTextLinkClass} mt-1`}
          >
            View allocation →
          </Link>
        </div>
      </div>
    </section>
  );
}
