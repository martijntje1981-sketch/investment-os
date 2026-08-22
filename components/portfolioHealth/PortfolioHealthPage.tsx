"use client";

import { useId, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Crosshair,
  Layers3,
  Scale,
  Sparkles,
  Upload,
  Waves,
  Zap,
} from "lucide-react";

import { BackButton } from "@/components/layout/BackButton";
import { ScoreRing } from "@/components/dashboard/ScoreRing";
import {
  AppPageLoading,
  PageContainer,
} from "@/components/layout/PageContainer";
import { AuthenticatedFourQuestionsNav } from "@/components/fourQuestions/AuthenticatedFourQuestionsNav";
import {
  appAnalysisDarkBodyClass,
  appCardClass,
  appCardPaddingClass,
  appCardValueClass,
  appDarkCardClass,
  appDarkCardPaddingClass,
  appDashboardDarkMetaClass,
  appHeroMetricLabelClass,
  appSectionBodyClass,
  appSectionLabelClass,
  appSectionMetaClass,
  appSectionTitleClass,
} from "@/components/layout/appSurface";
import { PortfolioDnaRings } from "@/components/portfolioHealth/PortfolioDnaRings";
import { RiskReturnMap } from "@/components/portfolioHealth/RiskReturnMap";
import { PortfolioScoreDetailSection } from "@/components/portfolio/PortfolioScoreDetailSection";
import PortfolioRecoveryBanner from "@/components/PortfolioRecoveryBanner";
import { EmptyPortfolioGuide } from "@/components/onboarding/EmptyPortfolioGuide";
import { buildPortfolioAnalysis } from "@/lib/client/portfolioAnalysis";
import { useGoalProgress } from "@/lib/client/useGoalProgress";
import { usePortfolioDividends } from "@/lib/client/usePortfolioDividends";
import { usePortfolioPerformanceHistory } from "@/lib/client/usePortfolioPerformanceHistory";
import { useUserGoal } from "@/lib/client/useUserGoal";
import { useUserPortfolio } from "@/lib/client/useUserPortfolio";
import { DASHBOARD_DEEP_LINKS, SECTION_IDS } from "@/lib/navigation/deepLinks";
import { buildPortfolioExposureAllocation } from "@/lib/services/classification";
import {
  buildPortfolioHealthScoreV1,
  HEALTH_SCORE_DISCLAIMER,
  PORTFOLIO_HEALTH_SCORE_VERSION,
} from "@/lib/services/portfolio/healthScore";
import {
  buildPortfolioHealthProfile,
  type CompositionSlice,
  type GoalAlignmentLabel,
  type HiddenPortfolioDriver,
} from "@/lib/services/portfolio/portfolioHealthProfile";
import { buildPortfolioScorecard } from "@/lib/services/portfolio/scorecard";
import { buildMomentumScoreInputFromHistory } from "@/lib/services/portfolio/scorecard/momentumInputs";

const SCORECARD_PAGE_DISCLAIMER =
  "These scores describe portfolio structure, goal tracking, recent momentum, and data readiness. They do not predict returns.";

const SCORECARD_LEGAL_NOTE =
  "Tobailey explains portfolio characteristics and scenarios. It does not provide personal investment advice.";

const GOAL_SCORE_METHODOLOGY =
  "Goal Score measures how the current plan tracks toward the configured target using projected attainment, contribution alignment, and remaining time. It is not a probability of success and does not guarantee outcomes.";

const MOMENTUM_SCORE_METHODOLOGY =
  "Momentum Score uses real 1W and 1M portfolio returns from performance history, plus latest-session holding breadth. It never reuses 1D returns as weekly or monthly history, and it is not a buy or sell signal.";

const READINESS_SCORE_METHODOLOGY =
  "Readiness Score measures data and setup completeness for useful analysis — priced coverage, classification, goal configuration, and history availability. It does not rate investment quality.";

