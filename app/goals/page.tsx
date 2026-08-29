"use client";

import { FormEvent, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Check,
  Percent,
  PiggyBank,
  Save,
  Target,
} from "lucide-react";

import { ExportPortfolioButton } from "@/components/export/ExportPortfolioButton";
import {
  appAnalysisDarkTitleClass,
  appAnalysisUtilityButtonClass,
  appDarkCardClass,
  appDarkCardElevatedClass,
  appDarkCardPaddingClass,
  appDarkInsetRecessedClass,
  appDashboardDarkBodyClass,
  appDashboardDarkMetaClass,
  appHeroKpiClass,
  appHeroMetricLabelClass,
  appSectionMetaClass,
  appSolidButtonClass,
} from "@/components/layout/appSurface";
import { ConversionDetailsDisclosure } from "@/components/currency/ConversionDetailsDisclosure";
import { CalmExploreDisclosure } from "@/components/layout/CalmExploreDisclosure";
import { CalmPageIntro } from "@/components/layout/CalmPageIntro";
import {
  AppPageLoading,
  PageContainer,
} from "@/components/layout/PageContainer";
import { PageRelatedLinks } from "@/components/layout/PageRelatedLinks";
import { GoalHeroProgressVisual } from "@/components/goals/GoalHeroProgressVisual";
import {
  ExpectedReturnAssumptionEditor,
  ExpectedReturnAssumptionPanel,
} from "@/components/goals/ExpectedReturnAssumption";
import { GoalRealityCheckPanel } from "@/components/goals/GoalRealityCheckPanel";
import { GoalTradeOffsSection } from "@/components/portfolioStance/GoalTradeOffsSection";
import { WhatIfExplorer } from "@/components/goals/WhatIfExplorer";
import { EmptyPortfolioGuide } from "@/components/onboarding/EmptyPortfolioGuide";
import NumericInput from "@/components/NumericInput";
import { useBaseCurrencyDisplay } from "@/lib/client/baseCurrencyDisplay";
import {
  canPersistBaseCurrencyAmounts,
  convertGoalBaseDraftToEur,
  convertGoalEurToBaseDraft,
  FX_UNAVAILABLE_EDIT_MESSAGE,
  FX_UNAVAILABLE_SAVE_MESSAGE,
} from "@/lib/client/baseCurrencyInput";
import {
  EXPECTED_ANNUAL_RETURN_MAX,
  EXPECTED_ANNUAL_RETURN_MIN,
  getExpectedReturnAssumption,
  isValidExpectedAnnualReturnInput,
} from "@/lib/client/expectedReturnAssumption";
import {
  buildPortfolioAnalysis,
  formatPortfolioPercent,
} from "@/lib/client/portfolioAnalysis";
import { runPortfolioExport } from "@/lib/client/runPortfolioExport";
import { buildPortfolioPerformance } from "@/lib/client/portfolioPerformance";
import {
  GOAL_FORM_DEFAULT,
  sanitizeGoalForSave,
} from "@/lib/client/userGoalStorage";
import { useGoalProgress } from "@/lib/client/useGoalProgress";
import { useGoalRealityCheck } from "@/lib/client/useGoalRealityCheck";
import { usePortfolioContributions } from "@/lib/client/usePortfolioContributions";
import { usePortfolioPerformanceHistory } from "@/lib/client/usePortfolioPerformanceHistory";
import { useUserGoal } from "@/lib/client/useUserGoal";
import { useUserPortfolio } from "@/lib/client/useUserPortfolio";
import { useProductAccess } from "@/lib/client/useProductAccess";
import { useSectionHashId } from "@/lib/client/useSectionHashId";
import { DASHBOARD_DEEP_LINKS } from "@/lib/navigation/deepLinks";
import {
  ANALYSIS_PATH,
  PORTFOLIO_HISTORY_PATH,
  REVIEW_PATH,
} from "@/lib/navigation/appRoutes";
import { PAGE_PURPOSE } from "@/lib/navigation/productArchitecture";
import { buildPortfolioExposureAllocation } from "@/lib/services/classification";
import {
  buildGoalsIntelligence,
  goalsStatusBadgeLabel,
} from "@/lib/services/goals/buildGoalsIntelligence";
import { buildPortfolioHealthProfile } from "@/lib/services/portfolio/portfolioHealthProfile";
import {
  buildGoalTradeOffs,
  buildPortfolioStance,
} from "@/lib/services/portfolioStance";
import {
  buildPortfolioTimeline,
  timelineToGoalHistoryPoints,
} from "@/lib/services/portfolio/timeline";
import {
  IDENTITY_EUR_FX_SNAPSHOT,
  type BaseCurrencyFxSnapshot,
} from "@/lib/services/prices/baseCurrencyFxSnapshot";
import {
  portfolioBaseCurrencySymbol,
  type PortfolioBaseCurrency,
} from "@/lib/types/portfolioBaseCurrency";
import type { GoalSettings } from "@/lib/types/portfolioStorage";

