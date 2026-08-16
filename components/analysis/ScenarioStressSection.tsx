"use client";

import { useId, useMemo, useState } from "react";
import Link from "next/link";
import { FlaskConical } from "lucide-react";

import {
  appCardClass,
  appCardPaddingClass,
  appCardValueClass,
  appHeroMetricLabelClass,
  appSectionBodyClass,
  appSectionLabelClass,
  appSectionMetaClass,
  appSectionTitleClass,
  appTextLinkClass,
} from "@/components/layout/appSurface";
import { useBaseCurrencyDisplay } from "@/lib/client/baseCurrencyDisplay";
import { formatPortfolioPercent } from "@/lib/client/portfolioAnalysis";
import {
  buildContributionSensitivity,
  buildGoalSensitivityFromScenario,
  buildTargetYearSensitivity,
  type ContributionDeltaEuro,
} from "@/lib/services/goalSensitivity";
import { buildResilienceProfile } from "@/lib/services/resilience";
import {
  runPortfolioScenario,
  SCENARIO_DEFINITIONS,
  type ScenarioId,
  type ScenarioResult,
} from "@/lib/services/scenarioEngine";
import { DASHBOARD_DEEP_LINKS } from "@/lib/navigation/deepLinks";
import type {
  GoalSettings,
  StoredPortfolioHolding,
} from "@/lib/types/portfolioStorage";

