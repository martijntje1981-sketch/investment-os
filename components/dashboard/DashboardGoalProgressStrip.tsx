"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import {
  appDashboardDarkMetaClass,
  appDashboardHeroSubordinateClass,
  appHeroMetricLabelClass,
  appHeroPaddingCompactClass,
} from "@/components/layout/appSurface";
import { useBaseCurrencyDisplay } from "@/lib/client/baseCurrencyDisplay";
import {
  buildGoalHeroProgressState,
  formatGoalHeroProgressPercent,
} from "@/lib/client/goalHeroProgress";
import {
  buildGoalPeriodSnapshot,
  formatGoalPeriodDetail,
  GOAL_PROGRESS_PERIOD_ORDER,
  sliceHistoryToFiveYears,
  type GoalPeriodHistoryInput,
  type GoalProgressPeriodId,
} from "@/lib/client/goalProgressPeriods";
import { DASHBOARD_DEEP_LINKS } from "@/lib/navigation/deepLinks";
import { GOALS_PATH } from "@/lib/navigation/appRoutes";
import { goalsStatusBadgeLabel } from "@/lib/services/goals/buildGoalsIntelligence";
import type { GoalProgress } from "@/lib/services/goals/goalProgressEngine";
import type { PortfolioPerformanceHistoryApiResponse } from "@/lib/services/performance/types";

function toHistoryInput(
  data: PortfolioPerformanceHistoryApiResponse | null | undefined,
): GoalPeriodHistoryInput | null {
  if (!data || data.success === false) return null;
  return {
    startingValue: data.startingValue,
    endingValue: data.endingValue,
    investmentReturn: data.investmentReturn,
    chartPoints: data.chartPoints,
    dataAvailability: data.dataAvailability,
    availabilityMessage: data.availabilityMessage,
  };
}

export function DashboardGoalProgressStrip({
  progress,
  hasSavedGoal,
  targetYear = null,
  monthHistory = null,
  yearHistory = null,
  allHistory = null,
  historyReady = true,
  monthHistoryLoading = false,
  yearHistoryLoading = false,
  allHistoryLoading = false,
}: {
  progress: GoalProgress;
  hasSavedGoal: boolean;
  targetYear?: number | null;
  monthHistory?: PortfolioPerformanceHistoryApiResponse | null;
  yearHistory?: PortfolioPerformanceHistoryApiResponse | null;
  allHistory?: PortfolioPerformanceHistoryApiResponse | null;
  historyReady?: boolean;
  monthHistoryLoading?: boolean;
  yearHistoryLoading?: boolean;
  allHistoryLoading?: boolean;
}) {
  const { formatEur } = useBaseCurrencyDisplay();
  const [period, setPeriod] = useState<GoalProgressPeriodId>("ALL");
  const state = buildGoalHeroProgressState({
    progress,
    hasSavedGoal,
    formatCurrency: formatEur,
  });

  const histories = useMemo(
    () => ({
      "1M": toHistoryInput(monthHistory),
      "1Y": toHistoryInput(yearHistory),
      ALL: toHistoryInput(allHistory),
      "5Y": sliceHistoryToFiveYears(toHistoryInput(allHistory)),
    }),
    [allHistory, monthHistory, yearHistory],
  );

  const periodSnapshot = useMemo(
    () =>
      buildGoalPeriodSnapshot({
        period,
        targetValue: state.targetValue ?? 0,
        currentValue: state.currentValue,
        history: histories[period],
      }),
    [histories, period, state.currentValue, state.targetValue],
  );

  const href =
    hasSavedGoal && progress.hasGoal
      ? DASHBOARD_DEEP_LINKS.goalProgress
      : `${GOALS_PATH}#goal-edit`;

  const periodLoading =
    period === "1M"
      ? monthHistoryLoading
      : period === "1Y"
        ? yearHistoryLoading
        : allHistoryLoading;
  const periodDetail =
    !periodSnapshot.available && (!historyReady || periodLoading)
      ? "Checking this period…"
      : formatGoalPeriodDetail(periodSnapshot, formatEur);

  const headline =
    state.status === "ready" &&
    state.currentValue !== null &&
    state.targetValue !== null
      ? `${formatEur(state.currentValue)} of ${formatEur(state.targetValue)} · ${formatGoalHeroProgressPercent(state.displayPercent)}`
      : state.status === "unconfigured"
        ? "Set a goal to track progress here"
        : state.status === "invalid-target"
          ? "Set a valid target amount"
          : "Portfolio value is unavailable";

  const statusLine =
    hasSavedGoal && progress.hasGoal
      ? [
          goalsStatusBadgeLabel(progress.status, progress.goalReached),
          Number.isFinite(targetYear) ? `Target ${targetYear}` : null,
        ]
          .filter((part): part is string => Boolean(part))
          .join(" · ")
      : "";

  return (
    <article
      className={`${appDashboardHeroSubordinateClass} ${appHeroPaddingCompactClass}`}
      data-testid="dashboard-goal-progress"
    >
      <Link
        href={href}
        className="block min-w-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
        aria-label={
          state.status === "ready"
            ? `${state.ariaLabel} Open goal.`
            : `${headline}. Open goal.`
        }
      >
        <p className={appHeroMetricLabelClass}>Goal progress</p>
        <p className="mt-1 text-[1.05rem] font-semibold leading-snug tracking-[-0.02em] text-white sm:text-[1.15rem]">
          {headline}
        </p>
        <div
          className="relative mt-3 h-1.5 overflow-hidden rounded-full bg-white/12"
          aria-hidden
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-q3-deep via-q3-strong to-q3 transition-[width] duration-500 motion-reduce:transition-none"
            style={{ width: `${state.fillPercent}%` }}
          />
        </div>
        {statusLine ? (
          <p className={`mt-2 ${appDashboardDarkMetaClass}`}>{statusLine}</p>
        ) : null}
      </Link>

      {hasSavedGoal && progress.hasGoal ? (
        <div className="mt-3 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div
            className="inline-flex min-w-0 items-center gap-0.5 self-start rounded-full bg-white/8 p-0.5"
            role="radiogroup"
            aria-label="Goal progress period"
            data-testid="dashboard-goal-period-selector"
          >
            {GOAL_PROGRESS_PERIOD_ORDER.map((option) => {
              const selected = period === option;
              return (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setPeriod(option)}
                  className={`min-h-[44px] min-w-[44px] rounded-full px-2 text-[11px] font-semibold tracking-wide transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 ${
                    selected
                      ? "bg-white/15 text-white"
                      : "text-white/55 hover:bg-white/10 hover:text-white"
                  }`}
                  data-testid={`dashboard-goal-period-${option}`}
                >
                  {option === "ALL" ? "All" : option}
                </button>
              );
            })}
          </div>
          <p className={`min-w-0 ${appDashboardDarkMetaClass}`}>
            {periodDetail}
          </p>
        </div>
      ) : null}
    </article>
  );
}
