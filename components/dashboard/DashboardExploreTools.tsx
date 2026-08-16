"use client";

import Link from "next/link";
import { Activity, ArrowUpRight, ScanLine, Target } from "lucide-react";

import {
  appCardPaddingCompactClass,
  appSectionSubtitleClass,
  appSectionTitleClass,
  appTintedPanelClass,
} from "@/components/layout/appSurface";
import {
  ANALYSIS_PATH,
  GOALS_PATH,
  PORTFOLIO_HEALTH_PATH,
} from "@/lib/navigation/appRoutes";

/** Quiet feature discovery — at most three destinations. */
const TOOLS = [
  {
    href: ANALYSIS_PATH,
    title: "Analysis",
    benefit: "Performance, risk and portfolio drivers",
    icon: ScanLine,
  },
  {
    href: GOALS_PATH,
    title: "Goals",
    benefit: "Track progress toward your target",
    icon: Target,
  },
  {
    href: PORTFOLIO_HEALTH_PATH,
    title: "Portfolio Scorecard",
    benefit: "Structure, health and resilience",
    icon: Activity,
  },
] as const;

/**
 * Compact Dashboard discoverability for high-value authenticated tools.
 * Mobile: full-width navigation rows. Desktop: three-card grid.
 */
export function DashboardExploreTools({
  emphasizeGoals = false,
}: {
  /** Subtle Goals emphasis when Smart Dashboard detects a milestone. */
  emphasizeGoals?: boolean;
}) {
  return (
    <section
      aria-labelledby="dashboard-explore-tools-heading"
      className={`${appTintedPanelClass} ${appCardPaddingCompactClass}`}
      data-testid="explore-tobailey"
    >
      <div className="min-w-0">
        <h2
          id="dashboard-explore-tools-heading"
          className={appSectionTitleClass}
        >
          Understand your portfolio
        </h2>
        <p className={`mt-1 ${appSectionSubtitleClass}`}>
          Go deeper when you want the full story.
        </p>
      </div>

      {/* Mobile: full-width rows */}
      <ul className="mt-3 space-y-2 md:hidden" data-testid="explore-tools-mobile">
        {TOOLS.map(({ href, title, benefit, icon: Icon }) => {
          const isGoals = href === GOALS_PATH;
          const highlight = emphasizeGoals && isGoals;
          return (
            <li key={href}>
              <Link
                href={href}
                data-emphasize={highlight ? "true" : undefined}
                className={`flex min-h-11 items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/80 px-3 py-3 transition hover:brightness-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 ${
                  highlight ? "ring-1 ring-brand/35" : ""
                }`}
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                    highlight
                      ? "bg-brand text-white"
                      : "bg-brand-soft text-brand-navy"
                  }`}
                  aria-hidden
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-bold text-slate-950">
                    {title}
                  </span>
                  <span className="mt-0.5 block text-[12px] font-medium leading-snug text-slate-500">
                    {highlight ? "Progress milestone available." : benefit}
                  </span>
                </span>
                <ArrowUpRight
                  className="h-4 w-4 shrink-0 text-slate-400"
                  aria-hidden
                />
              </Link>
            </li>
          );
        })}
      </ul>

      {/* Desktop: multi-card layout */}
      <div
        className="mt-4 hidden grid-cols-3 gap-3 md:grid"
        data-testid="explore-tools-desktop"
      >
        {TOOLS.map(({ href, title, benefit, icon: Icon }) => {
          const isGoals = href === GOALS_PATH;
          const highlight = emphasizeGoals && isGoals;
          return (
            <Link
              key={href}
              href={href}
              data-emphasize={highlight ? "true" : undefined}
              className={`flex min-h-[88px] items-start gap-3 rounded-[24px] border border-slate-200/80 bg-white/90 px-4 py-4 shadow-[var(--shadow-card)] transition hover:border-brand/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 ${
                highlight
                  ? "ring-1 ring-brand/35 motion-safe:transition-shadow"
                  : ""
              }`}
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                  highlight
                    ? "bg-brand text-white"
                    : "bg-brand-soft text-brand-navy"
                }`}
                aria-hidden
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-[14px] font-bold text-slate-950">
                  {title}
                </span>
                <span className="mt-0.5 block text-[12px] font-medium leading-snug text-slate-500">
                  {highlight ? "Progress milestone available." : benefit}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