function formatImpactPercent(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "—";
  }
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatPortfolioPercent(value)}`;
}

function impactToneClass(value: number | null): string {
  if (value === null || value === 0) {
    return "text-slate-900";
  }
  return value < 0 ? "text-rose-700" : "text-emerald-700";
}

function formatDelayMonths(months: number | null): string | null {
  if (months === null) return null;
  if (months === 0) return "No change in estimated completion month";
  if (months > 0) {
    return `Estimated completion moves later by about ${months} month${months === 1 ? "" : "s"}`;
  }
  const abs = Math.abs(months);
  return `Estimated completion moves earlier by about ${abs} month${abs === 1 ? "" : "s"}`;
}

function ScenarioResultPanel({
  result,
  formatEur,
}: {
  result: ScenarioResult;
  formatEur: (value: number) => string;
}) {
  const assumptionsId = useId();

  if (result.status === "insufficient_data") {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 sm:px-5">
        <p className={appSectionLabelClass}>Estimated portfolio impact</p>
        <p className={`mt-2 ${appCardValueClass}`}>Unavailable</p>
        <p className={`mt-3 ${appSectionBodyClass}`}>{result.explanation}</p>
        {result.coverageNote ? (
          <p className={`mt-2 ${appSectionMetaClass}`}>{result.coverageNote}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4 sm:px-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <p className={appSectionLabelClass}>Estimated portfolio impact</p>
          <p
            className={`mt-1.5 text-3xl font-semibold tracking-tight ${impactToneClass(result.estimatedPortfolioImpactPercent)}`}
          >
            {formatImpactPercent(result.estimatedPortfolioImpactPercent)}
          </p>
        </div>
        <div>
          <p className={appSectionLabelClass}>Estimated value change</p>
          <p
            className={`mt-1.5 text-2xl font-semibold tracking-tight ${impactToneClass(result.estimatedPortfolioImpactAmount)}`}
          >
            {result.estimatedPortfolioImpactAmount === null
              ? "—"
              : formatEur(result.estimatedPortfolioImpactAmount)}
          </p>
        </div>
        <div>
          <p className={appSectionLabelClass}>Affected exposure</p>
          <p className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-900">
            {result.affectedPortfolioWeightPercent === null
              ? "—"
              : formatPortfolioPercent(result.affectedPortfolioWeightPercent)}
          </p>
        </div>
      </div>

      <p className={`mt-4 ${appSectionBodyClass}`}>{result.explanation}</p>

      {result.coverageNote ? (
        <p className={`mt-2 ${appSectionMetaClass}`}>{result.coverageNote}</p>
      ) : null}

      <details className="mt-4 group">
        <summary
          id={assumptionsId}
          className="cursor-pointer list-none rounded-xl px-1 py-2 text-sm font-medium text-sky-800 outline-none marker:content-none focus-visible:ring-2 focus-visible:ring-sky-300 [&::-webkit-details-marker]:hidden"
        >
          <span className="inline-flex min-h-11 items-center">
            Assumptions &amp; limitations
            <span className="ml-2 text-slate-400 group-open:hidden" aria-hidden="true">
              +
            </span>
            <span className="ml-2 hidden text-slate-400 group-open:inline" aria-hidden="true">
              −
            </span>
          </span>
        </summary>
        <div
          className="space-y-3 border-t border-slate-200/80 pt-3"
          aria-labelledby={assumptionsId}
        >
          <div>
            <p className={appSectionLabelClass}>Assumptions</p>
            <ul className={`mt-1.5 list-disc space-y-1 pl-5 ${appSectionMetaClass}`}>
              {result.assumptions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className={appSectionLabelClass}>Limitations</p>
            <ul className={`mt-1.5 list-disc space-y-1 pl-5 ${appSectionMetaClass}`}>
              {result.limitations.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <p className={appSectionMetaClass}>
            Educational estimate only — not investment advice and not a forecast.
          </p>
        </div>
      </details>
    </div>
  );
}

function CompareMetric({
  label,
  current,
  after,
}: {
  label: string;
  current: string;
  after: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <p className={appSectionLabelClass}>{label}</p>
      <div className="mt-2 grid grid-cols-2 gap-3">
        <div>
          <p className={`text-xs ${appSectionMetaClass}`}>Current</p>
          <p className="mt-0.5 text-lg font-semibold tracking-tight text-slate-900">
            {current}
          </p>
        </div>
        <div>
          <p className={`text-xs ${appSectionMetaClass}`}>After scenario</p>
          <p className="mt-0.5 text-lg font-semibold tracking-tight text-slate-900">
            {after}
          </p>
        </div>
      </div>
    </div>
  );
}

function GoalSensitivityPanel({
  holdingsValue,
  scenarioResult,
  goal,
  hasSavedGoal,
  formatEur,
}: {
  holdingsValue: number;
  scenarioResult: ScenarioResult;
  goal: GoalSettings | null;
  hasSavedGoal: boolean;
  formatEur: (value: number) => string;
}) {
  const [contributionDelta, setContributionDelta] =
    useState<ContributionDeltaEuro>(0);
  const [showExtraYear, setShowExtraYear] = useState(false);

  const marketSensitivity = useMemo(
    () =>
      buildGoalSensitivityFromScenario({
        scenarioResult,
        goal,
        hasSavedGoal,
        currentPortfolioValue: holdingsValue,
      }),
    [scenarioResult, goal, hasSavedGoal, holdingsValue],
  );

  const contributionSensitivity = useMemo(
    () =>
      buildContributionSensitivity({
        currentPortfolioValue: holdingsValue,
        goal,
        hasSavedGoal,
      }),
    [holdingsValue, goal, hasSavedGoal],
  );

  const targetYearSensitivity = useMemo(
    () =>
      buildTargetYearSensitivity({
        currentPortfolioValue: holdingsValue,
        goal,
        hasSavedGoal,
      }),
    [holdingsValue, goal, hasSavedGoal],
  );

  const selectedContribution =
    contributionSensitivity.rows.find(
      (row) => row.deltaEuro === contributionDelta,
    ) ?? contributionSensitivity.rows.find((row) => row.deltaEuro === 0);

  const delayCopy = formatDelayMonths(marketSensitivity.estimatedDelayMonths);

  return (
    <div className="space-y-5 border-t border-slate-200 pt-5">
      <div>
        <p className={appSectionLabelClass}>Market scenario</p>
        <h3 className={`mt-1 ${appSectionTitleClass} text-base`}>
          What could this mean for your goal?
        </h3>
        <p className={`mt-1.5 ${appSectionMetaClass}`}>
          Illustrative goal impact from the selected market scenario — based on
          current assumptions.
        </p>
      </div>

      {marketSensitivity.status === "no_goal" ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
          <p className={appSectionBodyClass}>{marketSensitivity.explanation}</p>
          <Link
            href={DASHBOARD_DEEP_LINKS.goalProgress}
            className={`mt-3 inline-flex min-h-11 items-center ${appTextLinkClass}`}
          >
            Set up a goal
          </Link>
        </div>
      ) : null}

      {marketSensitivity.status === "scenario_unavailable" ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
          <p className={appSectionBodyClass}>{marketSensitivity.explanation}</p>
        </div>
      ) : null}

      {marketSensitivity.status === "ok" &&
      marketSensitivity.currentGoal &&
      marketSensitivity.stressedGoal ? (
        <div className="space-y-3">
          {marketSensitivity.hypotheticalPortfolioValue !== null ? (
            <p className={appSectionMetaClass}>
              Hypothetical portfolio value after scenario:{" "}
              <span className="font-medium text-slate-800">
                {formatEur(marketSensitivity.hypotheticalPortfolioValue)}
              </span>
            </p>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <CompareMetric
              label="Progress"
              current={formatPortfolioPercent(
                marketSensitivity.currentProgressPercent ?? 0,
              )}
              after={formatPortfolioPercent(
                marketSensitivity.stressedProgressPercent ?? 0,
              )}
            />
            <CompareMetric
              label="Goal gap"
              current={formatEur(marketSensitivity.currentGap ?? 0)}
              after={formatEur(marketSensitivity.stressedGap ?? 0)}
            />
          </div>

          {marketSensitivity.currentProjectedLabel &&
          marketSensitivity.stressedProjectedLabel ? (
            <CompareMetric
              label="Projected completion"
              current={marketSensitivity.currentProjectedLabel}
              after={marketSensitivity.stressedProjectedLabel}
            />
          ) : (
            <p className={appSectionMetaClass}>
              Projected completion date is unavailable from the current goal
              assumptions, so only progress and gap are shown.
            </p>
          )}

          {delayCopy ? (
            <p className={appSectionMetaClass}>{delayCopy}</p>
          ) : null}

          <p className={appSectionBodyClass}>{marketSensitivity.explanation}</p>
          <p className={appSectionMetaClass}>
            Trajectory: {marketSensitivity.currentGoal.status}
            {" → "}
            {marketSensitivity.stressedGoal.status}
          </p>
        </div>
      ) : null}

      {hasSavedGoal && goal ? (
        <div className="space-y-4 rounded-2xl border border-sky-100 bg-sky-50/40 px-4 py-4 sm:px-5">
          <div>
            <p className={appSectionLabelClass}>Personal input</p>
            <h3 className={`mt-1 ${appSectionTitleClass} text-base`}>
              What can I influence?
            </h3>
            <p className={`mt-1.5 ${appSectionMetaClass}`}>
              Separate from market scenarios — temporary contribution and timing
              illustrations using your saved goal assumptions.
            </p>
          </div>

          {contributionSensitivity.status === "ok" ? (
            <div className="space-y-3">
              <p className={appSectionBodyClass}>
                Monthly contribution · current{" "}
                {formatEur(contributionSensitivity.baselineMonthlyContribution ?? 0)}
              </p>
              <div
                role="radiogroup"
                aria-label="Illustrative monthly contribution"
                className="grid grid-cols-2 gap-2 sm:grid-cols-4"
              >
                {contributionSensitivity.rows.map((row) => {
                  const selected = row.deltaEuro === contributionDelta;
                  return (
                    <button
                      key={row.deltaEuro}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setContributionDelta(row.deltaEuro)}
                      className={`min-h-11 rounded-xl border px-3 py-2 text-sm font-medium transition ${
                        selected
                          ? "border-sky-600 bg-white text-sky-900 shadow-sm"
                          : "border-slate-200 bg-white/80 text-slate-700 hover:border-sky-300"
                      }`}
                    >
                      {row.label}
                    </button>
                  );
                })}
              </div>
              {selectedContribution ? (
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                  <p className={appSectionMetaClass}>
                    An illustrative monthly contribution of{" "}
                    {formatEur(selectedContribution.monthlyContribution)} would
                    change the current projection to{" "}
                    <span className="font-medium text-slate-800">
                      {selectedContribution.progress.estimatedCompletionLabel ??
                        selectedContribution.progress.status}
                    </span>
                    {selectedContribution.progress.estimatedCompletionLabel
                      ? ""
                      : ` (${formatPortfolioPercent(selectedContribution.progress.progressPercent)} progress)`}
                    .
                  </p>
                  <p className={`mt-2 ${appSectionMetaClass}`}>
                    Remaining gap:{" "}
                    {formatEur(selectedContribution.progress.remainingAmount)} ·
                    Status: {selectedContribution.progress.status}
                  </p>
                </div>
              ) : null}
              <p className={appSectionMetaClass}>
                {contributionSensitivity.explanation}
              </p>
            </div>
          ) : null}

          {targetYearSensitivity.status === "ok" &&
          targetYearSensitivity.current &&
          targetYearSensitivity.withExtraYear ? (
            <div className="space-y-3 border-t border-sky-100/80 pt-4">
              <p className={appSectionBodyClass}>
                Target year · current {targetYearSensitivity.currentTargetYear}
              </p>
              <div
                role="radiogroup"
                aria-label="Illustrative target year"
                className="grid grid-cols-2 gap-2"
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={!showExtraYear}
                  onClick={() => setShowExtraYear(false)}
                  className={`min-h-11 rounded-xl border px-3 py-2 text-sm font-medium transition ${
                    !showExtraYear
                      ? "border-sky-600 bg-white text-sky-900 shadow-sm"
                      : "border-slate-200 bg-white/80 text-slate-700 hover:border-sky-300"
                  }`}
                >
                  Current ({targetYearSensitivity.currentTargetYear})
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={showExtraYear}
                  onClick={() => setShowExtraYear(true)}
                  className={`min-h-11 rounded-xl border px-3 py-2 text-sm font-medium transition ${
                    showExtraYear
                      ? "border-sky-600 bg-white text-sky-900 shadow-sm"
                      : "border-slate-200 bg-white/80 text-slate-700 hover:border-sky-300"
                  }`}
                >
                  +1 year ({targetYearSensitivity.illustrativeTargetYear})
                </button>
              </div>
              <p className={appSectionMetaClass}>
                {showExtraYear
                  ? `With an illustrative target year of ${targetYearSensitivity.illustrativeTargetYear}, schedule status becomes ${targetYearSensitivity.withExtraYear.status}.`
                  : `With the current target year ${targetYearSensitivity.currentTargetYear}, schedule status is ${targetYearSensitivity.current.status}.`}
              </p>
              <p className={appSectionMetaClass}>
                {targetYearSensitivity.explanation}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function formatSignedImpact(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function ResiliencePanel({
  holdings,
  goal,
  hasSavedGoal,
  formatEur,
}: {
  holdings: StoredPortfolioHolding[];
  goal: GoalSettings | null;
  hasSavedGoal: boolean;
  formatEur: (value: number) => string;
}) {
  const detailsId = useId();
  const profile = useMemo(
    () =>
      buildResilienceProfile({
        holdings,
        goal,
        hasSavedGoal,
      }),
    [holdings, goal, hasSavedGoal],
  );

  return (
    <div
      id="resilience-sleep"
      className="scroll-mt-24 space-y-4 border-t border-slate-200 pt-5"
    >
      <div>
        <p className={appSectionLabelClass}>Resilience / Sleep Well</p>
        <h3 className={`mt-1 ${appSectionTitleClass} text-base`}>
          How well does your current structure absorb the modeled shocks?
        </h3>
        <p className={`mt-1.5 ${appSectionMetaClass}`}>
          Calm structural context from concentration, diversification, cash, and
          supported scenarios — not a safety guarantee.
        </p>
      </div>

      {profile.status === "insufficient_data" ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
          <p className={appSectionBodyClass}>{profile.summary}</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4 sm:px-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className={appSectionLabelClass}>Resilience</p>
                <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">
                  {profile.score ?? "—"}
                  <span className="text-lg font-medium text-slate-500">
                    /100
                  </span>
                </p>
              </div>
              <p className="rounded-full bg-sky-50 px-3 py-1.5 text-sm font-medium text-sky-900">
                {profile.bandLabel ?? "—"}
              </p>
            </div>
            <p className={`mt-3 ${appSectionBodyClass}`}>{profile.summary}</p>
            {profile.primaryDriverExplanation ? (
              <p className={`mt-2 ${appSectionMetaClass}`}>
                {profile.primaryDriverExplanation}
              </p>
            ) : null}
          </div>

          <ul className="space-y-2">
            {profile.factors.map((factor) => (
              <li
                key={factor.id}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900">
                    {factor.label}
                  </p>
                  <p className="shrink-0 text-sm font-semibold tabular-nums text-slate-800">
                    {factor.applicable && factor.score !== null
                      ? `${factor.score}/100`
                      : "—"}
                  </p>
                </div>
                <p className={`mt-1.5 ${appSectionMetaClass}`}>
                  {factor.explanation}
                </p>
              </li>
            ))}
          </ul>

          {profile.mostSensitive ? (
            <div className="rounded-2xl border border-sky-100 bg-sky-50/50 px-4 py-4">
              <p className={appSectionLabelClass}>Most sensitive to</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {profile.mostSensitive.scenarioName}
              </p>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
                {formatSignedImpact(
                  profile.mostSensitive.estimatedPortfolioImpactPercent,
                )}
              </p>
              {profile.mostSensitive.estimatedPortfolioImpactAmount !==
              null ? (
                <p className={`mt-1 ${appSectionMetaClass}`}>
                  Estimated value change:{" "}
                  {formatEur(
                    profile.mostSensitive.estimatedPortfolioImpactAmount,
                  )}
                </p>
              ) : null}
              <p className={`mt-2 ${appSectionMetaClass}`}>
                {profile.mostSensitive.note}
              </p>
            </div>
          ) : null}

          {profile.goalContext ? (
            <p className={appSectionBodyClass}>{profile.goalContext.summary}</p>
          ) : null}

          <details className="group">
            <summary
              id={detailsId}
              className="cursor-pointer list-none rounded-xl px-1 py-2 text-sm font-medium text-sky-800 outline-none marker:content-none focus-visible:ring-2 focus-visible:ring-sky-300 [&::-webkit-details-marker]:hidden"
            >
              <span className="inline-flex min-h-11 items-center">
                Assumptions &amp; limitations
                <span className="ml-2 text-slate-400 group-open:hidden" aria-hidden="true">
                  +
                </span>
                <span className="ml-2 hidden text-slate-400 group-open:inline" aria-hidden="true">
                  −
                </span>
              </span>
            </summary>
            <div className="space-y-3 border-t border-slate-200/80 pt-3" aria-labelledby={detailsId}>
              <ul className={`list-disc space-y-1 pl-5 ${appSectionMetaClass}`}>
                {profile.assumptions.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <ul className={`list-disc space-y-1 pl-5 ${appSectionMetaClass}`}>
                {profile.limitations.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <Link
                href={DASHBOARD_DEEP_LINKS.scorecardHealth}
                className={`inline-flex min-h-11 items-center ${appTextLinkClass}`}
              >
                View Portfolio Scorecard
              </Link>
            </div>
          </details>
        </div>
      )}
    </div>
  );
}

/**
 * Compact Analysis stress-test surface for Phase 2A–2C:
 * Scenario Engine, Goal Sensitivity, and Resilience / Sleep Well.
 */
export function ScenarioStressSection({
  holdings,
  goal = null,
  hasSavedGoal = false,
}: {
  holdings: StoredPortfolioHolding[];
  goal?: GoalSettings | null;
  hasSavedGoal?: boolean;
}) {
  const { formatEur } = useBaseCurrencyDisplay();
  const [selectedId, setSelectedId] = useState<ScenarioId>(
    "global_equities_minus_20",
  );

  const result = useMemo(
    () => runPortfolioScenario(holdings, selectedId),
    [holdings, selectedId],
  );

  return (
    <section
      id="scenario-stress"
      className={`mt-7 scroll-mt-24 overflow-hidden ${appCardClass}`}
      aria-labelledby="scenario-stress-heading"
    >
      <div className="border-b border-slate-200 bg-gradient-to-br from-sky-900 to-slate-950 px-5 py-5 text-white sm:px-8">
        <div
          className={`inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 ${appHeroMetricLabelClass} text-sky-100`}
        >
          <FlaskConical className="h-3.5 w-3.5" aria-hidden="true" />
          Scenario / stress test
        </div>
        <h2
          id="scenario-stress-heading"
          className="mt-3 text-xl font-semibold tracking-tight text-white sm:text-2xl"
        >
          What if…?
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-sky-50/95 sm:text-[15px]">
          Hypothetical estimates of how a market move could affect your portfolio
          and goal — based on current classified exposure and saved assumptions,
          not a prediction.
        </p>
      </div>

      <div className={`${appCardPaddingClass} space-y-5`}>
        <div
          role="radiogroup"
          aria-label="Choose a hypothetical scenario"
          className="grid gap-3 sm:grid-cols-3"
        >
          {SCENARIO_DEFINITIONS.map((definition) => {
            const selected = definition.id === selectedId;
            return (
              <button
                key={definition.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setSelectedId(definition.id)}
                className={`min-h-11 rounded-2xl border px-4 py-3 text-left transition ${
                  selected
                    ? "border-sky-600 bg-sky-50 shadow-sm ring-1 ring-sky-600/20"
                    : "border-slate-200 bg-white hover:border-sky-300 hover:bg-sky-50/40"
                }`}
              >
                <p
                  className={`text-sm font-semibold ${selected ? "text-sky-900" : "text-slate-900"}`}
                >
                  {definition.shortLabel}
                </p>
                <p className={`mt-1 text-xs leading-snug ${appSectionMetaClass}`}>
                  {definition.description}
                </p>
              </button>
            );
          })}
        </div>

        <div>
          <p className={`${appSectionTitleClass} text-base`}>
            {result.scenarioName}
          </p>
          <div className="mt-3">
            <ScenarioResultPanel result={result} formatEur={formatEur} />
          </div>
        </div>

        <GoalSensitivityPanel
          holdingsValue={result.portfolioTotalValue}
          scenarioResult={result}
          goal={goal}
          hasSavedGoal={hasSavedGoal}
          formatEur={formatEur}
        />

        <ResiliencePanel
          holdings={holdings}
          goal={goal}
          hasSavedGoal={hasSavedGoal}
          formatEur={formatEur}
        />
      </div>
    </section>
  );
}
