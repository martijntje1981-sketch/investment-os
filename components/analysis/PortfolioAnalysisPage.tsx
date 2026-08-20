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
import { CryptoIntelligenceSection } from "@/components/analysis/CryptoIntelligenceSection";
import { BondsRatesSection } from "@/components/analysis/BondsRatesSection";
import { PortfolioExposureSection } from "@/components/analysis/PortfolioExposureSection";
import { PortfolioXRaySection } from "@/components/analysis/PortfolioXRaySection";
import { ScenarioStressSection } from "@/components/analysis/ScenarioStressSection";
import { PortfolioPerformanceSection } from "@/components/analysis/performance/PortfolioPerformanceSection";
import { MarketConsensusSection } from "@/components/analysis/marketConsensus/MarketConsensusSection";
import { TopPerformersByCategorySection } from "@/components/analysis/TopPerformersByCategorySection";
import { AnalysisFourQuestionsNav } from "@/components/analysis/fourQuestions/AnalysisFourQuestionsNav";
import { AnalysisOnTrackGateway } from "@/components/analysis/fourQuestions/AnalysisOnTrackGateway";
import { AnalysisQuestionSection } from "@/components/analysis/fourQuestions/AnalysisQuestionSection";
import { AuthenticatedFourQuestionsNav } from "@/components/fourQuestions/AuthenticatedFourQuestionsNav";
import { readNewsCache } from "@/lib/client/portfolioNews";
import { buildPortfolioExposureAllocation } from "@/lib/services/classification";
import { selectOfficialRatePolicyContext } from "@/lib/services/news/officialMacro";
import { useProductAccess } from "@/lib/client/useProductAccess";
import {
  AppPageLoading,
  PageContainer,
} from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { PageRelatedLinks } from "@/components/layout/PageRelatedLinks";
import { ExportPortfolioButton } from "@/components/export/ExportPortfolioButton";
import { runPortfolioExport } from "@/lib/client/runPortfolioExport";
import { usePortfolioContributions } from "@/lib/client/usePortfolioContributions";
import {
  PORTFOLIO_HISTORY_PATH,
  PORTFOLIO_PATH,
  REVIEW_PATH,
} from "@/lib/navigation/appRoutes";
import { PAGE_PURPOSE } from "@/lib/navigation/productArchitecture";
import {
  appAnalysisDarkBodyClass,
  appAnalysisDarkDisclaimerClass,
  appAnalysisDarkTitleClass,
  appCardClass,
  appCardPaddingClass,
  appCardValueClass,
  appDarkCardClass,
  appDarkCardPaddingClass,
  appDashboardDarkMetaClass,
  appHeroGhostButtonClass,
  appHeroMetricLabelClass,
  appSectionBodyClass,
  appSectionLabelClass,
  appSectionMetaClass,
  appSectionTitleClass,
  appTableNameClass,
  appTableValueClass,
  appTextLinkClass,
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
import { buildPortfolioPerformance } from "@/lib/client/portfolioPerformance";
import { usePortfolioDividends } from "@/lib/client/usePortfolioDividends";
import { useUserPortfolio } from "@/lib/client/useUserPortfolio";
import { useUserGoal } from "@/lib/client/useUserGoal";
import { useGoalProgress } from "@/lib/client/useGoalProgress";
import { useGoalRealityCheck } from "@/lib/client/useGoalRealityCheck";
import { DASHBOARD_DEEP_LINKS } from "@/lib/navigation/deepLinks";
import { ANALYSIS_FOUR_QUESTION_NAV } from "@/lib/services/fourQuestions/analysisSections";
import { resolveIntelligenceScope } from "@/lib/services/intelligenceScope";

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
    "bg-brand-navy",
    "bg-blue-600",
    "bg-emerald-600",
    "bg-amber-500",
    "bg-slate-600",
    "bg-sky-600",
  ];
  return palette[index % palette.length];
}

