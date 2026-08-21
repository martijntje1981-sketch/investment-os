"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { History, Plus, Wallet } from "lucide-react";
import { ExportPortfolioButton } from "@/components/export/ExportPortfolioButton";

import { PortfolioPerformanceChart } from "@/components/analysis/performance/PortfolioPerformanceChart";
import { ManageContributionsDialog } from "@/components/contributions/ManageContributionsDialog";
import {
  AppPageLoading,
  PageContainer,
} from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { AuthenticatedFourQuestionsNav } from "@/components/fourQuestions/AuthenticatedFourQuestionsNav";
import { PageRelatedLinks } from "@/components/layout/PageRelatedLinks";
import {
  appCardValueClass,
  appSectionBodyClass,
  appSectionLabelClass,
  appSectionMetaClass,
  appSectionTitleClass,
} from "@/components/layout/appSurface";
import { EmptyPortfolioGuide } from "@/components/onboarding/EmptyPortfolioGuide";
import { PortfolioTimelineList } from "@/components/portfolioHistory/PortfolioTimelineList";
import { useBaseCurrencyDisplay } from "@/lib/client/baseCurrencyDisplay";
import { CONTRIBUTIONS_ADD_LABEL } from "@/lib/client/contributionsCopy";
import { formatContributionBaseAmount } from "@/lib/client/contributionsFormat";
import {
  PORTFOLIO_EXPORT_EMPTY_MESSAGE,
  PORTFOLIO_EXPORT_FAILURE_MESSAGE,
  PORTFOLIO_EXPORT_SUCCESS_MESSAGE,
} from "@/lib/client/portfolioExport";
import { runPortfolioExport } from "@/lib/client/runPortfolioExport";
import {
  buildValuedPositions,
  formatPortfolioPercent,
} from "@/lib/client/portfolioAnalysis";
import { buildPortfolioPerformance } from "@/lib/client/portfolioPerformance";
import { useGoalProgress } from "@/lib/client/useGoalProgress";
import { usePortfolioContributions } from "@/lib/client/usePortfolioContributions";
import { usePortfolioDividends } from "@/lib/client/usePortfolioDividends";
import { usePortfolioPerformanceHistory } from "@/lib/client/usePortfolioPerformanceHistory";
import { useUserGoal } from "@/lib/client/useUserGoal";
import { useUserPortfolio } from "@/lib/client/useUserPortfolio";
import {
  ANALYSIS_PATH,
  holdingDetailPath,
  PORTFOLIO_PATH,
  REVIEW_PATH,
} from "@/lib/navigation/appRoutes";
import { PAGE_PURPOSE } from "@/lib/navigation/productArchitecture";
import {
  buildPortfolioTimeline,
  resolveHistorySummaryPresentation,
  timelineToGoalHistoryPoints,
} from "@/lib/services/portfolio/timeline";

const PortfolioEvolutionSection = dynamic(
  () =>
    import("@/components/portfolioEvolution/PortfolioEvolutionSection").then(
      (mod) => mod.PortfolioEvolutionSection,
    ),
  { ssr: false },
);

function SummaryMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 border-t border-slate-200/80 pt-3 first:border-t-0 first:pt-0 sm:border-t-0 sm:border-l sm:border-slate-200/80 sm:px-4 sm:pt-0 sm:first:border-l-0 sm:first:pl-0">
      <p className={appSectionLabelClass}>{label}</p>
      <p className={`mt-1 truncate ${appCardValueClass} text-slate-950`}>
        {value}
      </p>
    </div>
  );
}

