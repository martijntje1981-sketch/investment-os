"use client";

import Link from "next/link";
import { Activity, ScanLine, Target } from "lucide-react";

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
} from "@/lib/navigation/appRoutes";

/** Quiet feature discovery — at most three destinations. */
const TOOLS = [
  {
    href: ANALYSIS_PATH,
    title: "Analysis",
    benefit: "Performance, risk and portfolio drivers.",
    icon: ScanLine,
  },
  {
    href: GOALS_PATH,
    title: "Goals",
    benefit: "Track progress toward your targets.",
    icon: Target,
  },
  {
    href: PORTFOLIO_HEALTH_PATH,
    title: "Portfolio Scorecard",
    benefit: "Strengths, structure and resilience.",
    icon: Activity,
  },
] as const;

/**
 * Compact Dashboard discoverability for high-value authenticated tools.
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

      <div className="mt-4 grid grid-cols-1 gap-3 min-[390px]:grid-cols-3">
        {TOOLS.map(({ href, title, benefit, icon: Icon }) => {
          const isGoals = href === GOALS_PATH;
          const highlight = emphasizeGoals && isGoals;
          return (
            <Link
              key={href}
              href={href}
              data-emphasize={highlight ? "true" : undefined}
              className={`${appCardClass} ${appCardInteractiveClass} ${appCardPaddingCompactClass} flex min-h-[88px] items-start gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 ${
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
