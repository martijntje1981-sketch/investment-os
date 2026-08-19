"use client";

import {
  appSectionBodyClass,
  appSectionLabelClass,
  appSectionMetaClass,
} from "@/components/layout/appSurface";
import {
  appIdentityOnTrackCardClass,
  appIdentityOnTrackMetricClass,
  appKpiGoalClass,
} from "@/components/layout/semanticIdentity";
import { formatExpectedReturnPa } from "@/lib/client/expectedReturnAssumption";
import type { GoalRealityCheck } from "@/lib/services/goals/buildGoalRealityCheck";

function formatSignedPp(value: number): string {
  if (Math.abs(value) < 0.05) return "0pp";
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}pp`;
}

function comparableLabel(check: Extract<GoalRealityCheck, { available: true }>): string {
  if (check.comparableKind === "last_12_months") return "Last 12 months";
  if (check.comparableKind === "annualized_performance") {
    return "Annualized performance";
  }
  return "Recent annualized pace";
}

/**
 * Compact Goals surface — assumption vs verified portfolio pace.
 */
export function GoalRealityCheckPanel({
  realityCheck,
  isLoading = false,
}: {
  realityCheck: GoalRealityCheck;
  isLoading?: boolean;
}) {
  if (!realityCheck.available) {
    if (isLoading) {
      return (
        <div
          className={`${appIdentityOnTrackCardClass} px-4 py-3.5`}
          data-testid="goal-reality-check-loading"
        >
          <p className={appSectionLabelClass}>Goal reality check</p>
          <p className={`mt-2 ${appSectionBodyClass}`}>
            Comparing your assumption with verified portfolio history…
          </p>
        </div>
      );
    }
    return null;
  }

  const gapDisplay = formatSignedPp(realityCheck.gapPp);

  return (
    <section
      id="goal-reality-check"
      className={`scroll-mt-24 px-4 py-5 sm:px-5 ${appIdentityOnTrackCardClass}`}
      aria-labelledby="goal-reality-check-heading"
      data-testid="goal-reality-check-panel"
    >
      <p
        id="goal-reality-check-heading"
        className={`${appSectionLabelClass} text-amber-900`}
      >
        Goal reality check
      </p>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className={appIdentityOnTrackMetricClass}>
          <p className={`text-[1.375rem] tracking-tight sm:text-[1.5rem] ${appKpiGoalClass}`}>
            {formatExpectedReturnPa(realityCheck.expectedAnnualReturnPercent)}
          </p>
          <p className={`mt-0.5 ${appSectionMetaClass}`}>Your expected return</p>
        </div>
        <div className={appIdentityOnTrackMetricClass}>
          <p className={`text-[1.375rem] tracking-tight sm:text-[1.5rem] ${appKpiGoalClass}`}>
            {realityCheck.comparableAnnualPercent.toFixed(1)}%
          </p>
          <p className={`mt-0.5 ${appSectionMetaClass}`}>
            {comparableLabel(realityCheck)}
          </p>
          <p className={`mt-0.5 ${appSectionMetaClass}`}>
            Based on {realityCheck.sourcePeriodLabel}
          </p>
        </div>
      </div>

      <p className={`mt-4 text-[18px] font-bold ${appKpiGoalClass}`}>
        {gapDisplay}
      </p>

      <p className={`mt-2 ${appSectionBodyClass}`}>{realityCheck.conclusion}</p>

      {realityCheck.qualityNote ? (
        <p className={`mt-2 ${appSectionBodyClass}`}>{realityCheck.qualityNote}</p>
      ) : null}

      <p className={`mt-3 ${appSectionBodyClass}`}>
        {realityCheck.methodologyNote}
      </p>
      <p className={`mt-1 ${appSectionBodyClass}`}>{realityCheck.disclaimer}</p>
    </section>
  );
}

/** One-line Analysis context when Reality Check is available. */
export function GoalRealityCheckCompactLink({
  realityCheck,
}: {
  realityCheck: GoalRealityCheck;
}) {
  if (!realityCheck.available) return null;
  if (realityCheck.historyQuality === "short") return null;

  return (
    <p
      className={`${appSectionBodyClass} mt-1`}
      data-testid="goal-reality-check-compact-link"
    >
      <a
        href="/goals#goal-reality-check"
        className="font-semibold text-sky-800 underline-offset-2 hover:underline"
      >
        Goal Reality Check
      </a>
      {": "}
      {realityCheck.conclusion}
    </p>
  );
}
