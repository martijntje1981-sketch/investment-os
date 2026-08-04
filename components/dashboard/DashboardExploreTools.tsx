"use client";

import Link from "next/link";
import {
  Activity,
  History,
  ScanLine,
  Sparkles,
  Target,
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
  GOALS_PATH,
  PORTFOLIO_HEALTH_PATH,
  PORTFOLIO_HISTORY_PATH,
} from "@/lib/navigation/appRoutes";

const TOOLS = [
  {
    href: PORTFOLIO_HEALTH_PATH,
    title: "Portfolio Scorecard",
    benefit: "Understand the structure and resilience of your portfolio.",
    icon: Activity,
  },
  {
    href: PORTFOLIO_HISTORY_PATH,
    title: "Portfolio History",
    benefit: "Review contributions, withdrawals, and export your ledger.",
    icon: History,
  },
  {
    href: ANALYSIS_PATH,
    title: "Analysis",
    benefit: "Explore performance, risk and portfolio drivers.",
    icon: ScanLine,
  },
  {
    href: "/market-pulse",
    title: "Market Pulse",
    benefit: "Follow the markets and assets shaping your portfolio.",
    icon: Waves,
  },
  {
    href: "/perspectives",
    title: "Perspectives",
    benefit: "Watch trusted investing and macro perspectives.",
    icon: Sparkles,
  },
  {
    href: GOALS_PATH,
    title: "Goals",
    benefit: "Track progress toward your financial targets.",
    icon: Target,
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
      <div className="min-w-0">
        <h2
          id="dashboard-explore-tools-heading"
          className={appSectionTitleClass}
        >
          Explore Tobailey
        </h2>
        <p className={`mt-1 ${appSectionSubtitleClass}`}>
          The strongest tools for understanding your portfolio.
        </p>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 min-[390px]:grid-cols-2 lg:grid-cols-3">
        {TOOLS.map(({ href, title, benefit, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`${appCardClass} ${appCardInteractiveClass} ${appCardPaddingCompactClass} flex min-h-[92px] items-start gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2`}
          >
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-navy"
              aria-hidden
            >
              <Icon className="h-4 w-4" />
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
