"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowUpRight, Shield } from "lucide-react";

import {
  appCardPaddingCompactClass,
  appSectionBodyClass,
  appSectionLabelClass,
  appSectionMetaClass,
  appTextLinkClass,
  appTintedPanelClass,
} from "@/components/layout/appSurface";
import { DASHBOARD_DEEP_LINKS } from "@/lib/navigation/deepLinks";
import { buildResilienceProfile } from "@/lib/services/resilience";
import type {
  GoalSettings,
  StoredPortfolioHolding,
} from "@/lib/types/portfolioStorage";

function formatSignedImpact(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

/**
 * Compact Dashboard conclusion from Phase 2 Resilience.
 * Full exploration lives on Analysis `#scenario-stress`.
 */
export function DashboardPortfolioResilienceCard({
  holdings,
  goal = null,
  hasSavedGoal = false,
}: {
  holdings: StoredPortfolioHolding[];
  goal?: GoalSettings | null;
  hasSavedGoal?: boolean;
}) {
  const profile = useMemo(
    () =>
      buildResilienceProfile({
        holdings,
        goal,
        hasSavedGoal,
      }),
    [holdings, goal, hasSavedGoal],
  );

  if (profile.status === "insufficient_data" || profile.score === null) {
    return null;
  }

  const mostSensitive = profile.mostSensitive;
  const goalLine = profile.goalContext?.summary ?? null;

  return (
    <section
      className={`min-w-0 ${appTintedPanelClass} ${appCardPaddingCompactClass}`}
      aria-labelledby="dashboard-portfolio-resilience-heading"
      data-testid="dashboard-portfolio-resilience"
    >
      <div className="flex items-start gap-3">
        <div className="rounded-2xl bg-sky-50 p-2.5 text-sky-800 ring-1 ring-sky-100">
          <Shield className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className={appSectionLabelClass}>Portfolio resilience</p>
          <h2
            id="dashboard-portfolio-resilience-heading"
            className="mt-0.5 text-[1.05rem] font-bold tracking-[-0.02em] text-slate-950"
          >
            Structural sensitivity
          </h2>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-2">
        <p className="text-2xl font-semibold tabular-nums tracking-tight text-slate-950">
          {profile.score}
          <span className="text-base font-medium text-slate-500">/100</span>
        </p>
        {profile.bandLabel ? (
          <p className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-sky-900">
            {profile.bandLabel}
          </p>
        ) : null}
      </div>

      {mostSensitive ? (
        <div className="mt-3 rounded-xl border border-slate-200/80 bg-white/70 px-3 py-2.5">
          <p className={appSectionLabelClass}>Most sensitive to</p>
          <p className="mt-0.5 text-sm font-semibold text-slate-900">
            <span className="sm:hidden">
              {mostSensitive.scenarioName}
              {" · "}
              est. impact{" "}
              {formatSignedImpact(
                mostSensitive.estimatedPortfolioImpactPercent,
              )}
            </span>
            <span className="hidden sm:inline">{mostSensitive.scenarioName}</span>
          </p>
          <p className={`mt-0.5 hidden sm:block ${appSectionMetaClass}`}>
            Estimated portfolio impact{" "}
            <span className="font-semibold tabular-nums text-slate-800">
              {formatSignedImpact(
                mostSensitive.estimatedPortfolioImpactPercent,
              )}
            </span>
          </p>
        </div>
      ) : (
        <p className={`mt-3 ${appSectionBodyClass}`}>
          Supported scenario sensitivity is unavailable for the current portfolio.
        </p>
      )}

      {goalLine ? (
        <p className={`mt-2 line-clamp-2 ${appSectionMetaClass}`}>{goalLine}</p>
      ) : null}

      <Link
        href={DASHBOARD_DEEP_LINKS.scenarioStress}
        className={`mt-3 inline-flex min-h-11 items-center gap-1.5 ${appTextLinkClass}`}
        data-testid="dashboard-resilience-cta"
      >
        Explore scenarios &amp; resilience
        <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </section>
  );
}
