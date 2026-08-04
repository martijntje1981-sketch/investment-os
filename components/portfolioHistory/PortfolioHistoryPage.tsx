"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Download,
  History,
  Plus,
  Wallet,
} from "lucide-react";

import { ManageContributionsDialog } from "@/components/contributions/ManageContributionsDialog";
import BottomNavigation from "@/components/home/BottomNav";
import {
  AppPageLoading,
  PageContainer,
} from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import {
  appCardValueClass,
  appSectionBodyClass,
  appSectionLabelClass,
  appSectionMetaClass,
  appSectionTitleClass,
} from "@/components/layout/appSurface";
import { EmptyPortfolioGuide } from "@/components/onboarding/EmptyPortfolioGuide";
import { useBaseCurrencyDisplay } from "@/lib/client/baseCurrencyDisplay";
import {
  CONTRIBUTIONS_ADD_LABEL,
  CONTRIBUTIONS_EXPLANATORY_COPY,
} from "@/lib/client/contributionsCopy";
import {
  formatContributionBaseAmount,
  formatContributionEntryDate,
} from "@/lib/client/contributionsFormat";
import {
  buildValuedPositions,
  formatPortfolioPercent,
} from "@/lib/client/portfolioAnalysis";
import {
  activityTypeLabel,
  downloadPortfolioHistoryWorkbook,
  mapHoldingsForHistoryExport,
  PORTFOLIO_HISTORY_EMPTY_MESSAGE,
  PORTFOLIO_HISTORY_EXPORT_FAILURE_MESSAGE,
  PORTFOLIO_HISTORY_EXPORT_SUCCESS_MESSAGE,
} from "@/lib/client/portfolioHistoryExport";
import { buildPortfolioPerformance } from "@/lib/client/portfolioPerformance";
import { usePortfolioContributions } from "@/lib/client/usePortfolioContributions";
import { useUserPortfolio } from "@/lib/client/useUserPortfolio";
import { holdingDetailPath, PORTFOLIO_PATH } from "@/lib/navigation/appRoutes";
import { formatContributionDestinationLines } from "@/lib/services/contributions/destination";
import type { PortfolioContributionEntry } from "@/lib/services/contributions/types";

function formatOriginalAmount(entry: PortfolioContributionEntry): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: entry.currency,
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(entry.amount);
}

function HistorySkeleton() {
  return (
    <div className="space-y-4" aria-hidden>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />
        <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />
        <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />
        <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />
      </div>
      <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />
    </div>
  );
}

function SummaryMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
      <p className={appSectionLabelClass}>{label}</p>
      <p className={`mt-1 truncate ${appCardValueClass} text-slate-900`}>
        {value}
      </p>
    </div>
  );
}