const [Q1, Q2, Q3, Q4] = ANALYSIS_FOUR_QUESTION_NAV;

export default function PortfolioAnalysisPage() {
  const { formatEur, baseCurrency, convertEur } = useBaseCurrencyDisplay();
  const {
    holdings,
    portfolioReady,
    userSub,
    recoveryOffer,
    recoverPortfolio,
    dismissRecovery,
    saveHoldings,
  } = useUserPortfolio();
  const productAccess = useProductAccess(portfolioReady && Boolean(userSub));

  const { goal, hasSavedGoal, persistGoal } = useUserGoal();
  const goalProgress = useGoalProgress({ holdings, goal, hasSavedGoal });
  const { realityCheck } = useGoalRealityCheck(
    holdings,
    goal,
    holdings.length > 0 && hasSavedGoal,
  );

  // Foundation only — default complete; no pricing/gating hide logic yet.
  const intelligenceScope = useMemo(
    () => resolveIntelligenceScope().scope,
    [],
  );

  const { quotes, isLoading: dividendsLoading } = usePortfolioDividends(
    holdings,
    userSub,
    holdings.length > 0,
  );

  const analysis = useMemo(() => buildPortfolioAnalysis(holdings), [holdings]);
  const performance = useMemo(
    () => buildPortfolioPerformance(holdings),
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
  const { entries: contributionEntries } = usePortfolioContributions(
    performance.totalValue,
    performance.totalValueAvailable,
    holdings.length > 0,
    contributionHoldings,
  );

  const exposureAllocation = useMemo(
    () => buildPortfolioExposureAllocation(holdings),
    [holdings],
  );

  const ratePolicyContext = useMemo(() => {
    if (!userSub || !exposureAllocation.fixedIncome) return null;
    const cached = readNewsCache(userSub);
    if (!cached?.response) return null;
    return selectOfficialRatePolicyContext([
      ...cached.response.portfolioNews,
      ...cached.response.macroNews,
    ]);
  }, [exposureAllocation.fixedIncome, userSub]);

  if (!portfolioReady) {
    return <AppPageLoading />;
  }

  const hasHoldings = holdings.length > 0;
  const hasValuedPositions = analysis.valuedPositions.length > 0;

  return (
    <>
      <PageContainer>
        <PageHero
          title="Analysis"
          subtitle="Explore your portfolio through four questions — explanation, evidence and tools."
          backToDashboard
          stats={
            <p className={`${appDashboardDarkMetaClass} mt-0`}>
              Updated {formatUpdatedAt(analysis.lastUpdatedAt)}
            </p>
          }
          actions={
            <div className="flex flex-wrap gap-2">
              {hasHoldings ? (
                <ExportPortfolioButton
                  onExport={() =>
                    runPortfolioExport({
                      holdings,
                      entries: contributionEntries,
                      portfolioValueEur: performance.totalValue,
                      portfolioValueAvailable: performance.totalValueAvailable,
                      baseCurrency,
                      convertEur,
                    })
                  }
                  className="border border-white/25 bg-white/10 text-white hover:bg-white/15"
                />
              ) : null}
              <Link
                href={DASHBOARD_DEEP_LINKS.scorecard}
                className={appHeroGhostButtonClass}
              >
                Portfolio Scorecard
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          }
        />

        <PageRelatedLinks
          purpose={PAGE_PURPOSE.analysis}
          links={[
            { href: PORTFOLIO_HISTORY_PATH, label: "Portfolio History" },
            { href: PORTFOLIO_PATH, label: "Open Holdings" },
            { href: REVIEW_PATH, label: "Your Review" },
          ]}
        />

        <AuthenticatedFourQuestionsNav className="mt-4" />

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
          <div data-intelligence-scope={intelligenceScope}>
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

            <AnalysisFourQuestionsNav />

            <AnalysisQuestionSection item={Q1}>
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
              <TopPerformersByCategorySection holdings={holdings} />
              <p className={appSectionMetaClass}>
                For the full timeline, open{" "}
                <Link href={PORTFOLIO_HISTORY_PATH} className={appTextLinkClass}>
                  Portfolio History
                </Link>
                .
              </p>
            </AnalysisQuestionSection>

            <AnalysisQuestionSection item={Q2}>
              <PortfolioExposureSection
                allocation={exposureAllocation}
                showSubgroups={productAccess.intelligenceDepth === "complete"}
                ratePolicyContext={ratePolicyContext}
              />
              <BondsRatesSection
                allocation={exposureAllocation}
                holdings={holdings}
                ratePolicyContext={ratePolicyContext}
                intelligenceDepth={productAccess.intelligenceDepth}
              />
              <PortfolioXRaySection holdings={holdings} />
              <CryptoIntelligenceSection holdings={holdings} userSub={userSub} />

              <section
                id="portfolio-allocation"
                className={`scroll-mt-24 ${appCardClass} ${appCardPaddingClass}`}
                aria-labelledby="portfolio-allocation-heading"
              >
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl bg-brand-soft p-3 text-brand-navy">
                    <Layers3 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3
                      id="portfolio-allocation-heading"
                      className={appSectionTitleClass}
                    >
                      Allocation
                    </h3>
                    <p className={`mt-1 ${appSectionMetaClass}`}>
                      Valued holdings, including cash.
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

              <section className="grid gap-4 lg:grid-cols-2">
                <article className={`${appCardClass} ${appCardPaddingClass}`}>
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
                      <Scale className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className={appSectionTitleClass}>Concentration</h3>
                      <p className={`mt-1 ${appSectionMetaClass}`}>
                        Largest positions among valued holdings.
                      </p>
                    </div>
                  </div>

                  {hasValuedPositions ? (
                    <div className="mt-5 space-y-3">
                      <p className={appCardValueClass}>
                        {concentrationLabel(analysis.concentrationLevel)}
                      </p>
                      <p className={appSectionBodyClass}>
                        {concentrationExplanation(analysis.concentrationLevel)}
                      </p>
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
                    </div>
                  ) : (
                    <p className={`mt-5 ${appSectionMetaClass}`}>
                      Needs at least one valued position.
                    </p>
                  )}
                </article>

                <article className={`${appCardClass} ${appCardPaddingClass}`}>
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className={appSectionTitleClass}>Diversification</h3>
                      <p className={`mt-1 ${appSectionMetaClass}`}>
                        Asset mix from your stored holdings.
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
                <section className={`${appCardClass} ${appCardPaddingClass}`}>
                  <h3 className={appSectionTitleClass}>
                    Excluded from valued totals
                  </h3>
                  <p className={`mt-1 ${appSectionMetaClass}`}>
                    Visible holdings without a usable price — not counted as
                    zero.
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
                className={`${appDarkCardClass} ${appDarkCardPaddingClass}`}
              >
                <p className={appHeroMetricLabelClass}>Observations</p>
                <h3 className={`mt-2 ${appAnalysisDarkTitleClass}`}>
                  Portfolio observations
                </h3>
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
            </AnalysisQuestionSection>

            <AnalysisQuestionSection item={Q3}>
              <AnalysisOnTrackGateway
                progress={goalProgress}
                goal={goal}
                realityCheck={realityCheck}
              />
            </AnalysisQuestionSection>

            <AnalysisQuestionSection item={Q4}>
              <ScenarioStressSection
                holdings={holdings}
                goal={goal}
                hasSavedGoal={hasSavedGoal}
                onPersistGoal={persistGoal}
                productAccess={productAccess}
              />
              <MarketConsensusSection
                analysis={analysis}
                holdings={holdings}
                userSub={userSub}
              />
            </AnalysisQuestionSection>
          </div>
        )}
      </PageContainer>
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
