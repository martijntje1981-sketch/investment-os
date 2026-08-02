"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Check,
  Goal,
  PiggyBank,
  Save,
  Scale,
  Target,
  TrendingUp,
} from "lucide-react";
import {
  appCardValueClass,
  appDarkCardClass,
  appDarkCardPaddingClass,
  appHeroMetricLabelClass,
  appHeroShellClass,
  appSectionLabelClass,
  appSectionMetaClass,
  appSectionTitleClass,
  appSolidButtonClass,
} from "@/components/layout/appSurface";
import BottomNavigation from "@/components/home/BottomNav";
import { ConversionDetailsDisclosure } from "@/components/currency/ConversionDetailsDisclosure";
import {
  AppPageLoading,
  PageContainer,
} from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { GoalHeroProgressVisual } from "@/components/goals/GoalHeroProgressVisual";
import { PassiveIncomeGoalCard } from "@/components/goals/PassiveIncomeGoalCard";
import { EmptyPortfolioGuide } from "@/components/onboarding/EmptyPortfolioGuide";
import {
  GoalCoachCard,
  GoalHeroMilestones,
  GoalInsightCard,
  GoalMilestonesRow,
  GoalWhatIfCard,
} from "@/components/goals/GoalIntelligenceBlocks";
import NumericInput from "@/components/NumericInput";
import { useBaseCurrencyDisplay } from "@/lib/client/baseCurrencyDisplay";
import {
  canPersistBaseCurrencyAmounts,
  convertCanonicalEurAmount,
  convertGoalBaseDraftToEur,
  convertGoalEurToBaseDraft,
  FX_UNAVAILABLE_EDIT_MESSAGE,
  FX_UNAVAILABLE_SAVE_MESSAGE,
} from "@/lib/client/baseCurrencyInput";
import {
  buildGoalCoach,
  buildGoalCurrencyMilestones,
  buildGoalHeroSubtitle,
  buildGoalInsight,
  buildGoalScenarioComparison,
  buildNextGoalMilestone,
} from "@/lib/services/goals/goalCoach";
import { buildGoalProgressEngine } from "@/lib/services/goals/goalProgressEngine";
import {
  computeGoalProgress,
  GOAL_FORM_DEFAULT,
  isGoalAchieved,
  sanitizeGoalForSave,
} from "@/lib/client/userGoalStorage";
import { projectPortfolioValue } from "@/lib/services/goals/goalProgressEngine";
import { formatOptionalPassiveIncomeDisplay } from "@/lib/client/goalPassiveIncome";
import {
  parseOptionalNumericInput,
  sanitizeNumericInput,
} from "@/lib/client/numericInput";
import { useGoalProgress } from "@/lib/client/useGoalProgress";
import { useUserGoal } from "@/lib/client/useUserGoal";
import { usePortfolioDividends } from "@/lib/client/usePortfolioDividends";
import { useUserPortfolio } from "@/lib/client/useUserPortfolio";
import { DASHBOARD_DEEP_LINKS } from "@/lib/navigation/deepLinks";
import { buildPortfolioExposureAllocation } from "@/lib/services/classification";
import { buildPortfolioHealthProfile } from "@/lib/services/portfolio/portfolioHealthProfile";
import {
  IDENTITY_EUR_FX_SNAPSHOT,
  type BaseCurrencyFxSnapshot,
} from "@/lib/services/prices/baseCurrencyFxSnapshot";
import {
  portfolioBaseCurrencySymbol,
  type PortfolioBaseCurrency,
} from "@/lib/types/portfolioBaseCurrency";
import type { GoalSettings } from "@/lib/types/portfolioStorage";

function formatPercentage(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value / 100);
}

function projectValue(
  startingValue: number,
  monthlyContribution: number,
  annualReturn: number,
  months: number,
) {
  return projectPortfolioValue(
    startingValue,
    monthlyContribution,
    annualReturn,
    months,
  );
}

