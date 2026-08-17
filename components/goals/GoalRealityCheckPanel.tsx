"use client";

import {
  appSectionBodyClass,
  appSectionLabelClass,
  appSectionMetaClass,
} from "@/components/layout/appSurface";
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
          className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3.5"
          data-testid="goal-reality-check-loading"
        >
          <p className={appSectionLabelClass}>Goal reality check</p>
          <p className={`mt-2 ${appSectionMetaClass}`}>
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
      className="scroll-mt-24 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4"
      aria-labelledby="goal-reality-check-heading"
      data-testid="goal-reality-check-panel"
    >
      <p
        id="goal-reality-check-heading"
        className={appSectionLabelClass}
      >
        Goal reality check
      </p>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <p className={`text-xl font-semibold tracking-tight text-slate-950`}>
            {formatExpectedReturnPa(realityCheck.expectedAnnualReturnPercent)}
          </p>
          <p className={`mt-0.5 ${appSectionMetaClass}`}>Your expected return</p>
        </div>
        <div>
          <p className={`text-xl font-semibold tracking-tight text-slate-950`}>
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

      <p className={`mt-3 text-[15px] font-semibold text-slate-800`}>
        {gapDisplay}
      </p>

      <p className={`mt-2 ${appSectionBodyClass}`}>{realityCheck.conclusion}</p>

      {realityCheck.qualityNote ? (
        <p className={`mt-2 ${appSectionMetaClass}`}>{realityCheck.qualityNote}</p>
      ) : null}

      <p className={`mt-3 ${appSectionMetaClass}`}>
        {realityCheck.methodologyNote}
      </p>
      <p className={`mt-1 ${appSectionMetaClass}`}>{realityCheck.disclaimer}</p>
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
      className={`${appSectionMetaClass} mt-1`}
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
