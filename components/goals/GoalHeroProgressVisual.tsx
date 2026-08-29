"use client";

import {
  appDashboardDarkMetaClass,
  appDashboardHeroMetricLabelClass,
  appHeroMetricLabelClass,
  appSectionMetaClass,
} from "@/components/layout/appSurface";
import { useBaseCurrencyDisplay } from "@/lib/client/baseCurrencyDisplay";
import {
  buildGoalHeroProgressState,
  formatGoalHeroProgressPercent,
} from "@/lib/client/goalHeroProgress";
import type { GoalProgress } from "@/lib/services/goals/goalProgressEngine";

export function GoalHeroProgressVisual({
  progress,
  hasSavedGoal,
  onDark = false,
}: {
  progress: Pick<
    GoalProgress,
    | "currentValue"
    | "targetValue"
    | "hasGoal"
    | "goalReached"
    | "portfolioValueAvailable"
  >;
  hasSavedGoal: boolean;
  onDark?: boolean;
}) {
  const { formatEur } = useBaseCurrencyDisplay();
  const state = buildGoalHeroProgressState({
    progress,
    hasSavedGoal,
    formatCurrency: formatEur,
  });
  const metaClass = onDark ? appDashboardDarkMetaClass : appSectionMetaClass;
  const labelClass = onDark
    ? appHeroMetricLabelClass
    : appDashboardHeroMetricLabelClass;
  const valueClass = onDark ? "text-white" : "text-slate-950";

  if (state.status === "unconfigured") {
    return (
      <p className={`${metaClass} text-sm leading-relaxed`}>
        Save a financial target to track your progress trajectory here.
      </p>
    );
  }

  if (state.status === "invalid-target") {
    return (
      <p className={`${metaClass} text-sm leading-relaxed`}>
        Set a valid target amount to see goal progress.
      </p>
    );
  }

  if (state.status === "unavailable") {
    return (
      <p className={`${metaClass} text-sm leading-relaxed`}>
        Portfolio value is unavailable, so goal progress cannot be shown yet.
      </p>
    );
  }

  return (
    <div aria-label={state.ariaLabel}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className={labelClass}>Achieved</p>
          <p
            className={`mt-1 text-2xl font-black tabular-nums tracking-[-0.03em] sm:text-3xl ${valueClass}`}
          >
            {formatGoalHeroProgressPercent(state.displayPercent)}
          </p>
        </div>
        <div className="text-right">
          <p className={labelClass}>Current</p>
          <p className={`mt-1 text-sm font-bold tabular-nums ${valueClass}`}>
            {state.currentValue !== null
              ? formatEur(state.currentValue)
              : "Unavailable"}
          </p>
          <p className={`mt-2 ${labelClass}`}>Target</p>
          <p className={`mt-1 text-sm font-bold tabular-nums ${valueClass}`}>
            {state.targetValue !== null
              ? formatEur(state.targetValue)
              : "Unavailable"}
          </p>
        </div>
      </div>

      <div
        className={`relative mt-5 h-2 overflow-hidden rounded-full ${
          onDark ? "bg-white/10" : "bg-q3-soft"
        }`}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-q3-deep via-q3-strong to-q3 transition-[width] duration-500 motion-reduce:transition-none"
          style={{ width: `${state.fillPercent}%` }}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={state.fillPercent}
          aria-label="Goal completion trajectory"
        />
        {state.fillPercent > 0 ? (
          <span
            className={`absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border border-q3-strong motion-reduce:transition-none ${
              onDark
                ? "bg-white shadow-[0_0_0_4px_rgba(255,255,255,0.12)]"
                : "bg-white shadow-[0_0_0_4px_rgba(24,69,124,0.16)]"
            }`}
            style={{ left: `calc(${state.fillPercent}% - 6px)` }}
            aria-hidden
          />
        ) : null}
      </div>
    </div>
  );
}