export default function GoalsPage() {
  const { formatEur, snapshot, baseCurrency, canPersistMonetary, refreshFx } =
    useBaseCurrencyDisplay();
  const { userSub, holdings, portfolioReady, saveHoldings } =
    useUserPortfolio();
  const { goal: savedGoal, hasSavedGoal, persistGoal } = useUserGoal();
  const goalProgress = useGoalProgress({
    holdings,
    goal: savedGoal,
    hasSavedGoal,
  });
  const { snapshot: dividendSnapshot } = usePortfolioDividends(
    holdings,
    userSub,
    holdings.length > 0,
  );
  const healthAlignmentPreview = useMemo(() => {
    if (!hasSavedGoal || holdings.length === 0) return null;
    return buildPortfolioHealthProfile({
      holdings,
      goal: savedGoal,
      hasSavedGoal,
      dividends: dividendSnapshot,
      exposure: buildPortfolioExposureAllocation(holdings),
    });
  }, [dividendSnapshot, hasSavedGoal, holdings, savedGoal]);
  const [goal, setGoal] = useState<GoalSettings>(GOAL_FORM_DEFAULT);
  const [formSession, setFormSession] = useState<BaseCurrencyFxSnapshot>(
    IDENTITY_EUR_FX_SNAPSHOT,
  );
  const [formCurrency, setFormCurrency] =
    useState<PortfolioBaseCurrency>("EUR");
  const [formDirty, setFormDirty] = useState(false);
  const [fxFormError, setFxFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

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

  const goalEur = useMemo(() => {
    const converted = convertGoalBaseDraftToEur(goal, formSession);
    return converted.ok ? converted.value : null;
  }, [formSession, goal]);

  const calcGoal = useMemo(
    () =>
      goalEur ?? {
        ...goal,
        targetValue: 0,
        monthlyContribution: 0,
      },
    [goal, goalEur],
  );

  const currencyPrefix = portfolioBaseCurrencySymbol(formCurrency);
  const portfolioValue = goalProgress.currentValue;

  const currentYear = new Date().getFullYear();
  const monthsRemaining = Math.max((calcGoal.targetYear - currentYear) * 12, 0);
  const progress =
    calcGoal.targetValue > 0
      ? computeGoalProgress(portfolioValue, calcGoal)
      : 0;
  const goalCompleted = isGoalAchieved(portfolioValue, calcGoal);

  const projectedValue = useMemo(
    () =>
      projectValue(
        portfolioValue,
        calcGoal.monthlyContribution,
        calcGoal.expectedAnnualReturn,
        monthsRemaining,
      ),
    [calcGoal, monthsRemaining, portfolioValue],
  );

  const difference = projectedValue - calcGoal.targetValue;

  const engineProgress = useMemo(() => {
    const normalized = goalEur ? sanitizeGoalForSave(goalEur) : null;
    return buildGoalProgressEngine({
      currentPortfolioValue: portfolioValue,
      goal: hasSavedGoal && savedGoal ? savedGoal : normalized,
      hasSavedGoal: hasSavedGoal || Boolean(normalized),
    });
  }, [goalEur, hasSavedGoal, portfolioValue, savedGoal]);

  const coachGoal =
    hasSavedGoal && savedGoal ? savedGoal : (goalEur ?? calcGoal);

  const goalIntelligence = useMemo(() => {
    if (!engineProgress.hasGoal) {
      return null;
    }

    return {
      coach: buildGoalCoach({
        progress: engineProgress,
        goal: coachGoal,
        projectedValueAtTargetYear: projectedValue,
      }),
      milestones: buildGoalCurrencyMilestones(
        portfolioValue,
        coachGoal.targetValue,
      ),
      scenarios: buildGoalScenarioComparison({
        currentValue: portfolioValue,
        goal: coachGoal,
      }),
      insight: buildGoalInsight({
        progress: engineProgress,
        goal: coachGoal,
        projectedValueAtTargetYear: projectedValue,
      }),
    };
  }, [coachGoal, engineProgress, portfolioValue, projectedValue]);
  const goalHeroSubtitle = useMemo(
    () =>
      buildGoalHeroSubtitle({
        progress: engineProgress,
        goal: coachGoal,
        hasSavedGoal,
      }),
    [coachGoal, engineProgress, hasSavedGoal],
  );
  const nextGoalMilestone = useMemo(() => {
    if (!engineProgress.hasGoal || coachGoal.targetValue <= 0) {
      return null;
    }

    return buildNextGoalMilestone({
      currentValue: portfolioValue,
      targetValue: coachGoal.targetValue,
      currentProgressPercent: engineProgress.currentProgressPercent,
    });
  }, [
    coachGoal.targetValue,
    engineProgress.currentProgressPercent,
    engineProgress.hasGoal,
    portfolioValue,
  ]);

  const health =
    projectedValue >= calcGoal.targetValue
      ? "On track"
      : projectedValue >= calcGoal.targetValue * 0.85
        ? "Attention needed"
        : "Off track";

  const healthClasses =
    health === "On track"
      ? "bg-emerald-100 text-emerald-700"
      : health === "Attention needed"
        ? "bg-amber-100 text-amber-700"
        : "bg-red-100 text-red-700";

  const targetMinBase = convertCanonicalEurAmount(1_000, formSession) ?? 1_000;

  function updateGoal(field: keyof GoalSettings, value: string) {
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

    const normalized = sanitizeGoalForSave(converted.value);
    if (!normalized) return;

    persistGoal(normalized);
    setFormDirty(false);
    setSaved(true);
  }

  if (!portfolioReady) {
    return <AppPageLoading />;
  }

  return (
    <>
      <PageContainer>
        <PageHero
          id="goal-progress"
          title="Goals"
          subtitle={goalHeroSubtitle}
          backToDashboard
          visual={
            <GoalHeroProgressVisual
              progress={engineProgress}
              hasSavedGoal={hasSavedGoal}
            />
          }
          stats={
            nextGoalMilestone ? (
              <GoalHeroMilestones milestone={nextGoalMilestone} />
            ) : null
          }
        />

        <section
          className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
          aria-labelledby="goals-scorecard-link-heading"
        >
          <p className={appSectionLabelClass}>Scorecard</p>
          <h2
            id="goals-scorecard-link-heading"
            className={`mt-1 ${appSectionTitleClass}`}
          >
            Goal score
          </h2>
          <p className={`mt-2 ${appSectionMetaClass}`}>
            View goal score evidence and methodology on the Portfolio Scorecard.
            Edit your target and contributions below.
          </p>
          <Link
            href={DASHBOARD_DEEP_LINKS.scorecardGoal}
            className="mt-4 inline-flex min-h-[44px] items-center gap-1.5 text-[15px] font-semibold text-sky-700"
          >
            Open Goal score
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </section>

        {holdings.length === 0 ? (
          <EmptyPortfolioGuide
            density="compact"
            title="Goals work best with a portfolio"
            body="You can still set a target now. Import or add holdings so progress, projections and portfolio fit use your real positions."
            availableWithoutHoldings="Goal settings remain available without holdings."
          />
        ) : null}

        {healthAlignmentPreview &&
        healthAlignmentPreview.goalAlignment.label !==
          "Goal data unavailable" ? (
          <section
            className={`${appHeroShellClass} px-5 py-6 sm:px-7`}
            aria-labelledby="goals-health-alignment"
          >
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-white/10 p-3 text-white">
                <Scale className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <p className={appHeroMetricLabelClass}>Portfolio fit</p>
                <h2
                  id="goals-health-alignment"
                  className="mt-2 text-xl font-bold tracking-[-0.03em] text-white"
                >
                  {healthAlignmentPreview.goalAlignment.label}
                </h2>
                <p className="mt-2 max-w-2xl text-[15px] font-medium leading-relaxed text-white/80">
                  {healthAlignmentPreview.goalAlignment.reason}
                </p>
                <Link
                  href={DASHBOARD_DEEP_LINKS.scorecardHealth}
                  className="mt-4 inline-flex min-h-[44px] items-center gap-1.5 text-[15px] font-semibold text-sky-300"
                >
                  Open Portfolio Scorecard
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </section>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <form
            onSubmit={handleSubmit}
            className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                <Goal className="h-5 w-5" />
              </div>
              <div>
                <h2 className={appSectionTitleClass}>Set your goal</h2>
                <p className={`${appSectionMetaClass}`}>
                  Four inputs, saved in one step.
                </p>
              </div>
            </div>

            <div className="mt-7 space-y-5">
              <GoalInput
                label={`Target amount (${formCurrency})`}
                icon={<Target className="h-4 w-4" />}
                prefix={currencyPrefix}
                value={goal.targetValue}
                min={targetMinBase}
                step={1_000}
                onChange={(value) => updateGoal("targetValue", value)}
              />
              <GoalInput
                label="Target year"
                icon={<CalendarDays className="h-4 w-4" />}
                value={goal.targetYear}
                min={currentYear + 1}
                max={currentYear + 60}
                step={1}
                onChange={(value) => updateGoal("targetYear", value)}
              />
              <GoalInput
                label={`Monthly contribution (${formCurrency})`}
                icon={<PiggyBank className="h-4 w-4" />}
                prefix={currencyPrefix}
                value={goal.monthlyContribution}
                min={0}
                step={50}
                onChange={(value) => updateGoal("monthlyContribution", value)}
              />
              <GoalInput
                label="Expected annual return"
                icon={<TrendingUp className="h-4 w-4" />}
                suffix="%"
                value={goal.expectedAnnualReturn}
                min={0}
                max={50}
                step={0.5}
                onChange={(value) => updateGoal("expectedAnnualReturn", value)}
              />
              <OptionalGoalInput
                label={`Passive income target (optional, ${formCurrency})`}
                icon={<PiggyBank className="h-4 w-4" />}
                prefix={currencyPrefix}
                value={goal.passiveIncomeTarget}
                step={500}
                onChange={(value) => {
                  setSaved(false);
                  setFormDirty(true);
                  setGoal((current) => {
                    if (value === undefined) {
                      const next = { ...current };
                      delete next.passiveIncomeTarget;
                      return next;
                    }

                    return { ...current, passiveIncomeTarget: value };
                  });
                }}
              />
            </div>

            {fxFormError ? (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                <p role="alert">{fxFormError}</p>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  {!canPersistMonetary && baseCurrency !== "EUR" ? (
                    <button
                      type="button"
                      onClick={() => refreshFx()}
                      className="inline-flex min-h-[44px] items-center font-semibold underline"
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
                      className="inline-flex min-h-[44px] items-center font-semibold underline"
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
              className={`mt-7 w-full ${appSolidButtonClass}`}
            >
              {saved ? (
                <Check className="h-4 w-4" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saved ? "Goal saved" : "Save goal"}
            </button>
          </form>

          <section className={`${appDarkCardClass} ${appDarkCardPaddingClass}`}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className={appHeroMetricLabelClass}>Goal dashboard</p>
                <p className={`mt-3 ${appCardValueClass} text-white`}>
                  {goalCompleted ? "Goal achieved" : formatPercentage(progress)}
                </p>
                <p className={`mt-2 ${appSectionMetaClass} text-white/55`}>
                  {goalCompleted
                    ? `Your portfolio has reached ${formatEur(calcGoal.targetValue)}.`
                    : `of ${formatEur(calcGoal.targetValue)}`}
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${healthClasses}`}
              >
                {health}
              </span>
            </div>

            <div className="mt-7 h-3 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-brand"
                style={{
                  width: `${Math.max(progress, goalCompleted ? 100 : hasSavedGoal ? 1 : 0)}%`,
                }}
              />
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <ResultCard
                label="Current portfolio"
                value={formatEur(portfolioValue)}
              />
              <ResultCard
                label={`Projected in ${calcGoal.targetYear}`}
                value={formatEur(projectedValue)}
              />
              <ResultCard
                label="Monthly contribution"
                value={formatEur(calcGoal.monthlyContribution)}
              />
              <ResultCard
                label="Expected return"
                value={formatPercentage(calcGoal.expectedAnnualReturn)}
              />
            </div>

            <div className="mt-4">
              <ConversionDetailsDisclosure compactTrigger tone="dark" />
            </div>

            <div
              className={`mt-6 rounded-2xl border p-5 ${
                difference >= 0
                  ? "border-emerald-400/20 bg-emerald-400/10"
                  : "border-amber-400/20 bg-amber-400/10"
              }`}
            >
              <p className="text-sm font-bold">
                {difference >= 0
                  ? `Projected buffer: ${formatEur(difference)}`
                  : `Projected shortfall: ${formatEur(Math.abs(difference))}`}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                This projection is an estimate based on your inputs. Returns are
                not guaranteed and this is not financial advice.
              </p>
            </div>

            {goalIntelligence ? (
              <div className="mt-6 space-y-4">
                <GoalCoachCard coach={goalIntelligence.coach} />
                <GoalMilestonesRow milestones={goalIntelligence.milestones} />
                <GoalWhatIfCard comparison={goalIntelligence.scenarios} />
                <GoalInsightCard insight={goalIntelligence.insight} />
              </div>
            ) : null}
          </section>
        </div>

        <div>
          <PassiveIncomeGoalCard
            snapshot={dividendSnapshot}
            passiveIncomeTarget={
              savedGoal?.passiveIncomeTarget ?? goalEur?.passiveIncomeTarget
            }
            onEstimateChange={(holdingId, estimate) => {
              saveHoldings(
                holdings.map((holding) =>
                  holding.id === holdingId
                    ? {
                        ...holding,
                        passiveIncomeUserEstimate: estimate ?? undefined,
                      }
                    : holding,
                ),
              );
            }}
          />
        </div>
      </PageContainer>
      <BottomNavigation />
    </>
  );
}

function GoalInput({
  label,
  icon,
  prefix,
  suffix,
  value,
  min,
  onChange,
}: {
  label: string;
  icon: React.ReactNode;
  prefix?: string;
  suffix?: string;
  value: number;
  min: number;
  max?: number;
  step?: number;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="flex items-center gap-2 text-sm font-bold text-slate-700">
        {icon}
        {label}
      </span>
      <span className="mt-2 flex min-h-[44px] items-center rounded-xl border border-slate-200 bg-slate-50 px-4 focus-within:border-violet-400 focus-within:ring-4 focus-within:ring-violet-100">
        {prefix && <span className="font-bold text-slate-400">{prefix}</span>}
        <NumericInput
          required
          value={value}
          min={min}
          placeholder={prefix ? "0.00" : suffix ? "0.0" : "0"}
          onChange={(next) => onChange(String(next))}
          className="min-w-0 flex-1 bg-transparent px-2 py-3.5 text-base font-bold outline-none"
        />
        {suffix && <span className="font-bold text-slate-400">{suffix}</span>}
      </span>
    </label>
  );
}

function OptionalGoalInput({
  label,
  icon,
  prefix,
  value,
  onChange,
}: {
  label: string;
  icon: React.ReactNode;
  prefix?: string;
  value?: number;
  step?: number;
  onChange: (value: number | undefined) => void;
}) {
  const [text, setText] = useState(() =>
    formatOptionalPassiveIncomeDisplay(value),
  );
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) {
      setText(formatOptionalPassiveIncomeDisplay(value));
    }
  }, [focused, value]);

  return (
    <label className="block">
      <span className="flex items-center gap-2 text-sm font-bold text-slate-700">
        {icon}
        {label}
      </span>
      <span className="mt-2 flex min-h-[44px] items-center rounded-xl border border-slate-200 bg-slate-50 px-4 focus-within:border-violet-400 focus-within:ring-4 focus-within:ring-violet-100">
        {prefix && <span className="font-bold text-slate-400">{prefix}</span>}
        <input
          type="text"
          inputMode="decimal"
          value={text}
          placeholder="0.00"
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            const parsed = parseOptionalNumericInput(text);
            if (parsed === undefined) {
              onChange(undefined);
              setText("");
              return;
            }

            if (parsed < 0) {
              setText(formatOptionalPassiveIncomeDisplay(value));
              return;
            }

            onChange(parsed);
            setText(formatOptionalPassiveIncomeDisplay(parsed));
          }}
          onChange={(event) => {
            const next = sanitizeNumericInput(event.target.value);
            setText(next);
            const parsed = parseOptionalNumericInput(next);
            if (parsed === undefined) {
              onChange(undefined);
              return;
            }

            if (parsed >= 0) {
              onChange(parsed);
            }
          }}
          className="min-w-0 flex-1 bg-transparent px-2 py-3.5 text-base font-bold outline-none"
        />
      </span>
    </label>
  );
}

function ResultCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className={appSectionLabelClass}>{label}</p>
      <p className={`mt-2 ${appCardValueClass} text-white`}>{value}</p>
    </div>
  );
}
