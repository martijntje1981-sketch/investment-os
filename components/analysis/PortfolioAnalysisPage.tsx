"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  Layers3,
  Scale,
  Sparkles,
} from "lucide-react";
import { DividendIntelligenceSection } from "@/components/analysis/DividendIntelligenceSection";
import { CashIntelligenceSection } from "@/components/analysis/CashIntelligenceSection";
import { PortfolioExposureSection } from "@/components/analysis/PortfolioExposureSection";
import { PortfolioPerformanceSection } from "@/components/analysis/performance/PortfolioPerformanceSection";
import { MarketConsensusSection } from "@/components/analysis/marketConsensus/MarketConsensusSection";
import { TopPerformersByCategorySection } from "@/components/analysis/TopPerformersByCategorySection";
import { PortfolioScoreDetailSection } from "@/components/portfolio/PortfolioScoreDetailSection";
import { buildPortfolioExposureAllocation } from "@/lib/services/classification";
import BottomNavigation from "@/components/home/BottomNav";
import {
  AppPageLoading,
  PageContainer,
} from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import {
  appAnalysisDarkBodyClass,
  appAnalysisDarkDisclaimerClass,
  appAnalysisDarkTitleClass,
  appCardValueClass,
  appDarkCardClass,
  appDarkCardPaddingClass,
  appDashboardDarkMetaClass,
  appHeroMetricLabelClass,
  appSectionBodyClass,
  appSectionLabelClass,
  appSectionMetaClass,
  appSectionTitleClass,
  appTableNameClass,
  appTableValueClass,
} from "@/components/layout/appSurface";
import PortfolioRecoveryBanner from "@/components/PortfolioRecoveryBanner";
import { EmptyPortfolioGuide } from "@/components/onboarding/EmptyPortfolioGuide";
import { useBaseCurrencyDisplay } from "@/lib/client/baseCurrencyDisplay";
import {
  buildPortfolioAnalysis,
  concentrationExplanation,
  concentrationLabel,
  formatPortfolioCurrency,
  formatPortfolioPercent,
} from "@/lib/client/portfolioAnalysis";
import { usePortfolioDividends } from "@/lib/client/usePortfolioDividends";
import { usePortfolioPerformanceHistory } from "@/lib/client/usePortfolioPerformanceHistory";
import { useUserGoal } from "@/lib/client/useUserGoal";
import { useUserPortfolio } from "@/lib/client/useUserPortfolio";
import { SECTION_IDS } from "@/lib/navigation/deepLinks";
import { buildPortfolioHealthProfile } from "@/lib/services/portfolio/portfolioHealthProfile";
import { buildPortfolioHealthScoreV1 } from "@/lib/services/portfolio/healthScore";
import {
  buildMomentumScore,
  buildReadinessScore,
} from "@/lib/services/portfolio/scorecard";
import { buildMomentumScoreInputFromHistory } from "@/lib/services/portfolio/scorecard/momentumInputs";

function formatUpdatedAt(value: string | null) {
  if (!value) {
    return "Not updated yet";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not updated yet";
  }

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Amsterdam",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function allocationBarColor(index: number) {
  const palette = [
    "bg-blue-600",
    "bg-violet-600",
    "bg-emerald-600",
    "bg-amber-500",
    "bg-slate-700",
    "bg-cyan-600",
  ];
  return palette[index % palette.length];
}

