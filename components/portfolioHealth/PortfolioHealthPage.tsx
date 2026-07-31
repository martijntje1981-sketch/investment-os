"use client";

import { useMemo } from "react";
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
import BottomNavigation from "@/components/home/BottomNav";
import { AppPageLoading, PageContainer } from "@/components/layout/PageContainer";
import {
  appAnalysisDarkBodyClass,
  appCardValueClass,
  appDashboardDarkMetaClass,
  appHeroMetricLabelClass,
  appHeroShellClass,
  appSectionBodyClass,
  appSectionLabelClass,
  appSectionMetaClass,
  appSectionTitleClass,
} from "@/components/layout/appSurface";
import { PortfolioDnaRings } from "@/components/portfolioHealth/PortfolioDnaRings";
import { RiskReturnMap } from "@/components/portfolioHealth/RiskReturnMap";
import PortfolioRecoveryBanner from "@/components/PortfolioRecoveryBanner";
import { buildPortfolioAnalysis } from "@/lib/client/portfolioAnalysis";
import { usePortfolioDividends } from "@/lib/client/usePortfolioDividends";
import { useUserGoal } from "@/lib/client/useUserGoal";
import { useUserPortfolio } from "@/lib/client/useUserPortfolio";
import { buildPortfolioExposureAllocation } from "@/lib/services/classification";
import {
  buildPortfolioHealthProfile,
  type CompositionSlice,
  type GoalAlignmentLabel,
  type HiddenPortfolioDriver,
} from "@/lib/services/portfolio/portfolioHealthProfile";

function alignmentTone(label: GoalAlignmentLabel): string {
  if (label === "Limited alignment") return "text-rose-300";
  if (label === "Strong alignment") return "text-sky-200";
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
  const { snapshot: dividends, isLoading: dividendsLoading } =
    usePortfolioDividends(holdings, userSub, holdings.length > 0);

  const analysis = useMemo(
    () => buildPortfolioAnalysis(holdings),
    [holdings],
  );
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

  if (!portfolioReady || !goalReady) {
    return <AppPageLoading />;
  }

  return (
    <>
      <PageContainer stackClassName="gap-6 md:gap-8">
        {recoveryOffer ? (
          <PortfolioRecoveryBanner
            offer={recoveryOffer}
            onRecover={recoverPortfolio}
            onDismiss={dismissRecovery}
          />
        ) : null}

        {!profile.hasValuedPortfolio ? (
          <section className={`${appHeroShellClass} px-5 py-9 sm:px-8`}>
            <div className="mb-4">
              <BackButton />
            </div>
            <p className={appHeroMetricLabelClass}>Portfolio Health</p>
            <h1 className="mt-4 text-3xl font-black tracking-[-0.04em] text-white">
              Waiting on portfolio data
            </h1>
            <p className="mt-3 max-w-md text-base font-medium text-white/75">
              Add valued holdings to reveal identity, behaviour and goal fit.
            </p>
            <Link
              href="/portfolio"
              className="mt-7 inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-5 py-3 text-[15px] font-semibold text-slate-950"
            >
              <Upload className="h-4 w-4" aria-hidden="true" />
              Open portfolio
            </Link>
          </section>
        ) : (
          <>
            {/* Hero — main story only */}
            <section
              className={`${appHeroShellClass} relative overflow-hidden px-5 py-8 sm:px-8 sm:py-10`}
              aria-labelledby="portfolio-health-hero"
            >
              <div
                className="pointer-events-none absolute inset-0"
                aria-hidden="true"
                style={{
                  background:
                    "radial-gradient(ellipse at 12% 0%, rgba(99,102,241,0.28), transparent 48%), radial-gradient(ellipse at 92% 100%, rgba(14,165,233,0.14), transparent 42%)",
                }}
              />
              <div className="relative max-w-2xl">
                <div className="mb-4">
                  <BackButton />
                </div>
                <p className={appHeroMetricLabelClass}>Portfolio Health</p>
                <h1
                  id="portfolio-health-hero"
                  className="mt-4 text-[1.85rem] font-black leading-[1.1] tracking-[-0.045em] text-white sm:text-4xl md:text-[2.6rem]"
                >
                  {profile.hero.identity}
                </h1>
                <p className="mt-4 max-w-xl text-base font-medium leading-relaxed text-white/80 sm:text-lg">
                  {profile.hero.tagline}
                </p>
                {profile.hero.traits.length > 0 ? (
                  <p className="mt-6 text-[13px] font-semibold tracking-[-0.01em] text-white/55 sm:text-[14px]">
                    {profile.hero.traits.join(" · ")}
                  </p>
                ) : null}
              </div>
            </section>

            {/* DNA — structural only */}
            <section
              className={`${appHeroShellClass} px-5 py-7 sm:px-8 sm:py-8`}
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
              className="rounded-[28px] border border-slate-200/90 bg-white px-5 py-7 shadow-sm sm:px-8 sm:py-8"
              aria-labelledby="exposure-heading"
            >
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
                  <Layers3 className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <p className={appSectionLabelClass}>Exposure</p>
                  <h2 id="exposure-heading" className={`mt-1 ${appSectionTitleClass}`}>
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
              className={`${appHeroShellClass} px-5 py-7 sm:px-8 sm:py-8`}
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
              <div className="rounded-[28px] border border-slate-200/90 bg-white px-5 py-6 shadow-sm sm:px-7 sm:py-7">
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl bg-sky-50 p-3 text-sky-700">
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
                className={`rounded-[28px] border bg-white px-5 py-6 shadow-sm sm:px-7 sm:py-7 ${
                  profile.vulnerability?.emphasize
                    ? "border-rose-200"
                    : "border-slate-200/90"
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
                        profile.vulnerability?.emphasize ? "text-rose-900" : ""
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
              className={`${appHeroShellClass} px-5 py-7 sm:px-8`}
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
                      className="mt-5 inline-flex min-h-[44px] items-center gap-1.5 text-[15px] font-semibold text-sky-300"
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
                    <div className="h-3 w-3 rounded-full border-2 border-white bg-slate-950" />
                  </div>
                </div>
              </div>
            </section>

            {/* Expected volatility */}
            <section
              className="rounded-[28px] border border-slate-200/90 bg-white px-5 py-7 shadow-sm sm:px-8"
              aria-labelledby="volatility-heading"
            >
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-violet-50 p-3 text-violet-700">
                  <Waves className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <p className={appSectionLabelClass}>Expected volatility</p>
                  <h2 id="volatility-heading" className={`mt-1 ${appSectionTitleClass}`}>
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
              className={`${appHeroShellClass} px-5 py-7 sm:px-8`}
              aria-labelledby="risk-return-heading"
            >
              <p className={appHeroMetricLabelClass}>Risk vs expected return</p>
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
          </>
        )}

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
      <BottomNavigation />
    </>
  );
}
