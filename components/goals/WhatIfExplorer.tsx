"use client";

import { useMemo, useState } from "react";
import { FlaskConical } from "lucide-react";

import {
  appCardClass,
  appCardPaddingClass,
  appHeroMetricLabelClass,
  appSectionBodyClass,
  appSectionLabelClass,
  appSectionMetaClass,
  appSectionTitleClass,
} from "@/components/layout/appSurface";
import {
  detailsToggleClass,
  personalChoiceClass,
  scenarioChoiceClass,
} from "@/components/analysis/scenarioStressControls";
import { CompleteUpgradeLink } from "@/components/product/CompleteUpgradeLink";
import { SEE_COMPLETE_ANALYSIS_LABEL } from "@/lib/services/productAccess";
import type { ProductAccess } from "@/lib/services/productAccess";
import { selectRelevantPortfolioScenarios } from "@/lib/services/scenarioRelevance";
import type { ScenarioId } from "@/lib/services/scenarioEngine";
import {
  buildContributionWhatIfPresets,
  buildPlanningAssumptionPresets,
  buildWhatIfScenario,
  canExploreFullWhatIf,
  CONTRIBUTION_WHATIF_SLIDER_STEP,
  WHAT_IF_DISCLAIMER,
} from "@/lib/services/whatIf";
import type { WhatIfUnsupportedScenarioId } from "@/lib/services/whatIf";
import type {
  GoalSettings,
  StoredPortfolioHolding,
} from "@/lib/types/portfolioStorage";

type ExplorerSelection =
  | { kind: "modeled"; scenarioId: ScenarioId }
  | { kind: "unsupported"; scenarioId: WhatIfUnsupportedScenarioId }
  | { kind: "none" };

function impactToneClass(value: number | null): string {
  if (value == null || value === 0) return "text-slate-950";
  return value < 0 ? "text-rose-700" : "text-emerald-800";
}

function formatSignedPercent(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function CompareRow({
  label,
  current,
  whatIf,
}: {
  label: string;
  current: string;
  whatIf: string;
}) {
  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border-2 border-teal-200 bg-white">
      <p className={`border-b border-teal-100 bg-teal-50 px-4 py-2 ${appSectionLabelClass} text-teal-900`}>
        {label}
      </p>
      <div className="grid min-w-0 grid-cols-1 gap-0 sm:grid-cols-2">
        <div className="min-w-0 border-b border-slate-100 bg-slate-50 px-4 py-3.5 sm:border-b-0 sm:border-r">
          <p className={appSectionMetaClass}>Current</p>
          <p className="mt-1 break-words text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">
            {current}
          </p>
        </div>
        <div className="min-w-0 bg-gradient-to-br from-teal-50 to-emerald-50 px-4 py-3.5">
          <p className={`${appSectionMetaClass} text-teal-800`}>What if</p>
          <p className="mt-1 break-words text-xl font-bold tracking-tight text-teal-900 sm:text-2xl">
            {whatIf}
          </p>
        </div>
      </div>
    </div>
  );
}