export default function PortfolioAnalysisPage() {
  const { formatEur } = useBaseCurrencyDisplay();
  const {
    holdings,
    portfolioReady,
    userSub,
    recoveryOffer,
    recoverPortfolio,
    dismissRecovery,
    saveHoldings,
  } = useUserPortfolio();
  const { goal, hasSavedGoal } = useUserGoal();

  const { quotes, isLoading: dividendsLoading } = usePortfolioDividends(
    holdings,
    userSub,
    holdings.length > 0,
  );
  const weekHistory = usePortfolioPerformanceHistory(holdings, "1W");
  const monthHistory = usePortfolioPerformanceHistory(holdings, "1M");

  const analysis = useMemo(() => buildPortfolioAnalysis(holdings), [holdings]);

  const exposureAllocation = useMemo(
    () => buildPortfolioExposureAllocation(holdings),
    [holdings],
  );

  const healthScore = useMemo(() => {
    if (holdings.length === 0) return null;
    const profile = buildPortfolioHealthProfile({
      holdings,
      goal,
      hasSavedGoal,
      dividends: null,
      analysis,
      exposure: exposureAllocation,
    });
    return buildPortfolioHealthScoreV1({
      holdings,
      analysis,
      exposure: exposureAllocation,
      profile,
      goal,
      hasSavedGoal,
      dividends: null,
      isStale: false,
    });
  }, [analysis, exposureAllocation, goal, hasSavedGoal, holdings]);

  const momentumScore = useMemo(() => {
    const input = buildMomentumScoreInputFromHistory({
      week: weekHistory.data,
      month: monthHistory.data,
      holdings,
    });
    return buildMomentumScore(input);
  }, [holdings, monthHistory.data, weekHistory.data]);

  const readinessScore = useMemo(() => {
    if (!healthScore) return null;
    return buildReadinessScore({
      analysis,
      exposure: exposureAllocation,
      health: healthScore,
      hasSavedGoal,
      hasPerformanceHistory: Boolean(
        (weekHistory.data?.success &&
          weekHistory.data.investmentReturnPercent != null) ||
        (monthHistory.data?.success &&
          monthHistory.data.investmentReturnPercent != null),
      ),
    });
  }, [
    analysis,
    exposureAllocation,
    hasSavedGoal,
    healthScore,
    monthHistory.data,
    weekHistory.data,
  ]);

  if (!portfolioReady) {
    return <AppPageLoading />;
  }

  const hasHoldings = holdings.length > 0;
  const hasValuedPositions = analysis.valuedPositions.length > 0;

  return (
    <>
      <PageContainer>
        <PageHero
          title="Portfolio Analysis"
          subtitle="Detailed metrics for performance, allocation and income. For the portfolio story open Portfolio Health. For markets influencing holdings, open Market Pulse."
          backToDashboard
          stats={
            <p className={`${appDashboardDarkMetaClass} mt-0`}>
              Last portfolio update: {formatUpdatedAt(analysis.lastUpdatedAt)}
            </p>
          }
          actions={
            <div className="flex flex-wrap gap-2">
              <Link
                href="/portfolio-health"
                className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-white/20 px-4 py-2.5 text-[15px] font-semibold text-white"
              >
                Portfolio Health
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/market-pulse"
                className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-white/20 px-4 py-2.5 text-[15px] font-semibold text-white"
              >
                Market Pulse
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          }
        />

        <PortfolioRecoveryBanner
          offer={recoveryOffer}
          onRecover={() => {
            recoverPortfolio();
          }}
          onDismiss={dismissRecovery}
        />

        {!hasHoldings ? (
          <EmptyPortfolioGuide
            title="No portfolio to analyse yet"
            body="Import a CSV or Excel file, or add holdings manually, to see allocation, concentration and diversification insights."
          />
        ) : (
          <>
            {analysis.unvaluedHoldings.length > 0 && (
              <div className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  {analysis.unvaluedHoldings.length}{" "}
                  {analysis.unvaluedHoldings.length === 1
                    ? "holding is"
                    : "holdings are"}{" "}
                  excluded from valued totals because a usable current price is
                  missing.
                </p>
              </div>
            )}

            <div className="mt-6">
              <PortfolioPerformanceSection
                holdings={holdings}
                compositionMeta={{
                  investmentCount: analysis.investmentCount,
                  cashCurrencyCount: analysis.cashCurrencyCount,
                  cashWeightPercent: analysis.cashWeightPercent,
                  largestSymbol:
                    analysis.largestPosition?.holding.symbol ?? null,
                  largestWeightPercent:
                    analysis.largestPosition?.weightPercent ?? null,
                }}
              />
            </div>

            <div className="mt-6">
              <PortfolioScoreDetailSection
                id={SECTION_IDS.portfolioMomentum}
                score={momentumScore}
                title="Scorecard"
                methodology="Momentum Score uses real 1W and 1M portfolio returns from performance history, plus latest-session holding breadth. It never reuses 1D returns as weekly or monthly history, and it is not a buy or sell signal."
              />
            </div>

            {readinessScore ? (
              <div className="mt-6">
                <PortfolioScoreDetailSection
                  id={SECTION_IDS.portfolioReadiness}
                  score={readinessScore}
                  title="Scorecard"
                  methodology="Readiness Score measures data and setup completeness for useful analysis — priced coverage, classification, goal configuration, and history availability. It does not rate investment quality."
                />
              </div>
            ) : null}

            <div className="mt-7">
              <TopPerformersByCategorySection holdings={holdings} />
            </div>

            <PortfolioExposureSection allocation={exposureAllocation} />

            <MarketConsensusSection
              analysis={analysis}
              holdings={holdings}
              userSub={userSub}
            />

            <section
              id="portfolio-allocation"
              className="mt-7 scroll-mt-24 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
              aria-labelledby="portfolio-allocation-heading"
            >
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-blue-50 p-3 text-blue-700">
                  <Layers3 className="h-5 w-5" />
                </div>
                <div>
                  <h2
                    id="portfolio-allocation-heading"
                    className={appSectionTitleClass}
                  >
                    Allocation
                  </h2>
                  <p className={`mt-1.5 ${appSectionMetaClass}`}>
                    Breakdown of valued holdings, including cash where recorded.
                  </p>
                </div>
              </div>

              {hasValuedPositions ? (
                <div className="mt-6 space-y-4">
                  {analysis.valuedPositions.map((position, index) => (
                    <div key={position.holding.id}>
                      <div
                        className={`mb-2 flex items-center justify-between gap-3 ${appSectionBodyClass}`}
                      >
                        <div className="min-w-0">
                          <p className={`truncate ${appTableNameClass}`}>
                            {position.holding.assetType === "cash" ? (
                              position.holding.name
                            ) : (
                              <>
                                {position.holding.symbol}
                                <span aria-hidden="true"> · </span>
                                {position.holding.name}
                              </>
                            )}
                          </p>
                          <p className={appSectionMetaClass}>
                            {formatEur(position.value)}
                          </p>
                        </div>
                        <p className={`shrink-0 ${appTableValueClass}`}>
                          {formatPortfolioPercent(position.weightPercent)}
                        </p>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${allocationBarColor(index)}`}
                          style={{
                            width: `${Math.min(position.weightPercent, 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={`mt-6 ${appSectionMetaClass}`}>
                  Add current prices to your investments to calculate
                  allocation.
                </p>
              )}
            </section>

            <DividendIntelligenceSection
              holdings={holdings}
              quotes={quotes}
              isLoading={dividendsLoading}
              onPolicyOverrideChange={(holdingId, value) => {
                saveHoldings(
                  holdings.map((holding) =>
                    holding.id === holdingId
                      ? { ...holding, distributionPolicyUserOverride: value }
                      : holding,
                  ),
                );
              }}
              onPassiveIncomeEstimateChange={(holdingId, estimate) => {
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

            <CashIntelligenceSection holdings={holdings} />

            <section className="mt-7 grid gap-4 lg:grid-cols-2">
              <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl bg-violet-50 p-3 text-violet-700">
                    <Scale className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className={appSectionTitleClass}>Concentration</h2>
                    <p className={`mt-1.5 ${appSectionMetaClass}`}>
                      Based on actual portfolio weights among valued positions.
                    </p>
                  </div>
                </div>

                {hasValuedPositions ? (
                  <div className="mt-6 space-y-4">
                    <MetricRow
                      label="Largest position"
                      value={
                        analysis.largestPosition
                          ? formatPortfolioPercent(
                              analysis.largestPosition.weightPercent,
                            )
                          : "—"
                      }
                    />
                    <MetricRow
                      label="Top three combined"
                      value={formatPortfolioPercent(
                        analysis.topThreeWeightPercent,
                      )}
                    />
                    <MetricRow label="HHI" value={analysis.hhi.toFixed(3)} />
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className={appCardValueClass}>
                        {concentrationLabel(analysis.concentrationLevel)}
                      </p>
                      <p className={`mt-2 ${appSectionBodyClass}`}>
                        {concentrationExplanation(analysis.concentrationLevel)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className={`mt-6 ${appSectionMetaClass}`}>
                    Concentration metrics require at least one valued position.
                  </p>
                )}
              </article>

              <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className={appSectionTitleClass}>
                      Diversification overview
                    </h2>
                    <p className={`mt-1.5 ${appSectionMetaClass}`}>
                      Only dimensions supported by stored portfolio data.
                    </p>
                  </div>
                </div>

                <div className="mt-6 space-y-5">
                  <div>
                    <p className={appSectionLabelClass}>Asset mix</p>
                    <div className="mt-3 space-y-3">
                      {analysis.assetTypeBreakdown.map((item) => (
                        <MetricRow
                          key={item.label}
                          label={item.label}
                          value={
                            <>
                              {formatEur(item.value)}
                              <span aria-hidden="true"> · </span>
                              {formatPortfolioPercent(item.weightPercent)}
                            </>
                          }
                        />
                      ))}
                    </div>
                  </div>

                  {analysis.cashByCurrency.length > 0 && (
                    <div>
                      <p className={appSectionLabelClass}>Cash by currency</p>
                      <div className="mt-3 space-y-3">
                        {analysis.cashByCurrency.map((item) => (
                          <MetricRow
                            key={item.currency}
                            label={item.currency}
                            value={
                              <>
                                {formatPortfolioCurrency(
                                  item.value,
                                  item.currency,
                                )}
                                <span aria-hidden="true"> · </span>
                                {formatPortfolioPercent(item.weightPercent)}
                              </>
                            }
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </article>
            </section>

            {analysis.unvaluedHoldings.length > 0 && (
              <section className="mt-7 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                <h2 className={appSectionTitleClass}>
                  Excluded from valued totals
                </h2>
                <p className={`mt-1.5 ${appSectionMetaClass}`}>
                  These positions remain visible but are not treated as
                  zero-value investments in allocation calculations.
                </p>
                <div className="mt-5 divide-y divide-slate-200 rounded-2xl border border-slate-200">
                  {analysis.unvaluedHoldings.map((holding) => (
                    <div
                      key={holding.id}
                      className={`flex items-center justify-between gap-3 px-4 py-3.5 ${appSectionBodyClass}`}
                    >
                      <div>
                        <p className={appTableNameClass}>{holding.symbol}</p>
                        <p className={appSectionMetaClass}>{holding.name}</p>
                      </div>
                      <p className="font-semibold text-amber-700">
                        Missing usable price
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section
              className={`mt-7 ${appDarkCardClass} ${appDarkCardPaddingClass}`}
            >
              <p className={appHeroMetricLabelClass}>Observations</p>
              <h2 className={`mt-2 ${appAnalysisDarkTitleClass}`}>
                Portfolio observations
              </h2>
              {analysis.observations.length > 0 ? (
                <ul className={`mt-5 space-y-3 ${appAnalysisDarkBodyClass}`}>
                  {analysis.observations.map((observation) => (
                    <li key={observation} className="flex gap-3">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
                      <span>{observation}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={`mt-5 ${appAnalysisDarkBodyClass}`}>
                  Add valued holdings to generate portfolio observations.
                </p>
              )}
              <p className={`mt-6 ${appAnalysisDarkDisclaimerClass}`}>
                These observations describe portfolio structure only. They are
                not financial advice and do not include buy or sell
                instructions.
              </p>
            </section>
          </>
        )}
      </PageContainer>
      <BottomNavigation />
    </>
  );
}

function MetricRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-3 ${appSectionBodyClass}`}
    >
      <span className={appSectionMetaClass}>{label}</span>
      <span className={appCardValueClass}>{value}</span>
    </div>
  );
}