function badgeToneClass(status: string): string {
  if (status === "Goal reached" || status === "Ahead of schedule" || status === "On track") {
    return "bg-emerald-400/15 text-emerald-200";
  }
  if (status === "Slightly behind") {
    return "bg-amber-400/15 text-amber-100";
  }
  if (status === "Behind schedule") {
    return "bg-rose-400/15 text-rose-200";
  }
  return "bg-white/10 text-white/80";
}

export default function GoalsPage() {
  const { formatEur, snapshot, baseCurrency, canPersistMonetary, refreshFx, convertEur } =
    useBaseCurrencyDisplay();
  const { userSub, holdings, portfolioReady } = useUserPortfolio();
  const { goal: savedGoal, hasSavedGoal, persistGoal } = useUserGoal();
  const productAccess = useProductAccess(portfolioReady && Boolean(userSub));

  const history = usePortfolioPerformanceHistory(holdings, "1Y");
  const { realityCheck, isLoading: realityCheckLoading } = useGoalRealityCheck(
    holdings,
    hasSavedGoal ? savedGoal : null,
    hasSavedGoal && holdings.length > 0,
  );
  const analysis = useMemo(() => buildPortfolioAnalysis(holdings), [holdings]);
  const performance = useMemo(
    () => buildPortfolioPerformance(holdings),
    [holdings],
  );
  const exposure = useMemo(
    () => buildPortfolioExposureAllocation(holdings),
    [holdings],
  );

  const contributionHoldings = useMemo(
    () =>
      holdings.map((holding) => ({
        id: holding.id,
        symbol: holding.symbol,
        name: holding.name,
        assetType: holding.assetType,
      })),
    [holdings],
  );

  const portfolioValue = performance.totalValue;
  const portfolioValueAvailable = performance.totalValueAvailable;

  const { entries, summary } = usePortfolioContributions(
    portfolioValue,
    portfolioValueAvailable,
    true,
    contributionHoldings,
  );

  const timeline = useMemo(
    () =>
      buildPortfolioTimeline({
        entries,
        contributionSummary: summary,
        chartPoints: history.data?.chartPoints ?? null,
        currentPortfolioValue: portfolioValueAvailable ? portfolioValue : null,
        portfolioValueAvailable,
        startingPortfolioValue: history.data?.startingValue ?? null,
        endingPortfolioValue: history.data?.endingValue ?? null,
        investmentReturn: history.data?.investmentReturn ?? null,
        investmentReturnPercent: history.data?.investmentReturnPercent ?? null,
        periodLabel: history.data ? "1 year" : null,
      }),
    [entries, history.data, portfolioValue, portfolioValueAvailable, summary],
  );

  const goalProgress = useGoalProgress({
    holdings,
    goal: savedGoal,
    hasSavedGoal,
    portfolioHistory: timelineToGoalHistoryPoints(timeline),
  });

  const goalTradeOffs = useMemo(() => {
    const stance = buildPortfolioStance({
      holdings,
      allocation: exposure,
      analysis,
    });
    return buildGoalTradeOffs({
      goal: savedGoal,
      hasSavedGoal,
      currentPortfolioValue: goalProgress.currentValue,
      portfolioValueAvailable: goalProgress.portfolioValueAvailable,
      stance,
      complete: productAccess.intelligenceDepth === "complete",
    });
  }, [
    analysis,
    exposure,
    goalProgress.currentValue,
    goalProgress.portfolioValueAvailable,
    hasSavedGoal,
    holdings,
    productAccess.intelligenceDepth,
    savedGoal,
  ]);

  const healthAlignment = useMemo(() => {
    if (!hasSavedGoal || holdings.length === 0) return null;
    return buildPortfolioHealthProfile({
      holdings,
      goal: savedGoal,
      hasSavedGoal,
      dividends: null,
      exposure,
      analysis,
    }).goalAlignment;
  }, [analysis, exposure, hasSavedGoal, holdings, savedGoal]);

  const intelligence = useMemo(
    () =>
      buildGoalsIntelligence({
        progress: goalProgress,
        monthlyContribution: savedGoal?.monthlyContribution ?? 0,
        hasTimelineHistory: timeline.hasValueSeries,
        timelineSummary: timeline.summary,
        goalAlignment: healthAlignment,
        concentrationLevel: analysis.concentrationLevel,
        largestSymbol: analysis.largestPosition?.holding.symbol ?? null,
        largestWeightPercent:
          analysis.largestPosition?.weightPercent ?? null,
      }),
    [
      analysis.concentrationLevel,
      analysis.largestPosition,
      goalProgress,
      healthAlignment,
      savedGoal?.monthlyContribution,
      timeline.hasValueSeries,
      timeline.summary,
    ],
  );

  const [goal, setGoal] = useState<GoalSettings>(GOAL_FORM_DEFAULT);
  const [formSession, setFormSession] = useState<BaseCurrencyFxSnapshot>(
    IDENTITY_EUR_FX_SNAPSHOT,
  );
  const [formCurrency, setFormCurrency] =
    useState<PortfolioBaseCurrency>("EUR");
  const [formDirty, setFormDirty] = useState(false);
  const [fxFormError, setFxFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [assumptionEditorOpen, setAssumptionEditorOpen] = useState(false);
  const [exploreOpen, setExploreOpen] = useState(false);
  const sectionHash = useSectionHashId();

  useEffect(() => {
    if (sectionHash === "what-if") setExploreOpen(true);
  }, [sectionHash]);

  useEffect(() => {
    if (formDirty) {
      if (baseCurrency !== formCurrency && formCurrency !== "EUR") {
        setFxFormError(
          "Your portfolio base currency changed while editing. Reset or reload the form before saving.",
        );
      }
      return;
    }

    const canonical = savedGoal ?? GOAL_FORM_DEFAULT;
    const sessionSnap = canPersistBaseCurrencyAmounts(snapshot)
      ? snapshot
      : IDENTITY_EUR_FX_SNAPSHOT;
    const converted = convertGoalEurToBaseDraft(canonical, sessionSnap);
    if (!converted.ok) {
      setFormSession(IDENTITY_EUR_FX_SNAPSHOT);
      setFormCurrency("EUR");
      setGoal(canonical);
      setFxFormError(FX_UNAVAILABLE_EDIT_MESSAGE);
      return;
    }

    setFormSession(sessionSnap);
    setFormCurrency(sessionSnap.baseCurrency);
    setGoal(converted.value);
    setFxFormError(
      !canPersistBaseCurrencyAmounts(snapshot) && baseCurrency !== "EUR"
        ? FX_UNAVAILABLE_EDIT_MESSAGE
        : null,
    );
  }, [savedGoal, snapshot, formDirty, baseCurrency, formCurrency]);

  const currentYear = new Date().getFullYear();
  const currencyPrefix = portfolioBaseCurrencySymbol(formCurrency);
  const displayName =
    (hasSavedGoal && savedGoal?.name?.trim()) ||
    goal.name?.trim() ||
    "Your goal";
  const badgeLabel = goalsStatusBadgeLabel(
    goalProgress.status,
    goalProgress.goalReached,
  );

  function updateGoalNumber(field: keyof GoalSettings, value: string) {
    setSaved(false);
    setFormDirty(true);
    setGoal((current) => ({ ...current, [field]: Number(value) }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userSub) return;

    if (formCurrency !== "EUR" && baseCurrency !== formCurrency) {
      setFxFormError(
        "Your portfolio base currency changed while editing. Reset or reload the form before saving.",
      );
      return;
    }

    if (!canPersistBaseCurrencyAmounts(formSession)) {
      setFxFormError(FX_UNAVAILABLE_SAVE_MESSAGE);
      return;
    }

    const converted = convertGoalBaseDraftToEur(goal, formSession);
    if (!converted.ok) {
      setFxFormError(converted.message);
      return;
    }

    if (!isValidExpectedAnnualReturnInput(converted.value.expectedAnnualReturn)) {
      setFxFormError(
        `Expected annual return must be between ${EXPECTED_ANNUAL_RETURN_MIN} and ${EXPECTED_ANNUAL_RETURN_MAX}% p.a.`,
      );
      return;
    }

    const normalized = sanitizeGoalForSave({
      ...converted.value,
      expectedAnnualReturn: converted.value.expectedAnnualReturn,
      name: goal.name?.trim() || undefined,
    });
    if (!normalized) return;

    persistGoal(normalized);
    setFormDirty(false);
    setSaved(true);
  }

  async function handleExport() {
    if (isExporting) return;
    setIsExporting(true);
    try {
      await runPortfolioExport({
        holdings,
        entries,
        portfolioValueEur: portfolioValue,
        portfolioValueAvailable,
        baseCurrency,
        convertEur,
        chartPoints: history.data?.chartPoints ?? null,
        goal: savedGoal,
        hasSavedGoal,
        currentProgressPercent: goalProgress.currentProgressPercent,
        remainingAmount: goalProgress.remainingAmount,
        statusLabel: goalProgress.status,
      });
    } finally {
      setIsExporting(false);
    }
  }

  if (!portfolioReady) {
    return <AppPageLoading canvas="navy" />;
  }

  const topInsight = intelligence.insights[0] ?? null;
  const alignment =
    intelligence.alignment &&
    intelligence.alignment.label !== "Goal data unavailable"
      ? intelligence.alignment
      : null;

  return (
    <>
      <PageContainer canvas="navy" stackClassName="gap-4 md:gap-5">
        <CalmPageIntro
          eyebrow="Goals"
          title={displayName}
          subtitle="Am I on track — and when might I get there?"
          backToDashboard
          actions={
            <ExportPortfolioButton
              variant="onDark"
              disabled={isExporting}
              onExport={handleExport}
            />
          }
        />

        {holdings.length === 0 ? (
          <EmptyPortfolioGuide
            density="compact"
            title="Goals work best with a portfolio"
            body="You can still set a target now. Add holdings so progress uses your real portfolio value."
            availableWithoutHoldings="Goal settings remain available without holdings."
          />
        ) : null}

        <section
          id="goal-progress"
          aria-labelledby="goals-on-track-heading"
          className={`${appDarkCardElevatedClass} ${appDarkCardPaddingClass} scroll-mt-24`}
          data-testid="goals-on-track"
        >
          <p className={appHeroMetricLabelClass}>Am I on track?</p>
          <h2
            id="goals-on-track-heading"
            className={`mt-1 ${appAnalysisDarkTitleClass}`}
          >
            {hasSavedGoal ? badgeLabel : "Set a target to track progress"}
          </h2>
          {hasSavedGoal ? (
            <span
              className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${badgeToneClass(badgeLabel)}`}
            >
              {badgeLabel}
            </span>
          ) : null}
          <div className={`mt-4 ${appDarkInsetRecessedClass} px-3.5 py-3.5 sm:px-4 sm:py-4`}>
            <GoalHeroProgressVisual
              progress={goalProgress}
              hasSavedGoal={hasSavedGoal}
              onDark
            />
          </div>
          {hasSavedGoal ? (
            <p className={`mt-4 ${appDashboardDarkMetaClass}`}>
              Estimated completion:{" "}
              <span className="font-semibold text-white">
                {intelligence.forecast.estimatedCompletionLabel}
              </span>
              {intelligence.forecast.isEstimate ? " · estimate" : null}
            </p>
          ) : null}
        </section>

        {hasSavedGoal ? (
          <section
            aria-labelledby="goals-driving-heading"
            className={`${appDarkCardElevatedClass} ${appDarkCardPaddingClass}`}
            data-testid="goals-driving"
          >
            <p className={appHeroMetricLabelClass}>What is driving the outcome?</p>
            <h2
              id="goals-driving-heading"
              className={`mt-1 ${appAnalysisDarkTitleClass}`}
            >
              Remaining {formatEur(goalProgress.remainingAmount)}
            </h2>
            <p className={`mt-1 ${appDashboardDarkMetaClass}`}>
              Projection from your plan and available history — not a guarantee.
            </p>
            <div className="mt-4 grid min-w-0 gap-2 sm:grid-cols-3">
              <Metric
                label="Target"
                value={formatEur(goalProgress.targetValue)}
              />
              <Metric
                label="Monthly contribution"
                value={formatEur(intelligence.forecast.monthlyContribution)}
              />
              <Metric
                label="Current value"
                value={formatEur(goalProgress.currentValue)}
              />
            </div>
            <div className="mt-3">
              <ConversionDetailsDisclosure compactTrigger />
            </div>
            {topInsight ? (
              <p className={`mt-4 ${appDashboardDarkBodyClass}`}>{topInsight.text}</p>
            ) : null}
            {alignment ? (
              <p className={`mt-3 ${appDashboardDarkMetaClass}`}>
                {alignment.label}. {alignment.reason}
                {alignment.concentrationLine
                  ? ` ${alignment.concentrationLine}`
                  : ""}
              </p>
            ) : null}
            <Link
              href={DASHBOARD_DEEP_LINKS.scorecardHealth}
              className={`${appAnalysisUtilityButtonClass} mt-4 inline-flex`}
            >
              Open Portfolio Scorecard
            </Link>
          </section>
        ) : null}

        <GoalTradeOffsSection
          model={goalTradeOffs}
          productAccess={productAccess}
        />

        <CalmExploreDisclosure
          description="Edit the goal, assumptions, and modeled what-if paths."
          open={exploreOpen}
          onToggle={() => setExploreOpen((value) => !value)}
          testId="goals-explore"
        >
          {hasSavedGoal && intelligence.insights.length > 1 ? (
            <section className={`${appDarkCardClass} ${appDarkCardPaddingClass}`}>
              <p className={appHeroMetricLabelClass}>More insights</p>
              <ul className="mt-3 space-y-2">
                {intelligence.insights.slice(1).map((insight) => (
                  <li key={insight.id} className={appDashboardDarkBodyClass}>
                    {insight.text}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {getExpectedReturnAssumption(savedGoal) != null ? (
            <section className={`${appDarkCardClass} ${appDarkCardPaddingClass} space-y-3`}>
              <ExpectedReturnAssumptionPanel
                percent={getExpectedReturnAssumption(savedGoal)!}
                onEdit={() => setAssumptionEditorOpen(true)}
              />
              <GoalRealityCheckPanel
                realityCheck={realityCheck}
                isLoading={realityCheckLoading}
              />
            </section>
          ) : null}

          <WhatIfExplorer
            holdings={holdings}
            goal={hasSavedGoal ? savedGoal : null}
            hasSavedGoal={hasSavedGoal}
            currentPortfolioValue={
              goalProgress.portfolioValueAvailable
                ? goalProgress.currentValue
                : null
            }
            portfolioValueAvailable={goalProgress.portfolioValueAvailable}
            productAccess={productAccess}
            formatEur={formatEur}
            formatPercent={formatPortfolioPercent}
          />

          <form
            onSubmit={handleSubmit}
            className={`${appDarkCardClass} overflow-hidden`}
            data-testid="goals-edit-form"
          >
            <div className="border-b border-white/10 px-4 py-4 sm:px-6">
              <h2 className="text-lg font-bold text-white">
                {hasSavedGoal ? "Edit your goal" : "Set your goal"}
              </h2>
              <p className={`mt-1 ${appDashboardDarkMetaClass}`}>
                A few simple inputs. Tobailey calculates the rest.
              </p>
            </div>

            <div className="space-y-5 bg-white px-4 py-5 text-slate-950 sm:px-6">
              <label className="block">
                <span className="text-sm font-bold text-slate-700">
                  Goal name
                </span>
                <input
                  type="text"
                  value={goal.name ?? ""}
                  maxLength={60}
                  placeholder="e.g. Financial independence"
                  onChange={(event) => {
                    setSaved(false);
                    setFormDirty(true);
                    const next = event.target.value;
                    setGoal((current) => ({
                      ...current,
                      name: next.trim().length > 0 ? next : undefined,
                    }));
                  }}
                  className="mt-2 w-full min-h-[44px] rounded-xl border border-slate-200 bg-slate-50 px-4 text-base font-semibold text-slate-950 outline-none focus:border-brand focus:ring-4 focus:ring-brand/15"
                />
              </label>

              <GoalInput
                label={`Target amount (${formCurrency})`}
                icon={<Target className="h-4 w-4" />}
                prefix={currencyPrefix}
                value={goal.targetValue}
                min={1000}
                onChange={(value) => updateGoalNumber("targetValue", value)}
              />
              <GoalInput
                label="Target year"
                icon={<CalendarDays className="h-4 w-4" />}
                value={goal.targetYear}
                min={currentYear + 1}
                onChange={(value) => updateGoalNumber("targetYear", value)}
              />
              <GoalInput
                label={`Monthly contribution (optional, ${formCurrency})`}
                icon={<PiggyBank className="h-4 w-4" />}
                prefix={currencyPrefix}
                value={goal.monthlyContribution}
                min={0}
                onChange={(value) =>
                  updateGoalNumber("monthlyContribution", value)
                }
              />
              <GoalInput
                label="Expected annual return (% p.a.)"
                icon={<Percent className="h-4 w-4" />}
                value={goal.expectedAnnualReturn}
                min={EXPECTED_ANNUAL_RETURN_MIN}
                max={EXPECTED_ANNUAL_RETURN_MAX}
                onChange={(value) =>
                  updateGoalNumber("expectedAnnualReturn", value)
                }
                hint="Your assumption used for projections — not a Tobailey forecast."
              />

              {fxFormError ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                  <p role="alert">{fxFormError}</p>
                  <div className="mt-2 flex flex-wrap gap-3">
                    {!canPersistMonetary && baseCurrency !== "EUR" ? (
                      <button
                        type="button"
                        onClick={() => refreshFx()}
                        className="inline-flex min-h-[40px] font-semibold underline"
                      >
                        Retry conversion
                      </button>
                    ) : null}
                    {formDirty ? (
                      <button
                        type="button"
                        onClick={() => {
                          setFormDirty(false);
                          setSaved(false);
                        }}
                        className="inline-flex min-h-[40px] font-semibold underline"
                      >
                        Reset form
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : null}

              <button
                type="submit"
                disabled={
                  !canPersistBaseCurrencyAmounts(formSession) ||
                  (formCurrency !== "EUR" && baseCurrency !== formCurrency)
                }
                className={`w-full ${appSolidButtonClass}`}
              >
                {saved ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {saved ? "Goal saved" : "Save goal"}
              </button>
            </div>
          </form>

          <PageRelatedLinks
            purpose={PAGE_PURPOSE.goals}
            links={[
              { href: REVIEW_PATH, label: "Your Review" },
              { href: ANALYSIS_PATH, label: "Open Analysis" },
              { href: PORTFOLIO_HISTORY_PATH, label: "Portfolio History" },
              {
                href: DASHBOARD_DEEP_LINKS.scorecardGoal,
                label: "Open Goal score",
              },
            ]}
          />
        </CalmExploreDisclosure>
      </PageContainer>
      {hasSavedGoal && savedGoal ? (
        <ExpectedReturnAssumptionEditor
          open={assumptionEditorOpen}
          onClose={() => setAssumptionEditorOpen(false)}
          goal={savedGoal}
          currentPortfolioValue={goalProgress.currentValue}
          portfolioHistory={timelineToGoalHistoryPoints(timeline)}
          onSave={(nextGoal) => {
            persistGoal(nextGoal);
            setSaved(true);
            setFormDirty(false);
          }}
        />
      ) : null}
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className={`${appDarkInsetRecessedClass} min-w-0 px-3 py-2.5`}>
      <p className={appHeroMetricLabelClass}>{label}</p>
      <p className={`mt-1 truncate ${appHeroKpiClass} text-white`}>{value}</p>
    </div>
  );
}

function GoalInput({
  label,
  icon,
  prefix,
  value,
  min,
  max: _max,
  hint,
  onChange,
}: {
  label: string;
  icon: ReactNode;
  prefix?: string;
  value: number;
  min: number;
  max?: number;
  hint?: string;
  onChange: (value: string) => void;
}) {
  void _max;
  return (
    <label className="block">
      <span className="flex items-center gap-2 text-sm font-bold text-slate-700">
        {icon}
        {label}
      </span>
      <span className="mt-2 flex min-h-[44px] items-center rounded-xl border border-slate-200 bg-slate-50 px-4 focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/15">
        {prefix ? (
          <span className="font-bold text-slate-400">{prefix}</span>
        ) : null}
        <NumericInput
          required
          value={value}
          min={min}
          placeholder="0"
          onChange={(next) => onChange(String(next))}
          className="min-w-0 flex-1 bg-transparent px-2 py-3.5 text-base font-bold outline-none"
        />
      </span>
      {hint ? <p className={`mt-1.5 ${appSectionMetaClass}`}>{hint}</p> : null}
    </label>
  );
}