export default function PortfolioHistoryPage() {
  const { formatEur, convertToEur, convertEur, baseCurrency } =
    useBaseCurrencyDisplay();
  const { holdings, portfolioReady } = useUserPortfolio();
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

  const formatContributionAmount = (amount: number) =>
    formatContributionBaseAmount(amount, formatEur, convertToEur);

  const exportHoldings = useMemo(
    () =>
      mapHoldingsForHistoryExport(
        holdings,
        valuedPositions.map((position) => ({
          ...position,
          value: convertEur(position.value) ?? position.value,
        })),
        unvaluedHoldings,
      ),
    [convertEur, holdings, unvaluedHoldings, valuedPositions],
  );

  if (!portfolioReady) {
    return <AppPageLoading />;
  }

  function handleExport() {
    if (isExporting) {
      return;
    }
    setExportError(null);
    setExportSuccess(null);

    if (!hasEntries || entries.length === 0) {
      setExportError(PORTFOLIO_HISTORY_EMPTY_MESSAGE);
      return;
    }

    setIsExporting(true);
    try {
      downloadPortfolioHistoryWorkbook({
        summary,
        entries,
        holdings: exportHoldings,
        portfolioBaseCurrency: baseCurrency,
        portfolioValueAvailable: performance.totalValueAvailable,
      });
      setExportSuccess(PORTFOLIO_HISTORY_EXPORT_SUCCESS_MESSAGE);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : PORTFOLIO_HISTORY_EXPORT_FAILURE_MESSAGE;
      setExportError(
        message === PORTFOLIO_HISTORY_EMPTY_MESSAGE
          ? message
          : PORTFOLIO_HISTORY_EXPORT_FAILURE_MESSAGE,
      );
    } finally {
      setIsExporting(false);
    }
  }

  const currentValueLabel =
    performance.totalValueAvailable && summary.currentValue != null
      ? formatEur(summary.currentValue)
      : "Unavailable";

  return (
    <>
      <PageContainer>
        <PageHero
          title="Portfolio History"
          subtitle="Cash contributions, withdrawals, and your current holdings snapshot."
          backToDashboard
          actions={
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setDialogOpen(true)}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-brand-navy transition hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-navy-hero"
              >
                <Plus className="h-4 w-4" aria-hidden />
                Add activity
              </button>
              <button
                type="button"
                onClick={handleExport}
                disabled={isExporting}
                aria-busy={isExporting}
                data-testid="portfolio-history-export"
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-navy-hero disabled:cursor-wait disabled:opacity-70"
              >
                <Download className="h-4 w-4" aria-hidden />
                {isExporting ? "Preparing Excel…" : "Export Excel"}
              </button>
            </div>
          }
        />

        <p className={`${appSectionMetaClass} text-slate-600`}>
          Your portfolio data is yours. You can export your complete Portfolio
          History to Excel, including when your trial ends.
        </p>

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
          aria-labelledby="portfolio-history-summary-title"
          className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm"
        >
          <div className="border-b border-slate-200 px-5 py-5 sm:px-7">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-slate-700" aria-hidden />
              <h2
                id="portfolio-history-summary-title"
                className={appSectionTitleClass}
              >
                Summary
              </h2>
            </div>
            <p className={`mt-1.5 ${appSectionMetaClass}`}>
              {CONTRIBUTIONS_EXPLANATORY_COPY}
            </p>
          </div>

          <div className="px-5 py-5 sm:px-7">
            {status === "loading" ? (
              <HistorySkeleton />
            ) : status === "error" ? (
              <div className="space-y-3">
                <p className={appSectionBodyClass} role="alert">
                  {error ?? "Could not load portfolio history."}
                </p>
                <button
                  type="button"
                  onClick={() => void reload()}
                  className="inline-flex min-h-[40px] items-center text-sm font-semibold text-blue-700 transition hover:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                >
                  Retry
                </button>
              </div>
            ) : (
              <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <SummaryMetric
                  label="Total contributed"
                  value={formatContributionAmount(summary.totalContributed)}
                />
                <SummaryMetric
                  label="Total withdrawn"
                  value={formatContributionAmount(summary.totalWithdrawn)}
                />
                <SummaryMetric
                  label="Net contributed"
                  value={formatContributionAmount(summary.netContributed)}
                />
                <SummaryMetric
                  label="Current portfolio value"
                  value={currentValueLabel}
                />
              </div>
            )}
          </div>
        </section>

        <section
          aria-labelledby="portfolio-history-activity-title"
          className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm"
        >
          <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-7">
            <div className="min-w-0">
              <h2
                id="portfolio-history-activity-title"
                className={appSectionTitleClass}
              >
                Activity
              </h2>
              <p className={`mt-1.5 ${appSectionMetaClass}`}>
                Contributions, withdrawals, and opening balance — newest first.
              </p>
            </div>
            {status === "ready" ? (
              <button
                type="button"
                onClick={() => setDialogOpen(true)}
                className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              >
                <Plus className="h-4 w-4" aria-hidden />
                {hasEntries ? "Add activity" : CONTRIBUTIONS_ADD_LABEL}
              </button>
            ) : null}
          </div>

          <div className="px-5 py-5 sm:px-7">
            {status === "loading" ? (
              <div className="h-32 animate-pulse rounded-2xl bg-slate-100" />
            ) : status === "error" ? null : !hasEntries ? (
              <div className="space-y-4">
                <p className={appSectionBodyClass}>
                  No contribution activity yet. Add an opening contribution to
                  establish your starting point.
                </p>
                <button
                  type="button"
                  onClick={() => setDialogOpen(true)}
                  className="inline-flex min-h-[44px] items-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                >
                  {CONTRIBUTIONS_ADD_LABEL}
                </button>
              </div>
            ) : (
              <ul className="space-y-2">
                {entries.map((entry) => {
                  const isContribution = entry.entryType === "contribution";
                  return (
                    <li
                      key={entry.id}
                      className="rounded-2xl border border-slate-200 px-4 py-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                            {isContribution ? (
                              <ArrowUpCircle
                                className="h-4 w-4 shrink-0 text-emerald-700"
                                aria-hidden
                              />
                            ) : (
                              <ArrowDownCircle
                                className="h-4 w-4 shrink-0 text-amber-800"
                                aria-hidden
                              />
                            )}
                            <span>{activityTypeLabel(entry)}</span>
                          </p>
                          <p className={`mt-1 ${appSectionMetaClass}`}>
                            {formatContributionEntryDate(entry.entryDate)} ·{" "}
                            {formatOriginalAmount(entry)}
                            {entry.currency !== entry.baseCurrency
                              ? ` · ${formatContributionAmount(entry.baseAmount)}`
                              : null}
                          </p>
                          {formatContributionDestinationLines(
                            entry,
                            formatContributionAmount,
                          ).map((line) => (
                            <p
                              key={line}
                              className={`mt-1 ${appSectionMetaClass}`}
                            >
                              {line}
                            </p>
                          ))}
                          {entry.note ? (
                            <p className={`mt-1 ${appSectionBodyClass}`}>
                              {entry.note}
                            </p>
                          ) : null}
                        </div>
                        <p className="text-sm font-semibold text-slate-900">
                          {isContribution ? "+" : "−"}
                          {formatContributionAmount(entry.baseAmount)}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        <section
          aria-labelledby="portfolio-history-holdings-title"
          className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm"
        >
          <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-7">
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
              <p className={`mt-1.5 ${appSectionMetaClass}`}>
                Validated market values where available. Open a holding for
                detail.
              </p>
            </div>
            <Link
              href={PORTFOLIO_PATH}
              className="inline-flex min-h-[44px] shrink-0 items-center text-sm font-semibold text-blue-700 transition hover:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              Manage portfolio
            </Link>
          </div>

          <div className="px-5 py-5 sm:px-7">
            {holdings.length === 0 ? (
              <EmptyPortfolioGuide
                density="compact"
                title="No holdings yet"
                body="Add or import holdings on the Portfolio page. History still tracks cash contributions independently."
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
                          {holding.assetType === "cash"
                            ? " cash"
                            : " units"}
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
                {unvaluedHoldings.map((holding) => {
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
                          {holding.assetType === "cash"
                            ? " cash"
                            : " units"}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-semibold text-slate-500">
                        Unavailable
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
              </ul>
            )}
            {performance.totalValuePartial &&
            performance.totalValueCoverageMessage ? (
              <p className={`mt-4 ${appSectionMetaClass}`}>
                {performance.totalValueCoverageMessage}
              </p>
            ) : null}
          </div>
        </section>
      </PageContainer>

      <BottomNavigation />

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
