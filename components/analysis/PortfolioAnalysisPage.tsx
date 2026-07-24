"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  Banknote,
  BriefcaseBusiness,
  ChartPie,
  Layers3,
  PieChart,
  Scale,
  Sparkles,
  Upload,
} from "lucide-react";
import { DividendIntelligenceSection } from "@/components/analysis/DividendIntelligenceSection";
import { AnalystIntelligenceSection } from "@/components/analysis/AnalystIntelligenceSection";
import BottomNavigation from "@/components/home/BottomNav";
import { AppPageLoading, PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import {
  appCardValueClass,
  appSectionBodyClass,
  appSectionLabelClass,
  appSectionMetaClass,
  appSectionSubtitleClass,
  appSectionTitleClass,
  appTableNameClass,
  appTableValueClass,
} from "@/components/layout/appSurface";
import PortfolioRecoveryBanner from "@/components/PortfolioRecoveryBanner";
import {
  buildPortfolioAnalysis,
  concentrationExplanation,
  concentrationLabel,
  formatPortfolioCurrency,
  formatPortfolioPercent,
} from "@/lib/client/portfolioAnalysis";
import { usePortfolioDividends } from "@/lib/client/usePortfolioDividends";
import { usePortfolioAnalyst } from "@/lib/client/usePortfolioAnalyst";
import { useUserPortfolio } from "@/lib/client/useUserPortfolio";

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
  const {
    holdings,
    portfolioReady,
    userSub,
    recoveryOffer,
    recoverPortfolio,
    dismissRecovery,
  } = useUserPortfolio();

  const { snapshot: dividendSnapshot, isLoading: dividendsLoading } =
    usePortfolioDividends(holdings, userSub, holdings.length > 0);
  const { snapshot: analystSnapshot, isLoading: analystLoading } =
    usePortfolioAnalyst(holdings, userSub, holdings.length > 0);

  const analysis = useMemo(
    () => buildPortfolioAnalysis(holdings),
    [holdings],
  );

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
          subtitle="Understand performance, risk, allocation and portfolio trends."
          stats={
            <p className={`${appSectionMetaClass} text-slate-300`}>
              Last portfolio update: {formatUpdatedAt(analysis.lastUpdatedAt)}
            </p>
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
            <section className="rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-12">
              <BriefcaseBusiness className="mx-auto h-10 w-10 text-slate-300" />
              <h2 className={`mt-4 ${appSectionTitleClass}`}>No portfolio to analyse yet</h2>
              <p className={`mx-auto mt-3 max-w-xl ${appSectionSubtitleClass}`}>
                Add holdings manually or import a portfolio to see allocation,
                concentration, and diversification insights here.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Link
                  href="/upload"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white"
                >
                  <Upload className="h-4 w-4" />
                  Upload portfolio
                </Link>
                <Link
                  href="/portfolio"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold"
                >
                  Open portfolio
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </section>
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
                    excluded from valued totals because a usable current price
                    is missing.
                  </p>
                </div>
              )}

              <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <SummaryCard
                  icon={<PieChart className="h-5 w-5" />}
                  label="Total portfolio value"
                  value={
                    hasValuedPositions
                      ? formatPortfolioCurrency(analysis.totalValue)
                      : "—"
                  }
                  detail={
                    hasValuedPositions
                      ? `${analysis.valuedPositions.length} valued positions`
                      : "No valued positions"
                  }
                />
                <SummaryCard
                  icon={<BriefcaseBusiness className="h-5 w-5" />}
                  label="Investment holdings"
                  value={String(analysis.investmentCount)}
                  detail="Based on stored asset type"
                />
                <SummaryCard
                  icon={<Banknote className="h-5 w-5" />}
                  label="Cash currencies"
                  value={String(analysis.cashCurrencyCount)}
                  detail={
                    analysis.cashWeightPercent > 0
                      ? `${formatPortfolioPercent(analysis.cashWeightPercent)} of valued portfolio`
                      : "No cash recorded"
                  }
                />
                <SummaryCard
                  icon={<ChartPie className="h-5 w-5" />}
                  label="Largest position"
                  value={
                    analysis.largestPosition
                      ? analysis.largestPosition.holding.assetType === "cash"
                        ? analysis.largestPosition.holding.symbol
                        : analysis.largestPosition.holding.symbol
                      : "—"
                  }
                  detail={
                    analysis.largestPosition
                      ? `${formatPortfolioPercent(analysis.largestPosition.weightPercent)} of valued portfolio`
                      : "No valued positions"
                  }
                />
              </section>

              <section className="mt-7 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl bg-blue-50 p-3 text-blue-700">
                    <Layers3 className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className={appSectionTitleClass}>Allocation</h2>
                    <p className={`mt-1.5 ${appSectionMetaClass}`}>
                      Breakdown of valued holdings, including cash where recorded.
                    </p>
                  </div>
                </div>

                {hasValuedPositions ? (
                  <div className="mt-6 space-y-4">
                    {analysis.valuedPositions.map((position, index) => (
                      <div key={position.holding.id}>
                        <div className={`mb-2 flex items-center justify-between gap-3 ${appSectionBodyClass}`}>
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
                              {formatPortfolioCurrency(position.value)}
                            </p>
                          </div>
                          <p className={`shrink-0 ${appTableValueClass}`}>
                            {formatPortfolioPercent(position.weightPercent)}
                          </p>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full ${allocationBarColor(index)}`}
                            style={{ width: `${Math.min(position.weightPercent, 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={`mt-6 ${appSectionMetaClass}`}>
                    Add current prices to your investments to calculate allocation.
                  </p>
                )}
              </section>

              <DividendIntelligenceSection
                snapshot={dividendSnapshot}
                isLoading={dividendsLoading}
              />

              <AnalystIntelligenceSection
                snapshot={analystSnapshot}
                isLoading={analystLoading}
              />

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
                        value={formatPortfolioPercent(analysis.topThreeWeightPercent)}
                      />
                      <MetricRow
                        label="HHI"
                        value={analysis.hhi.toFixed(3)}
                      />
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
                      <h2 className={appSectionTitleClass}>Diversification overview</h2>
                      <p className={`mt-1.5 ${appSectionMetaClass}`}>
                        Only dimensions supported by stored portfolio data.
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 space-y-5">
                    <div>
                      <p className={appSectionLabelClass}>
                        Asset mix
                      </p>
                      <div className="mt-3 space-y-3">
                        {analysis.assetTypeBreakdown.map((item) => (
                          <MetricRow
                            key={item.label}
                            label={item.label}
                            value={
                              <>
                                {formatPortfolioCurrency(item.value)}
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
                        <p className={appSectionLabelClass}>
                          Cash by currency
                        </p>
                        <div className="mt-3 space-y-3">
                          {analysis.cashByCurrency.map((item) => (
                            <MetricRow
                              key={item.currency}
                              label={item.currency}
                              value={
                                <>
                                  {formatPortfolioCurrency(item.value, item.currency)}
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
                  <h2 className={appSectionTitleClass}>Excluded from valued totals</h2>
                  <p className={`mt-1.5 ${appSectionMetaClass}`}>
                    These positions remain visible but are not treated as zero-value
                    investments in allocation calculations.
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

              <section className="mt-7 rounded-[28px] bg-slate-950 p-6 text-white sm:p-8">
                <p className={appSectionLabelClass}>
                  Observations
                </p>
                <h2 className={`mt-2 ${appSectionTitleClass} text-white`}>Portfolio observations</h2>
                {analysis.observations.length > 0 ? (
                  <ul className={`mt-5 space-y-3 ${appSectionBodyClass} text-slate-200`}>
                    {analysis.observations.map((observation) => (
                      <li key={observation} className="flex gap-3">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
                        <span>{observation}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className={`mt-5 ${appSectionBodyClass} text-slate-300`}>
                    Add valued holdings to generate portfolio observations.
                  </p>
                )}
                <p className="mt-6 text-xs leading-5 text-slate-400">
                  These observations describe portfolio structure only. They are
                  not financial advice and do not include buy or sell instructions.
                </p>
              </section>
            </>
          )}
      </PageContainer>
      <BottomNavigation />
    </>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
        {icon}
      </div>
      <p className={`mt-4 ${appSectionLabelClass}`}>
        {label}
      </p>
      <p className={`mt-2 ${appCardValueClass}`}>{value}</p>
      {detail && <p className={`mt-1.5 ${appSectionMetaClass}`}>{detail}</p>}
    </article>
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
    <div className={`flex items-center justify-between gap-3 ${appSectionBodyClass}`}>
      <span className={appSectionMetaClass}>{label}</span>
      <span className={appCardValueClass}>{value}</span>
    </div>
  );
}