export default function PortfolioHistoryPage() {
  const { formatEur, convertToEur, convertEur, baseCurrency } =
    useBaseCurrencyDisplay();
  const { holdings, portfolioReady, userSub } = useUserPortfolio();
  const { goal, hasSavedGoal } = useUserGoal();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const performance = useMemo(
    () => buildPortfolioPerformance(holdings),
    [holdings],
  );
  const { valuedPositions, unvaluedHoldings } = useMemo(
    () => buildValuedPositions(holdings),
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

  const {
    entries,
    summary,
    status,
    error,
    mutationError,
    isMutating,
    reload,
    saveEntry,
    removeEntry,
    hasEntries,
  } = usePortfolioContributions(
    performance.totalValue,
    performance.totalValueAvailable,
    true,
    contributionHoldings,
  );

  const history = usePortfolioPerformanceHistory(holdings, "1Y");
  const { snapshot: dividendSnapshot } = usePortfolioDividends(
    holdings,
    userSub,
    holdings.length > 0,
  );

  const dividendPayments = useMemo(() => {
    const next = dividendSnapshot?.nextPayment;
    if (!next?.paymentDate) return [];
    return [
      {
        id: `next-${next.symbol}-${next.paymentDate}`,
        paymentDate: next.paymentDate,
        holdingSymbol: next.symbol,
        amountBase: next.amountEur,
        title: `Upcoming dividend · ${next.symbol}`,
      },
    ];
  }, [dividendSnapshot]);

  const timeline = useMemo(
    () =>
      buildPortfolioTimeline({
        entries,
        contributionSummary: summary,
        chartPoints: history.data?.chartPoints ?? null,
        currentPortfolioValue: performance.totalValueAvailable
          ? performance.totalValue
          : null,
        portfolioValueAvailable: performance.totalValueAvailable,
        startingPortfolioValue: history.data?.startingValue ?? null,
        endingPortfolioValue: history.data?.endingValue ?? null,
        investmentReturn: history.data?.investmentReturn ?? null,
        investmentReturnPercent: history.data?.investmentReturnPercent ?? null,
        periodLabel: history.data ? "1 year" : null,
        dividendPayments,
      }),
    [
      dividendPayments,
      entries,
      history.data,
      performance.totalValue,
      performance.totalValueAvailable,
      summary,
    ],
  );

  const goalProgress = useGoalProgress({
    holdings,
    goal,
    hasSavedGoal,
    portfolioHistory: timelineToGoalHistoryPoints(timeline),
  });

  const formatContributionAmount = (amount: number) =>
    formatContributionBaseAmount(amount, formatEur, convertToEur);

  if (!portfolioReady) {
    return <AppPageLoading />;
  }

  async function handleExport() {
    if (isExporting) return;
    setExportError(null);
    setExportSuccess(null);
    setIsExporting(true);
    try {
      const ok = await runPortfolioExport({
        holdings,
        entries,
        portfolioValueEur: performance.totalValue,
        portfolioValueAvailable: performance.totalValueAvailable,
        baseCurrency,
        convertEur,
        chartPoints: history.data?.chartPoints ?? null,
        goal,
        hasSavedGoal,
        currentProgressPercent: goalProgress.currentProgressPercent,
        remainingAmount: goalProgress.remainingAmount,
        statusLabel: goalProgress.status,
      });
      if (!ok) {
        setExportError(PORTFOLIO_EXPORT_EMPTY_MESSAGE);
        return;
      }
      setExportSuccess(PORTFOLIO_EXPORT_SUCCESS_MESSAGE);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : PORTFOLIO_EXPORT_FAILURE_MESSAGE;
      setExportError(
        message === PORTFOLIO_EXPORT_EMPTY_MESSAGE
          ? message
          : PORTFOLIO_EXPORT_FAILURE_MESSAGE,
      );
    } finally {
      setIsExporting(false);
    }
  }

  const growthLabel =
    timeline.summary.portfolioGrowth != null
      ? formatEur(timeline.summary.portfolioGrowth)
      : "—";
  const netLabel = formatContributionAmount(timeline.summary.netContributions);
  const currentValueLabel =
    timeline.summary.portfolioValueAvailable &&
    timeline.summary.currentPortfolioValue != null
      ? formatEur(timeline.summary.currentPortfolioValue)
      : "Unavailable";
  const historySummary = resolveHistorySummaryPresentation(timeline.summary);
  const historySummaryValues: Record<string, string> = {
    value_change: growthLabel,
    recorded_net: netLabel,
    current_value: currentValueLabel,
  };

  return (
    <>
      <PageContainer stackClassName="gap-5 md:gap-7">
        <PageHero
          title="Portfolio History"
          subtitle="How your portfolio developed, what you invested, and what changed."
          backToDashboard
          actions={
            <>
              <button
                type="button"
                onClick={() => setDialogOpen(true)}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-brand-navy transition hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-navy-hero"
              >
                <Plus className="h-4 w-4" aria-hidden />
                Add activity
              </button>
              <ExportPortfolioButton
                variant="hero"
                disabled={isExporting}
                onExport={handleExport}
              />
            </>
          }
        />

        <PageRelatedLinks
          purpose={PAGE_PURPOSE.history}
          links={[
            { href: REVIEW_PATH, label: "Your Review" },
            { href: ANALYSIS_PATH, label: "Open Analysis" },
          ]}
        />

        <AuthenticatedFourQuestionsNav />

        {exportError ? (
          <p className={appSectionBodyClass} role="alert">
            {exportError}
          </p>
        ) : null}
        {exportSuccess ? (
          <p className={appSectionBodyClass} role="status">
            {exportSuccess}
          </p>
        ) : null}

        <section
          aria-labelledby="portfolio-history-chart-title"
          className="min-w-0 overflow-hidden rounded-[28px] border border-slate-200/80 bg-white"
        >
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-6">
            <div className="min-w-0">
              <h2
                id="portfolio-history-chart-title"
                className={appSectionTitleClass}
              >
                Portfolio development
              </h2>
              <p className={`mt-1 ${appSectionMetaClass}`}>
                {timeline.summary.periodLabel
                  ? `${timeline.summary.periodLabel} · verified market history`
                  : "Verified market history when available"}
              </p>
            </div>
            <History className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" aria-hidden />
          </div>
          <div className="px-3 py-4 sm:px-5 sm:py-5">
            {history.isLoading ? (
              <div
                className="h-[190px] animate-pulse rounded-2xl bg-slate-100 sm:h-[210px]"
                aria-hidden
              />
            ) : (
              <PortfolioPerformanceChart
                points={timeline.chartPoints}
                hasSeries={timeline.hasValueSeries}
                emptyMessage="Portfolio development appears here once daily market history is available for your holdings."
              />
            )}
          </div>

          <div className="grid min-w-0 gap-4 border-t border-slate-100 px-4 py-4 sm:grid-cols-3 sm:gap-0 sm:px-6">
            {historySummary.metrics.map((metric) => (
              <SummaryMetric
                key={metric.id}
                label={metric.label}
                value={historySummaryValues[metric.id] ?? "—"}
              />
            ))}
          </div>
        </section>

        <PortfolioEvolutionSection
          holdings={holdings}
          entries={entries}
          contributionBasisReliable={summary.contributionBasisReliable}
          yearChartPoints={history.data?.chartPoints ?? null}
        />

        <section
          aria-labelledby="portfolio-history-timeline-title"
          className="min-w-0 overflow-hidden rounded-[28px] border border-slate-200/80 bg-white"
        >
          <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-6">
            <div className="min-w-0">
              <h2
                id="portfolio-history-timeline-title"
                className={appSectionTitleClass}
              >
                Timeline
              </h2>
              <p className={`mt-1 ${appSectionMetaClass}`}>
                Contributions, withdrawals, and milestones
              </p>
            </div>
            {status === "ready" ? (
              <button
                type="button"
                onClick={() => setDialogOpen(true)}
                className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
              >
                <Plus className="h-4 w-4" aria-hidden />
                {hasEntries ? "Add activity" : CONTRIBUTIONS_ADD_LABEL}
              </button>
            ) : null}
          </div>

          <div className="px-4 py-5 sm:px-6">
            {status === "loading" ? (
              <div className="h-32 animate-pulse rounded-2xl bg-slate-100" />
            ) : status === "error" ? (
              <div className="space-y-3">
                <p className={appSectionBodyClass} role="alert">
                  {error ?? "Could not load portfolio history."}
                </p>
                <button
                  type="button"
                  onClick={() => void reload()}
                  className="inline-flex min-h-[40px] items-center text-sm font-semibold text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                >
                  Retry
                </button>
              </div>
            ) : (
              <PortfolioTimelineList
                events={timeline.events}
                formatAmount={formatContributionAmount}
              />
            )}
          </div>
        </section>

        <section
          aria-labelledby="portfolio-history-holdings-title"
          className="min-w-0 overflow-hidden rounded-[28px] border border-slate-200/80 bg-white"
        >
          <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-6">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-slate-700" aria-hidden />
                <h2
                  id="portfolio-history-holdings-title"
                  className={appSectionTitleClass}
                >
                  Current holdings
                </h2>
              </div>
            </div>
            <Link
              href={PORTFOLIO_PATH}
              className="inline-flex min-h-[44px] shrink-0 items-center text-sm font-semibold text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              Manage portfolio
            </Link>
          </div>

          <div className="px-4 py-5 sm:px-6">
            {holdings.length === 0 ? (
              <EmptyPortfolioGuide
                density="compact"
                title="No holdings yet"
                body="Add or import holdings on the Portfolio page. History still tracks recorded contributions independently."
                className="border-0 shadow-none"
              />
            ) : (
              <ul className="divide-y divide-slate-100">
                {valuedPositions.map(({ holding, value, weightPercent }) => {
                  const detailHref =
                    holding.assetType === "cash"
                      ? null
                      : holdingDetailPath(holding.symbol);
                  const content = (
                    <>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900">
                          {holding.symbol}
                          <span className="ml-2 font-medium text-slate-600">
                            {holding.name}
                          </span>
                        </p>
                        <p className={`mt-1 ${appSectionMetaClass}`}>
                          {holding.quantity.toLocaleString("en-GB")}
                          {holding.assetType === "cash" ? " cash" : " units"}
                          {` · ${formatPortfolioPercent(weightPercent)}`}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-semibold text-slate-900">
                        {formatEur(value)}
                      </p>
                    </>
                  );

                  if (detailHref) {
                    return (
                      <li key={holding.id}>
                        <Link
                          href={detailHref}
                          className="flex items-start justify-between gap-3 rounded-xl px-1 py-3 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                        >
                          {content}
                        </Link>
                      </li>
                    );
                  }

                  return (
                    <li
                      key={holding.id}
                      className="flex items-start justify-between gap-3 px-1 py-3"
                    >
                      {content}
                    </li>
                  );
                })}
                {unvaluedHoldings.map((holding) => (
                  <li
                    key={holding.id}
                    className="flex items-start justify-between gap-3 px-1 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">
                        {holding.symbol}
                        <span className="ml-2 font-medium text-slate-600">
                          {holding.name}
                        </span>
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-slate-500">
                      Unavailable
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </PageContainer>

      {dialogOpen ? (
        <ManageContributionsDialog
          entries={entries}
          summary={summary}
          holdings={contributionHoldings}
          isMutating={isMutating}
          mutationError={mutationError}
          portfolioValueAvailable={performance.totalValueAvailable}
          onClose={() => setDialogOpen(false)}
          onSave={saveEntry}
          onDelete={removeEntry}
        />
      ) : null}
    </>
  );
}