export function WhatIfExplorer({
  holdings,
  goal,
  hasSavedGoal,
  currentPortfolioValue,
  portfolioValueAvailable,
  productAccess,
  formatEur,
  formatPercent,
}: {
  holdings: StoredPortfolioHolding[];
  goal: GoalSettings | null;
  hasSavedGoal: boolean;
  currentPortfolioValue: number | null;
  portfolioValueAvailable: boolean;
  productAccess: ProductAccess;
  formatEur: (value: number) => string;
  formatPercent: (value: number) => string;
}) {
  const relevant = useMemo(
    () => selectRelevantPortfolioScenarios(holdings),
    [holdings],
  );
  const canExplore = canExploreFullWhatIf(productAccess);
  const [selection, setSelection] = useState<ExplorerSelection>({
    kind: "modeled",
    scenarioId: relevant.defaultScenarioId,
  });
  const [contributionOverride, setContributionOverride] = useState<
    number | null
  >(null);
  const [assumptionOverride, setAssumptionOverride] = useState<number | null>(
    null,
  );

  const effectiveSelection = useMemo<ExplorerSelection>(() => {
    if (!canExplore && selection.kind !== "unsupported") {
      return { kind: "modeled", scenarioId: relevant.defaultScenarioId };
    }
    if (
      selection.kind === "modeled" &&
      relevant.modeled.some((row) => row.scenarioId === selection.scenarioId)
    ) {
      return selection;
    }
    if (selection.kind === "modeled") {
      return { kind: "modeled", scenarioId: relevant.defaultScenarioId };
    }
    return selection;
  }, [canExplore, relevant.defaultScenarioId, relevant.modeled, selection]);

  const result = useMemo(
    () =>
      buildWhatIfScenario({
        holdings,
        currentPortfolioValue,
        portfolioValueAvailable,
        goal,
        hasSavedGoal,
        selection: effectiveSelection,
        contributionOverride: canExplore ? contributionOverride : null,
        planningAssumptionOverride: canExplore ? assumptionOverride : null,
        access: productAccess,
      }),
    [
      holdings,
      currentPortfolioValue,
      portfolioValueAvailable,
      goal,
      hasSavedGoal,
      effectiveSelection,
      canExplore,
      contributionOverride,
      assumptionOverride,
      productAccess,
    ],
  );

  const contributionPresets = buildContributionWhatIfPresets(
    result.hasSavedContribution ? result.currentContribution : null,
  );
  const assumptionPresets = buildPlanningAssumptionPresets(
    result.currentPlanningAssumption,
  );
  const selectedContribution =
    contributionOverride ?? result.currentContribution;
  const selectedAssumption =
    assumptionOverride ?? result.currentPlanningAssumption;

  return (
    <section
      id="what-if"
      className={`scroll-mt-24 overflow-hidden ${appCardClass}`}
      aria-labelledby="what-if-heading"
      data-testid="what-if-explorer"
      data-access={result.accessMode}
    >
      <div className="border-b border-amber-200/80 bg-gradient-to-br from-slate-950 to-slate-900 px-5 py-5 text-white sm:px-8">
        <div
          className={`inline-flex items-center gap-2 rounded-full bg-amber-400/15 px-3 py-1 ${appHeroMetricLabelClass} text-amber-100`}
        >
          <FlaskConical className="h-3.5 w-3.5" aria-hidden="true" />
          What if
        </div>
        <h2
          id="what-if-heading"
          className="mt-3 text-xl font-semibold tracking-tight text-white sm:text-2xl"
        >
          {result.scenarioModeled
            ? `What if ${result.scenarioName.toLowerCase()}?`
            : "Explore a modeled path"}
        </h2>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-white/80 sm:text-[16px]">
          See consequences for portfolio value, goal progress, and the estimated
          path — from current holdings and saved assumptions. Not a forecast.
        </p>
      </div>

      <div className={`${appCardPaddingClass} space-y-6`}>
        {canExplore ? (
          <div className="space-y-3">
            <p className={appSectionLabelClass}>Modeled market scenarios</p>
            <div
              role="radiogroup"
              aria-label="What-if market scenarios"
              className="grid gap-3 sm:grid-cols-2"
            >
              <button
                type="button"
                role="radio"
                aria-checked={effectiveSelection.kind === "none"}
                onClick={() => setSelection({ kind: "none" })}
                className={scenarioChoiceClass(effectiveSelection.kind === "none")}
                data-testid="what-if-scenario-none"
              >
                    <p className="text-[15px] font-semibold text-slate-900">
                  No market shock
                </p>
                <p className={`mt-1 ${appSectionMetaClass}`}>
                  Explore contribution or planning assumption only.
                </p>
              </button>
              {relevant.modeled.map((row) => {
                const selected =
                  effectiveSelection.kind === "modeled" &&
                  effectiveSelection.scenarioId === row.scenarioId;
                return (
                  <button
                    key={row.scenarioId}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() =>
                      setSelection({
                        kind: "modeled",
                        scenarioId: row.scenarioId,
                      })
                    }
                    className={scenarioChoiceClass(selected)}
                    data-testid={`what-if-scenario-${row.scenarioId}`}
                    data-selected={selected ? "true" : "false"}
                  >
                    <p className="text-[15px] font-semibold text-slate-900">
                      {row.shortLabel}
                    </p>
                    <p className={`mt-1 ${appSectionMetaClass}`}>{row.reason}</p>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <p className={appSectionBodyClass}>
            One modeled scenario preview from your current portfolio.
          </p>
        )}

        {relevant.unavailableRelevant.length > 0 ? (
          <div className="space-y-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-3">
            <p className={appSectionLabelClass}>
              Relevant but not yet modeled
            </p>
            {relevant.unavailableRelevant.map((row) => {
              const selected =
                effectiveSelection.kind === "unsupported" &&
                effectiveSelection.scenarioId === row.id;
              return (
                <button
                  key={row.id}
                  type="button"
                  disabled={!canExplore}
                  className={`block min-h-11 w-full rounded-xl px-3 py-2.5 text-left ${selected ? "bg-white ring-1 ring-slate-300" : ""} ${!canExplore ? "cursor-default" : "cursor-pointer"}`}
                  onClick={() =>
                    setSelection({
                      kind: "unsupported",
                      scenarioId: row.id as WhatIfUnsupportedScenarioId,
                    })
                  }
                  data-testid={`what-if-unavailable-${row.id}`}
                >
                  <p className="text-[15px] font-semibold text-slate-900">{row.name}</p>
                  <p className={`mt-0.5 ${appSectionMetaClass}`}>{row.reason}</p>
                </button>
              );
            })}
          </div>
        ) : null}

        {result.status === "educational_only" ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <p className={appSectionTitleClass}>{result.scenarioName}</p>
            <p className={`mt-2 ${appSectionBodyClass}`}>{result.headline}</p>
            <p className={`mt-2 ${appSectionMetaClass}`}>{result.disclaimer}</p>
          </div>
        ) : null}

        {result.status !== "educational_only" ? (
          <div className="space-y-4 rounded-[24px] border-2 border-teal-200 bg-gradient-to-br from-teal-50 via-white to-emerald-50 px-4 py-4 sm:px-5">
            <p className={`text-[13px] font-semibold uppercase tracking-[0.06em] text-teal-800`}>
              {WHAT_IF_DISCLAIMER}
            </p>
            {result.explorer === "preview" ? (
              <p className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                {result.headline}
              </p>
            ) : (
              <>
                {result.current.portfolioValue != null &&
                result.whatIf.portfolioValue != null ? (
                  <div>
                    <p className={appSectionLabelClass}>Portfolio</p>
                    <p className="mt-1 flex min-w-0 flex-col gap-1 text-2xl font-semibold tracking-tight text-slate-950 sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-2 sm:text-3xl">
                      <span className="min-w-0 break-words">
                        {formatEur(result.current.portfolioValue)}
                      </span>
                      <span className="hidden text-slate-400 sm:inline" aria-hidden>
                        →
                      </span>
                      <span className="text-[15px] font-medium text-slate-500 sm:hidden">
                        What if
                      </span>
                      <span className="min-w-0 break-words">
                        {formatEur(result.whatIf.portfolioValue)}
                      </span>
                    </p>
                  </div>
                ) : null}
                {result.portfolioImpactAmount != null &&
                result.portfolioImpactPercent != null ? (
                  <p className={`text-lg font-semibold ${impactToneClass(result.portfolioImpactPercent)}`}>
                    Estimated impact: {formatEur(result.portfolioImpactAmount)} ·{" "}
                    {formatSignedPercent(result.portfolioImpactPercent)}
                  </p>
                ) : null}
                {result.current.goalProgressPercent != null &&
                result.whatIf.goalProgressPercent != null ? (
                  <p className="text-lg font-semibold text-slate-950">
                    Goal progress:{" "}
                    {formatPercent(result.current.goalProgressPercent)} →{" "}
                    {formatPercent(result.whatIf.goalProgressPercent)}
                  </p>
                ) : null}
                {result.affectedPortfolioWeightPercent != null ? (
                  <p className={appSectionMetaClass}>
                    Affected portfolio weight:{" "}
                    {formatPercent(result.affectedPortfolioWeightPercent)}
                  </p>
                ) : null}
              </>
            )}
            {result.status === "unavailable_portfolio_value" ||
            result.status === "unavailable_no_goal" ||
            result.status === "insufficient_data" ? (
              <p className={appSectionBodyClass}>{result.headline}</p>
            ) : null}
          </div>
        ) : null}

        {canExplore && hasSavedGoal && contributionPresets.savedMonthly != null ? (
          <div className="space-y-3">
            <p className={appSectionLabelClass}>Monthly contribution</p>
            <p className={appSectionBodyClass}>
              Current saved contribution:{" "}
              {formatEur(contributionPresets.savedMonthly)}. Exploration only —
              this does not update your goal.
            </p>
            <div
              role="radiogroup"
              aria-label="What-if monthly contribution"
              className="grid grid-cols-2 gap-2 sm:grid-cols-4"
            >
              {contributionPresets.presets.map((amount) => {
                const selected = selectedContribution === amount;
                return (
                  <button
                    key={amount}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setContributionOverride(amount)}
                    className={personalChoiceClass(selected)}
                    data-testid={`what-if-contribution-${amount}`}
                  >
                    {formatEur(amount)}
                  </button>
                );
              })}
            </div>
            <label className="block">
              <span className={appSectionMetaClass}>Custom monthly amount</span>
              <input
                type="range"
                min={contributionPresets.sliderMin}
                max={contributionPresets.sliderMax}
                step={CONTRIBUTION_WHATIF_SLIDER_STEP}
                value={selectedContribution ?? 0}
                onChange={(event) =>
                  setContributionOverride(Number(event.target.value))
                }
                className="mt-2 h-11 w-full accent-amber-700"
                aria-label="What-if monthly contribution slider"
                data-testid="what-if-contribution-slider"
              />
            </label>
          </div>
        ) : null}

        {canExplore &&
        hasSavedGoal &&
        result.hasSavedPlanningAssumption &&
        selectedAssumption != null ? (
          <div className="space-y-3">
            <p className={appSectionLabelClass}>Planning assumption</p>
            <p className={appSectionBodyClass}>
              Saved planning assumption: {result.currentPlanningAssumption}%.
              This is your assumption — not a Tobailey forecast.
            </p>
            <div
              role="radiogroup"
              aria-label="What-if planning assumption"
              className="grid grid-cols-2 gap-2 sm:grid-cols-4"
            >
              {assumptionPresets.map((percent) => {
                const selected = selectedAssumption === percent;
                return (
                  <button
                    key={percent}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setAssumptionOverride(percent)}
                    className={personalChoiceClass(selected)}
                    data-testid={`what-if-assumption-${percent}`}
                  >
                    {percent}%
                  </button>
                );
              })}
            </div>
            <label className="block">
              <span className={appSectionMetaClass}>Custom assumption</span>
              <input
                type="range"
                min={0}
                max={20}
                step={0.5}
                value={selectedAssumption}
                onChange={(event) =>
                  setAssumptionOverride(Number(event.target.value))
                }
                className="mt-2 h-11 w-full accent-amber-700"
                aria-label="What-if planning assumption slider"
                data-testid="what-if-assumption-slider"
              />
            </label>
          </div>
        ) : null}

        {canExplore && result.comparison.length > 0 ? (
          <div className="space-y-3">
            <p className={appSectionLabelClass}>Current vs what if</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {result.comparison.map((row) => (
                <CompareRow
                  key={row.id}
                  label={row.label}
                  current={row.current}
                  whatIf={row.whatIf}
                />
              ))}
            </div>
          </div>
        ) : null}

        <details className="group">
          <summary className={detailsToggleClass}>
            <span className="inline-flex min-h-11 items-center">
              How Tobailey calculated this
            </span>
          </summary>
          <div className="space-y-3 border-t border-slate-200/80 pt-3">
            {result.whatChanged.length > 0 ? (
              <div>
                <p className={appSectionLabelClass}>What changed</p>
                <ul className={`mt-1.5 list-disc space-y-1 pl-5 ${appSectionBodyClass}`}>
                  {result.whatChanged.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {result.whatStayedConstant.length > 0 ? (
              <div>
                <p className={appSectionLabelClass}>What stayed constant</p>
                <ul className={`mt-1.5 list-disc space-y-1 pl-5 ${appSectionBodyClass}`}>
                  {result.whatStayedConstant.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            <ul className={`list-disc space-y-1 pl-5 ${appSectionBodyClass}`}>
              {result.calculationBullets.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <ul className={`list-disc space-y-1 pl-5 ${appSectionBodyClass}`}>
              {result.limitations.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className={appSectionBodyClass}>
              Confidence: {result.confidence}. {result.disclaimer}
            </p>
          </div>
        </details>

        {!canExplore ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
            <p className={appSectionBodyClass}>
              Complete includes the full scenario explorer, contribution and
              planning-assumption what-ifs, and exact current vs what-if values.
            </p>
            <div className="mt-3">
              <CompleteUpgradeLink label={SEE_COMPLETE_ANALYSIS_LABEL} />
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