function formatScorecardTimestamp(value: string) {
  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function alignmentTone(label: GoalAlignmentLabel): string {
  if (label === "Limited alignment") return "text-rose-300";
  if (label === "Strong alignment") return "text-brand";
  if (label === "Partial alignment") return "text-amber-200";
  return "text-white/75";
}

function ExposureVisual({ slices }: { slices: CompositionSlice[] }) {
  if (slices.length === 0) {
    return <p className={appSectionMetaClass}>Exposure data unavailable.</p>;
  }

  return (
    <div className="space-y-5">
      <div
        className="flex h-3.5 min-w-0 overflow-hidden rounded-full bg-slate-100 sm:h-4"
        role="img"
        aria-label={slices
          .map((slice) => `${slice.label} ${slice.percent} percent`)
          .join(", ")}
      >
        {slices.map((slice) => (
          <div
            key={slice.id}
            className={`h-full min-w-0 ${slice.colorClass}`}
            style={{ width: `${Math.max(slice.percent, 0)}%` }}
          />
        ))}
      </div>
      <ul className="space-y-3.5">
        {slices.map((slice) => (
          <li key={slice.id} className="min-w-0">
            <div className="flex items-center justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2.5">
                <span
                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${slice.colorClass}`}
                  aria-hidden="true"
                />
                <span className="truncate text-[15px] font-semibold text-slate-950">
                  {slice.label}
                </span>
              </span>
              <span className={`${appCardValueClass}`}>{slice.percent}%</span>
            </div>
            {slice.children && slice.children.length > 0 ? (
              <ul className="mt-2.5 space-y-2 border-l border-slate-200 pl-3.5">
                {slice.children.map((child) => (
                  <li
                    key={child.id}
                    className="flex items-center justify-between gap-3 text-[13px]"
                  >
                    <span className="flex min-w-0 items-center gap-2 text-slate-600">
                      <span
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${child.colorClass}`}
                        aria-hidden="true"
                      />
                      <span className="truncate">{child.label}</span>
                    </span>
                    <span className="font-semibold tabular-nums text-slate-800">
                      {child.percent}%
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

function HiddenDriversVisual({
  drivers,
  insight,
}: {
  drivers: HiddenPortfolioDriver[];
  insight: string;
}) {
  if (drivers.length === 0) {
    return <p className={appSectionMetaClass}>{insight}</p>;
  }

  return (
    <div className="space-y-5">
      <ul className="space-y-4">
        {drivers.map((driver) => (
          <li key={driver.id} className="min-w-0">
            <div className="flex items-baseline justify-between gap-3">
              <p className="min-w-0 truncate text-[15px] font-semibold text-white">
                {driver.label}
              </p>
              <p className="shrink-0 text-[12px] font-medium text-white/55">
                {driver.influence}
              </p>
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full rounded-full ${driver.colorClass} transition-all duration-700`}
                style={{
                  width: `${Math.round(driver.relativeStrength * 100)}%`,
                }}
              />
            </div>
          </li>
        ))}
      </ul>
      <p className={`${appAnalysisDarkBodyClass} text-white/80`}>{insight}</p>
    </div>
  );
}

export default function PortfolioHealthPage() {
  const {
    holdings,
    portfolioReady,
    userSub,
    recoveryOffer,
    recoverPortfolio,
    dismissRecovery,
  } = useUserPortfolio();
  const { goal, hasSavedGoal, goalReady } = useUserGoal();
  const goalProgress = useGoalProgress({ holdings, goal, hasSavedGoal });
  const { snapshot: dividends, isLoading: dividendsLoading } =
    usePortfolioDividends(holdings, userSub, holdings.length > 0);
  const weekHistory = usePortfolioPerformanceHistory(holdings, "1W");
  const monthHistory = usePortfolioPerformanceHistory(holdings, "1M");

  const analysis = useMemo(() => buildPortfolioAnalysis(holdings), [holdings]);
  const exposure = useMemo(
    () => buildPortfolioExposureAllocation(holdings),
    [holdings],
  );

  const profile = useMemo(
    () =>
      buildPortfolioHealthProfile({
        holdings,
        goal,
        hasSavedGoal,
        dividends: dividendsLoading ? null : dividends,
        analysis,
        exposure,
      }),
    [
      holdings,
      goal,
      hasSavedGoal,
      dividends,
      dividendsLoading,
      analysis,
      exposure,
    ],
  );

  const healthScore = useMemo(
    () =>
      buildPortfolioHealthScoreV1({
        holdings,
        analysis,
        exposure,
        profile,
        goal,
        hasSavedGoal,
        dividends: dividendsLoading ? null : dividends,
      }),
    [
      analysis,
      dividends,
      dividendsLoading,
      exposure,
      goal,
      hasSavedGoal,
      holdings,
      profile,
    ],
  );

  const scorecard = useMemo(() => {
    if (!profile.hasValuedPortfolio) return null;
    const momentum = buildMomentumScoreInputFromHistory({
      week: weekHistory.data,
      month: monthHistory.data,
      holdings,
    });
    const hasPerformanceHistory = Boolean(
      (weekHistory.data?.success &&
        weekHistory.data.investmentReturnPercent != null) ||
      (monthHistory.data?.success &&
        monthHistory.data.investmentReturnPercent != null),
    );
    return buildPortfolioScorecard({
      health: healthScore,
      goal,
      hasSavedGoal,
      goalProgress,
      analysis,
      exposure,
      momentum,
      hasPerformanceHistory,
      holdings,
    });
  }, [
    analysis,
    exposure,
    goal,
    goalProgress,
    hasSavedGoal,
    healthScore,
    holdings,
    monthHistory.data,
    profile.hasValuedPortfolio,
    weekHistory.data,
  ]);

  const methodologyId = useId();
  const [methodologyOpen, setMethodologyOpen] = useState(false);

  if (!portfolioReady || !goalReady) {
    return <AppPageLoading />;
  }

  return (
    <>
      <PageContainer stackClassName="gap-6 md:gap-8">
        <AuthenticatedFourQuestionsNav className="mt-0" />

        {recoveryOffer ? (
          <PortfolioRecoveryBanner
            offer={recoveryOffer}
            onRecover={recoverPortfolio}
            onDismiss={dismissRecovery}
          />
        ) : null}

        {!profile.hasValuedPortfolio ? (
          holdings.length === 0 ? (
            <div className="space-y-4">
              <div className="mb-1">
                <BackButton variant="light" />
              </div>
              <EmptyPortfolioGuide
                title="Portfolio Scorecard needs holdings"
                body="Import or add valued holdings to reveal scores, identity, behaviour and goal fit."
              />
            </div>
          ) : (
            <section className={`${appDarkCardClass} px-5 py-9 sm:px-8`}>
              <div className="mb-4">
                <BackButton variant="light" />
              </div>
              <p className={appHeroMetricLabelClass}>Portfolio Scorecard</p>
              <h1 className="mt-4 text-3xl font-black tracking-[-0.04em] text-white">
                Waiting on portfolio data
              </h1>
              <p className="mt-3 max-w-md text-base font-medium text-white/90">
                Add valued holdings to unlock your Portfolio Scorecard.
              </p>
              <Link
                href="/portfolio"
                className="mt-7 inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-5 py-3 text-[15px] font-semibold text-slate-950"
              >
                <Upload className="h-4 w-4" aria-hidden="true" />
                Open portfolio
              </Link>
            </section>
          )
        ) : scorecard ? (
          <>
            {/* Hero — Portfolio Scorecard */}
            <section
              className={`${appDarkCardClass} relative overflow-hidden ${appDarkCardPaddingClass} sm:py-9`}
              aria-labelledby="portfolio-scorecard-hero"
            >
              <div className="relative max-w-3xl">
                <div className="mb-4">
                  <BackButton variant="light" />
                </div>
                <p className={appHeroMetricLabelClass}>Portfolio Scorecard</p>
                <h1
                  id="portfolio-scorecard-hero"
                  className="mt-3 text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl"
                >
                  Your portfolio at a glance
                </h1>
                <div className="mt-6 rounded-[24px] bg-white/95 p-4 shadow-sm sm:p-5">
                  <div className="grid min-w-0 grid-cols-2 gap-1 sm:gap-2 lg:grid-cols-4">
                    <ScoreRing score={scorecard.scores.health} showContext />
                    <ScoreRing score={scorecard.scores.goal} showContext />
                    <ScoreRing score={scorecard.scores.momentum} showContext />
                    <ScoreRing score={scorecard.scores.readiness} showContext />
                  </div>
                </div>
                <p className="mt-5 max-w-2xl text-[15px] font-semibold leading-relaxed text-white sm:text-base">
                  {scorecard.summary.headline}
                </p>
                <p className="mt-3 text-[13px] font-medium text-white/90">
                  Scorecard {scorecard.scorecardVersion} · Calculated{" "}
                  {formatScorecardTimestamp(scorecard.calculatedAt)}
                </p>
                <p className="mt-3 max-w-xl text-[15px] font-medium leading-relaxed text-white/90">
                  {SCORECARD_PAGE_DISCLAIMER}
                </p>
              </div>
            </section>

            <div
              id={SECTION_IDS.scorecardHealth}
              className="scroll-mt-24 space-y-6 md:space-y-8"
            >
              {/* Health identity */}
              <section
                className={`${appDarkCardClass} ${appDarkCardPaddingClass}`}
                aria-labelledby="health-identity-heading"
              >
                <div className="relative max-w-3xl">
                  <p className={appHeroMetricLabelClass}>Health</p>
                  <div className="mt-3 flex flex-wrap items-end gap-x-4 gap-y-2">
                    <p
                      className="text-5xl font-bold tabular-nums tracking-[-0.04em] text-white sm:text-6xl"
                      aria-label={`Score ${healthScore.score} out of 100`}
                    >
                      {healthScore.score}
                      <span className="ml-1 text-2xl font-semibold text-white/55">
                        /100
                      </span>
                    </p>
                    <div className="min-w-0 pb-1">
                      <p className="text-lg font-bold text-white sm:text-xl">
                        {healthScore.band.label}
                      </p>
                      <p className="mt-1 text-[13px] font-medium text-white/60">
                        {healthScore.confidence.label} ·{" "}
                        {healthScore.confidence.classifiedCoveragePercent}%
                        classified
                      </p>
                    </div>
                  </div>
                  <h2
                    id="health-identity-heading"
                    className="mt-5 text-[1.35rem] font-bold leading-[1.15] tracking-[-0.03em] text-white sm:text-2xl md:text-[1.85rem]"
                  >
                    {profile.hero.identity}
                  </h2>
                  <p className="mt-3 max-w-xl text-[15px] font-medium leading-relaxed text-white/75 sm:text-base">
                    {healthScore.explanation}
                  </p>
                  {scorecard.scores.health.context ? (
                    <div className="mt-5 max-w-xl rounded-2xl bg-white/10 px-4 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55">
                        What shapes this score
                      </p>
                      <p className="mt-1.5 text-[14px] font-semibold leading-snug text-white">
                        {scorecard.scores.health.context.headline}
                      </p>
                      {scorecard.scores.health.context.detail ? (
                        <p className="mt-1 text-[13px] font-medium text-white/65">
                          {scorecard.scores.health.context.detail}
                        </p>
                      ) : null}
                      {scorecard.scores.health.context.factors &&
                      scorecard.scores.health.context.factors.length > 0 ? (
                        <ul className="mt-2 space-y-1">
                          {scorecard.scores.health.context.factors
                            .slice(0, 3)
                            .map((factor) => (
                              <li
                                key={factor.label}
                                className="text-[12px] font-medium text-white/70"
                              >
                                {factor.label}
                              </li>
                            ))}
                        </ul>
                      ) : null}
                      <Link
                        href={scorecard.scores.health.context.href}
                        className="mt-3 inline-flex min-h-[44px] items-center text-[13px] font-semibold text-brand underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                      >
                        {scorecard.scores.health.context.linkLabel}
                      </Link>
                    </div>
                  ) : null}
                  {profile.hero.traits.length > 0 ? (
                    <p className="mt-4 text-[13px] font-medium tracking-[-0.01em] text-white/55">
                      {profile.hero.traits.join(" · ")}
                    </p>
                  ) : null}
                </div>
              </section>

              {/* Dimension breakdown */}
              <section
                className={`${appCardClass} ${appCardPaddingClass}`}
                aria-labelledby="health-dimensions-heading"
              >
                <p className={appSectionLabelClass}>Dimension breakdown</p>
                <h2
                  id="health-dimensions-heading"
                  className={`mt-1 ${appSectionTitleClass}`}
                >
                  How the score is built
                </h2>
                <ul className="mt-6 space-y-4">
                  {healthScore.dimensions
                    .filter((dimension) => dimension.applicable)
                    .map((dimension) => (
                      <li key={dimension.id} className="min-w-0">
                        <div className="flex items-baseline justify-between gap-3">
                          <p className="text-[15px] font-semibold text-slate-950">
                            {dimension.label}
                          </p>
                          <p className="shrink-0 text-[15px] font-bold tabular-nums text-slate-950">
                            {dimension.score}/100
                          </p>
                        </div>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-brand"
                            style={{ width: `${dimension.score ?? 0}%` }}
                          />
                        </div>
                        <p className={`mt-2 ${appSectionMetaClass}`}>
                          Weight {dimension.effectiveWeight.toFixed(0)}% ·{" "}
                          {dimension.evidence[0]?.text ?? dimension.explanation}
                        </p>
                      </li>
                    ))}
                </ul>
              </section>

              {/* Score strengths / attention */}
              <section
                className="grid gap-4 sm:gap-5 md:grid-cols-2"
                aria-label="Score strengths and attention points"
              >
                <div className={`${appCardClass} ${appCardPaddingClass}`}>
                  <p className={appSectionLabelClass}>Score strengths</p>
                  <ul className="mt-3 space-y-3">
                    {healthScore.strengths.map((item) => (
                      <li key={item.id}>
                        <p className="text-[15px] font-semibold text-slate-950">
                          {item.title}
                        </p>
                        <p className={`mt-1 ${appSectionBodyClass}`}>
                          {item.detail}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className={`${appCardClass} ${appCardPaddingClass}`}>
                  <p className={appSectionLabelClass}>Attention points</p>
                  <ul className="mt-3 space-y-3">
                    {healthScore.attentionPoints.map((item) => (
                      <li key={item.id}>
                        <p className="text-[15px] font-semibold text-slate-950">
                          {item.title}
                        </p>
                        <p className={`mt-1 ${appSectionBodyClass}`}>
                          {item.detail}
                        </p>
                      </li>
                    ))}
                    {healthScore.improvementDrivers[0] ? (
                      <li>
                        <p className={`mt-1 ${appSectionMetaClass}`}>
                          {healthScore.improvementDrivers[0]}
                        </p>
                      </li>
                    ) : null}
                  </ul>
                </div>
              </section>

              {/* DNA — structural only */}
              <section
                className={`${appDarkCardClass} ${appDarkCardPaddingClass}`}
                aria-labelledby="portfolio-dna-heading"
              >
                <div className="grid gap-6 sm:gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
                  <div className="min-w-0">
                    <p className={appHeroMetricLabelClass}>Portfolio DNA</p>
                    <h2
                      id="portfolio-dna-heading"
                      className="mt-2 text-xl font-bold tracking-[-0.03em] text-white sm:text-2xl"
                    >
                      Structural characteristics
                    </h2>
                    <ul className="mt-6 grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-3 sm:gap-y-5">
                      {profile.dna.characteristics.map((item) => (
                        <li key={item.id} className="min-w-0">
                          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-white/45">
                            {item.label}
                          </p>
                          <p className="mt-1 text-[14px] font-semibold text-white sm:text-[15px]">
                            {item.value}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="mx-auto w-full max-w-[200px] sm:max-w-[220px]">
                    <PortfolioDnaRings
                      characteristics={profile.dna.characteristics}
                      identity={profile.hero.identity}
                    />
                  </div>
                </div>
              </section>

              {/* Exposure */}
              <section
                className={`${appCardClass} ${appCardPaddingClass}`}
                aria-labelledby="exposure-heading"
              >
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
                    <Layers3 className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <p className={appSectionLabelClass}>Exposure</p>
                    <h2
                      id="exposure-heading"
                      className={`mt-1 ${appSectionTitleClass}`}
                    >
                      Where is my money invested?
                    </h2>
                  </div>
                </div>
                <div className="mt-7">
                  <ExposureVisual slices={profile.exposure.slices} />
                </div>
                {profile.exposure.coverageNote ? (
                  <p className={`mt-5 ${appSectionMetaClass}`}>
                    {profile.exposure.coverageNote}
                  </p>
                ) : null}
              </section>

              {/* Hidden drivers */}
              <section
                className={`${appDarkCardClass} ${appDarkCardPaddingClass}`}
                aria-labelledby="hidden-drivers-heading"
              >
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl bg-white/10 p-3 text-white">
                    <Zap className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <p className={appHeroMetricLabelClass}>Hidden drivers</p>
                    <h2
                      id="hidden-drivers-heading"
                      className="mt-2 text-xl font-bold tracking-[-0.03em] text-white sm:text-2xl"
                    >
                      What really drives your portfolio?
                    </h2>
                  </div>
                </div>
                <div className="mt-7">
                  <HiddenDriversVisual
                    drivers={profile.hiddenDrivers.drivers}
                    insight={profile.hiddenDrivers.insight}
                  />
                </div>
              </section>

              {/* Strength / Vulnerability */}
              <section
                className="grid gap-4 sm:gap-5 md:grid-cols-2"
                aria-label="Strength and vulnerability"
              >
                <div className={`${appCardClass} ${appCardPaddingClass}`}>
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-q1-soft p-3 text-q1-strong">
                      <Sparkles className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div>
                      <p className={appSectionLabelClass}>Strength</p>
                      <h3 className={`mt-2 ${appSectionTitleClass}`}>
                        {profile.strength?.title ?? "Unavailable"}
                      </h3>
                    </div>
                  </div>
                  <p className={`mt-4 ${appSectionBodyClass}`}>
                    {profile.strength?.detail ??
                      "Not enough structure to name a strength."}
                  </p>
                </div>

                <div
                  className={`${appCardClass} ${appCardPaddingClass} ${
                    profile.vulnerability?.emphasize ? "border-rose-200" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`rounded-2xl p-3 ${
                        profile.vulnerability?.emphasize
                          ? "bg-rose-50 text-rose-700"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      <Crosshair className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div>
                      <p className={appSectionLabelClass}>Vulnerability</p>
                      <h3
                        className={`mt-2 ${appSectionTitleClass} ${
                          profile.vulnerability?.emphasize
                            ? "text-rose-900"
                            : ""
                        }`}
                      >
                        {profile.vulnerability?.title ?? "Unavailable"}
                      </h3>
                    </div>
                  </div>
                  <p className={`mt-4 ${appSectionBodyClass}`}>
                    {profile.vulnerability?.detail ??
                      "Not enough structure to name a vulnerability."}
                  </p>
                </div>
              </section>

              {/* Goal alignment */}
              <section
                className={`${appDarkCardClass} ${appDarkCardPaddingClass}`}
                aria-labelledby="goal-alignment-heading"
              >
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl bg-white/10 p-3 text-white">
                    <Scale className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={appHeroMetricLabelClass}>Goal alignment</p>
                    <h2
                      id="goal-alignment-heading"
                      className={`mt-2 text-2xl font-bold tracking-[-0.03em] ${alignmentTone(profile.goalAlignment.label)}`}
                    >
                      {profile.goalAlignment.label}
                    </h2>
                    <p className={`mt-3 max-w-2xl ${appAnalysisDarkBodyClass}`}>
                      {profile.goalAlignment.reason}
                    </p>
                    {!hasSavedGoal ? (
                      <Link
                        href="/goals"
                        className="mt-5 inline-flex min-h-[44px] items-center gap-1.5 text-[15px] font-semibold text-brand"
                      >
                        Set a goal
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </Link>
                    ) : null}
                  </div>
                </div>
                <div className="mt-7">
                  <div className="relative h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-rose-400/70 via-amber-300/80 to-sky-300/90"
                      style={{ width: "100%" }}
                      aria-hidden="true"
                    />
                  </div>
                  <div className="relative mt-3 h-3">
                    <div
                      className="absolute top-0 -translate-x-1/2 transition-all duration-700"
                      style={{
                        left: `${Math.max(4, Math.min(96, profile.goalAlignment.bandPosition * 100))}%`,
                      }}
                    >
                      <div className="h-3 w-3 rounded-full border-2 border-white bg-navy-hero" />
                    </div>
                  </div>
                </div>
              </section>

              {/* Expected volatility */}
              <section
                className={`${appCardClass} ${appCardPaddingClass}`}
                aria-labelledby="volatility-heading"
              >
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl bg-q2-soft p-3 text-q2-strong">
                    <Waves className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <p className={appSectionLabelClass}>Expected volatility</p>
                    <h2
                      id="volatility-heading"
                      className={`mt-1 ${appSectionTitleClass}`}
                    >
                      How lively should this feel?
                    </h2>
                  </div>
                </div>
                <p className="mt-6 text-4xl font-black tracking-[-0.04em] text-slate-950 sm:text-5xl">
                  {profile.expectedVolatility.level}
                </p>
                <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-slate-400 via-violet-500 to-rose-400"
                    style={{
                      width: `${Math.round(profile.expectedVolatility.index * 100)}%`,
                    }}
                  />
                </div>
                <p className={`mt-4 ${appSectionBodyClass} text-slate-600`}>
                  {profile.expectedVolatility.summary}
                </p>
              </section>

              {/* Risk vs return */}
              <section
                className={`${appDarkCardClass} ${appDarkCardPaddingClass}`}
                aria-labelledby="risk-return-heading"
              >
                <p className={appHeroMetricLabelClass}>
                  Risk vs expected return
                </p>
                <h2
                  id="risk-return-heading"
                  className="mt-2 text-xl font-bold tracking-[-0.03em] text-white sm:text-2xl"
                >
                  Where this portfolio sits
                </h2>
                <div className="mt-6">
                  <RiskReturnMap
                    volatilityIndex={profile.riskReturn.volatilityIndex}
                    returnIndex={profile.riskReturn.returnIndex}
                    volatilityLevel={profile.expectedVolatility.level}
                    returnBand={profile.riskReturn.returnBand}
                  />
                </div>
                <p className={`mt-5 ${appDashboardDarkMetaClass}`}>
                  Descriptive zones from structure — not a forecast or advice.
                </p>
              </section>

              <section
                className={`${appCardClass} ${appCardPaddingClass}`}
                aria-labelledby="health-methodology-heading"
              >
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                  aria-expanded={methodologyOpen}
                  aria-controls={methodologyId}
                  onClick={() => setMethodologyOpen((value) => !value)}
                >
                  <div>
                    <p className={appSectionLabelClass}>Methodology</p>
                    <h2
                      id="health-methodology-heading"
                      className={`mt-1 ${appSectionTitleClass}`}
                    >
                      What this score means
                    </h2>
                  </div>
                  <span className="text-sm font-semibold text-slate-600">
                    {methodologyOpen ? "Hide" : "Show"}
                  </span>
                </button>
                {methodologyOpen ? (
                  <div id={methodologyId} className="mt-4 space-y-3">
                    <p className={appSectionBodyClass}>
                      {HEALTH_SCORE_DISCLAIMER}
                    </p>
                    <p className={appSectionBodyClass}>
                      Version {PORTFOLIO_HEALTH_SCORE_VERSION}. Applicable
                      dimensions are weighted and renormalized when goal or
                      income alignment does not apply. Missing data lowers
                      confidence rather than inventing zeros for unavailable
                      structure.
                    </p>
                    <p className={appSectionMetaClass}>
                      Confidence: {healthScore.confidence.explanation}
                    </p>
                  </div>
                ) : null}
              </section>
            </div>

            <PortfolioScoreDetailSection
              id={SECTION_IDS.scorecardGoal}
              score={scorecard.scores.goal}
              title="Scorecard"
              methodology={GOAL_SCORE_METHODOLOGY}
            />
            <p className={`px-1 ${appSectionMetaClass}`}>
              <Link
                href="/goals"
                className="inline-flex min-h-[44px] items-center gap-1.5 font-semibold text-q1-strong"
              >
                Edit goal settings
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </p>

            <PortfolioScoreDetailSection
              id={SECTION_IDS.scorecardMomentum}
              score={scorecard.scores.momentum}
              title="Scorecard"
              methodology={MOMENTUM_SCORE_METHODOLOGY}
            />
            <p className={`px-1 ${appSectionMetaClass}`}>
              <Link
                href={DASHBOARD_DEEP_LINKS.portfolioPerformance}
                className="inline-flex min-h-[44px] items-center gap-1.5 font-semibold text-q1-strong"
              >
                Open portfolio performance
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </p>

            <PortfolioScoreDetailSection
              id={SECTION_IDS.scorecardReadiness}
              score={scorecard.scores.readiness}
              title="Scorecard"
              methodology={READINESS_SCORE_METHODOLOGY}
            />
            <div className={`${appCardClass} ${appCardPaddingClass}`}>
              <p className={appSectionLabelClass}>Setup actions</p>
              <ul className="mt-3 space-y-2">
                {!hasSavedGoal ? (
                  <li>
                    <Link
                      href="/goals"
                      className="inline-flex min-h-[44px] items-center gap-1.5 font-semibold text-q1-strong"
                    >
                      Set a savings goal
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </li>
                ) : null}
                <li>
                  <Link
                    href="/portfolio"
                    className="inline-flex min-h-[44px] items-center gap-1.5 font-semibold text-q1-strong"
                  >
                    Review holdings and prices
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </li>
                <li>
                  <Link
                    href={DASHBOARD_DEEP_LINKS.portfolioPerformance}
                    className="inline-flex min-h-[44px] items-center gap-1.5 font-semibold text-q1-strong"
                  >
                    Check performance history
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </li>
              </ul>
            </div>

            <div className="flex flex-wrap items-center gap-4 px-1 pb-1">
              <Link
                href="/dashboard"
                className="inline-flex min-h-[44px] items-center text-[15px] font-semibold text-slate-600"
              >
                ← Dashboard
              </Link>
              <Link
                href="/analysis"
                className="inline-flex min-h-[44px] items-center gap-1.5 text-[15px] font-semibold text-slate-600"
              >
                <Activity className="h-4 w-4" aria-hidden="true" />
                Analysis
              </Link>
              <Link
                href="/portfolio"
                className="inline-flex min-h-[44px] items-center text-[15px] font-semibold text-slate-600"
              >
                Portfolio
              </Link>
            </div>

            <p className={`px-1 pb-2 ${appSectionMetaClass}`}>
              {SCORECARD_LEGAL_NOTE}
            </p>
          </>
        ) : null}

        {profile.partialData && profile.hasValuedPortfolio ? (
          <div className="flex items-start gap-3 rounded-[24px] border border-amber-200/80 bg-amber-50/90 px-4 py-4">
            <AlertCircle
              className="mt-0.5 h-5 w-5 shrink-0 text-amber-700"
              aria-hidden="true"
            />
            <p className="text-[14px] font-medium leading-relaxed text-amber-950">
              {profile.dataNotes.join(" ")}
            </p>
          </div>
        ) : null}
      </PageContainer>
    </>
  );
}
