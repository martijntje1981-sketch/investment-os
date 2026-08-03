"use client";

import Link from "next/link";
import {
  Activity,
  ChevronRight,
  ScanLine,
  Sparkles,
  Waves,
} from "lucide-react";

import {
  appCardClass,
  appCardInteractiveClass,
  appCardPaddingCompactClass,
  appSectionSubtitleClass,
  appSectionTitleClass,
  appTintedPanelClass,
} from "@/components/layout/appSurface";
import {
  ANALYSIS_PATH,
  PORTFOLIO_HEALTH_PATH,
} from "@/lib/navigation/appRoutes";

const TOOLS = [
  {
    href: PORTFOLIO_HEALTH_PATH,
    title: "Portfolio Scorecard",
    benefit: "See concentration, balance and risk in one view.",
    icon: Activity,
  },
  {
    href: ANALYSIS_PATH,
    title: "Analysis",
    benefit: "Dig into performance, dividends and holdings detail.",
    icon: ScanLine,
  },
  {
    href: "/market-pulse",
    title: "Market Pulse",
    benefit: "Track markets connected to your holdings today.",
    icon: Waves,
  },
  {
    href: "/perspectives",
    title: "Perspectives",
    benefit: "Read calm context from trusted market voices.",
    icon: Sparkles,
  },
] as const;

/**
 * Compact Dashboard discoverability for high-value authenticated tools.
 */
export function DashboardExploreTools() {
  return (
    <section
      aria-labelledby="dashboard-explore-tools-heading"
      className={`${appTintedPanelClass} ${appCardPaddingCompactClass}`}
    >
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="min-w-0">
          <h2
            id="dashboard-explore-tools-heading"
            className={appSectionTitleClass}
          >
            Explore Tobailey
          </h2>
          <p className={`mt-1 ${appSectionSubtitleClass}`}>
            Intelligence tools for your portfolio — always one tap away.
          </p>
        </div>
        <Link
          href="/discover"
          className="inline-flex min-h-[40px] items-center gap-1 text-[13px] font-semibold text-brand-navy transition hover:text-brand"
        >
          View all tools
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {TOOLS.map(({ href, title, benefit, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`${appCardClass} ${appCardInteractiveClass} ${appCardPaddingCompactClass} flex min-h-[88px] items-start gap-3`}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-navy">
              <Icon className="h-4 w-4" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block text-[15px] font-bold text-slate-950">
                {title}
              </span>
              <span className="mt-1 block text-[13px] font-medium leading-snug text-slate-500">
                {benefit}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
