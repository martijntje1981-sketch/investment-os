"use client";

import Link from "next/link";

import {
  appCardPaddingClass,
  appCardValueClass,
  appDashboardLightCardClass,
  appSectionBodyClass,
  appSectionLabelClass,
  appSectionSubtitleClass,
} from "@/components/layout/appSurface";
import { useBaseCurrencyDisplay } from "@/lib/client/baseCurrencyDisplay";
import type { DashboardPortfolioSnapshot } from "@/lib/client/dashboardPortfolioSnapshot";
import { formatPortfolioPercent } from "@/lib/client/portfolioAnalysis";
import { DASHBOARD_DEEP_LINKS } from "@/lib/navigation/deepLinks";

export function GoalProgressCard({
  snapshot,
}: {
  snapshot: DashboardPortfolioSnapshot;
}) {
  const { formatEur } = useBaseCurrencyDisplay();
  const progressWidth = snapshot.goalCompleted
    ? 100
    : snapshot.hasSavedGoal
      ? Math.max(snapshot.goalProgress, 1)
      : 0;

  if (!snapshot.hasSavedGoal || snapshot.goalTarget === null) {
    return (
      <article className={`${appDashboardLightCardClass} ${appCardPaddingClass}`}>
        <p className={appSectionLabelClass}>Goal progress</p>
        <h2 className={`mt-2.5 ${appCardValueClass}`}>No goal saved yet</h2>
        <p className={`mt-2 ${appSectionBodyClass} text-slate-600`}>
          Set a target to track progress from your current portfolio value.
        </p>
        <Link
          href={DASHBOARD_DEEP_LINKS.goalProgress}
          className="mt-6 inline-flex min-h-[44px] items-center rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Set your goal
        </Link>
      </article>
    );
  }

  if (!snapshot.portfolioValueAvailable) {
    return (
      <article className={`${appDashboardLightCardClass} ${appCardPaddingClass}`}>
        <p className={appSectionLabelClass}>Goal progress</p>
        <p className={`mt-2.5 ${appCardValueClass}`}>Portfolio value unavailable</p>
        <p className={`mt-2 ${appSectionSubtitleClass}`}>
          Target {formatEur(snapshot.goalTarget)}
          {snapshot.goalTargetYear ? (
            <span className="hidden min-[390px]:inline">
              {" · "}
              {snapshot.goalTargetYear}
            </span>
          ) : null}
        </p>
      </article>
    );
  }

  return (
    <article className={`${appDashboardLightCardClass} ${appCardPaddingClass}`}>
      <p className={appSectionLabelClass}>Goal progress</p>
      <p className={`mt-2.5 ${appCardValueClass}`}>
        {formatEur(snapshot.portfolioValue)} of{" "}
        {formatEur(snapshot.goalTarget)}
      </p>
      <p className={`mt-2 ${appSectionSubtitleClass}`}>
        {snapshot.goalCompleted
          ? "Goal achieved"
          : `${formatPortfolioPercent(snapshot.goalProgress)} complete`}
        {snapshot.goalTargetYear ? (
          <span className="hidden min-[390px]:inline">
            {" · "}
            Target {snapshot.goalTargetYear}
          </span>
        ) : null}
      </p>
      <div
        className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progressWidth)}
        aria-label="Goal progress"
      >
        <div
          className="h-full rounded-full bg-slate-900"
          style={{ width: `${progressWidth}%` }}
        />
      </div>
    </article>
  );
}
