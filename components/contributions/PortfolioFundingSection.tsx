"use client";

import { useMemo, useState } from "react";
import { ArrowDownCircle, ArrowUpCircle } from "lucide-react";

import { ManageContributionsDialog } from "@/components/contributions/ManageContributionsDialog";
import {
  appAnalysisUtilityButtonClass,
  appDarkActivityRowClass,
  appDarkCardClass,
  appDarkCautionClass,
  appDashboardDarkBodyClass,
  appDashboardDarkMetaClass,
  appHeroKpiClass,
  appHeroMetricLabelClass,
} from "@/components/layout/appSurface";
import {
  CONTRIBUTIONS_INCOMPLETE_BASIS_COPY,
  CONTRIBUTIONS_MANAGE_LABEL,
  PORTFOLIO_FUNDING_DESCRIPTION,
  PORTFOLIO_FUNDING_EMPTY_COPY,
  PORTFOLIO_FUNDING_OPENING_ACTION,
  PORTFOLIO_FUNDING_TITLE,
} from "@/lib/client/contributionsCopy";
import {
  formatContributionBaseAmount,
  formatContributionEntryDate,
  formatSignedContributionPercent,
} from "@/lib/client/contributionsFormat";
import { useBaseCurrencyDisplay } from "@/lib/client/baseCurrencyDisplay";
import { usePortfolioContributions } from "@/lib/client/usePortfolioContributions";
import { formatPortfolioPercent } from "@/lib/client/portfolioAnalysis";
import { formatSignedPortfolioCurrency } from "@/lib/client/portfolioMovementFormat";
import { activityTypeLabel } from "@/lib/services/contributions/activityLabels";
import type {
  ContributionHoldingOption,
  PortfolioContributionEntry,
} from "@/lib/services/contributions/types";

const RECENT_ENTRY_LIMIT = 3;

type PortfolioFundingSectionProps = {
  portfolioValueEur: number;
  portfolioValueAvailable: boolean;
  holdings?: ContributionHoldingOption[];
};

function FundingSkeleton() {
  return (
    <div className="space-y-4" aria-hidden>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="h-16 animate-pulse rounded-2xl bg-white/10" />
        <div className="h-16 animate-pulse rounded-2xl bg-white/10" />
        <div className="h-16 animate-pulse rounded-2xl bg-white/10" />
      </div>
      <div className="h-12 animate-pulse rounded-xl bg-white/10" />
    </div>
  );
}

function formatOriginalAmount(entry: PortfolioContributionEntry): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: entry.currency,
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(entry.amount);
}

export function PortfolioFundingSection({
  portfolioValueEur,
  portfolioValueAvailable,
  holdings = [],
}: PortfolioFundingSectionProps) {
  const { formatEur, convertToEur } = useBaseCurrencyDisplay();
  const formatContributionAmount = (amount: number) =>
    formatContributionBaseAmount(amount, formatEur, convertToEur);
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
    portfolioValueEur,
    portfolioValueAvailable,
    true,
    holdings,
  );
  const [dialogOpen, setDialogOpen] = useState(false);

  const recentEntries = useMemo(
    () => entries.slice(0, RECENT_ENTRY_LIMIT),
    [entries],
  );

  const valueAbovePercent = formatSignedContributionPercent(
    summary.valueAboveContributionsPercent,
    formatPortfolioPercent,
  );

  const manageActionLabel = hasEntries
    ? CONTRIBUTIONS_MANAGE_LABEL
    : PORTFOLIO_FUNDING_OPENING_ACTION;

  return (
    <>
      <div className="space-y-3" data-testid="portfolio-funding">
        <section
          aria-labelledby="portfolio-funding-title"
          className={`${appDarkCardClass} px-4 py-4 sm:px-5`}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className={appHeroMetricLabelClass}>Glance</p>
              <h2
                id="portfolio-funding-title"
                className="mt-0.5 text-lg font-bold tracking-[-0.02em] text-white"
              >
                {PORTFOLIO_FUNDING_TITLE}
              </h2>
              <p className={`mt-1 ${appDashboardDarkMetaClass}`}>
                {PORTFOLIO_FUNDING_DESCRIPTION}
              </p>
            </div>
            {status === "ready" ? (
              <button
                type="button"
                onClick={() => setDialogOpen(true)}
                className={appAnalysisUtilityButtonClass}
              >
                {manageActionLabel}
              </button>
            ) : null}
          </div>

          <div className="mt-4 space-y-4">
            {status === "loading" ? (
              <FundingSkeleton />
            ) : status === "error" ? (
              <div className="space-y-3">
                <p className={appDashboardDarkBodyClass} role="alert">
                  {error ?? "Could not load contributions."}
                </p>
                <button
                  type="button"
                  onClick={() => void reload()}
                  className={appAnalysisUtilityButtonClass}
                >
                  Retry
                </button>
              </div>
            ) : !hasEntries ? (
              <div className="space-y-3">
                <p className={appDashboardDarkBodyClass}>
                  {PORTFOLIO_FUNDING_EMPTY_COPY}
                </p>
                <button
                  type="button"
                  onClick={() => setDialogOpen(true)}
                  className={appAnalysisUtilityButtonClass}
                >
                  {PORTFOLIO_FUNDING_OPENING_ACTION}
                </button>
              </div>
            ) : (
              <>
                <div className="grid min-w-0 gap-2 sm:grid-cols-3">
                  <FundingMetric
                    label="Net contributed"
                    value={formatContributionAmount(summary.netContributed)}
                  />
                  <FundingMetric
                    label="Total contributed"
                    value={formatContributionAmount(summary.totalContributed)}
                  />
                  <FundingMetric
                    label="Total withdrawn"
                    value={formatContributionAmount(summary.totalWithdrawn)}
                  />
                </div>

                {portfolioValueAvailable && summary.currentValue != null ? (
                  <p className={appDashboardDarkMetaClass}>
                    Current portfolio value {formatEur(summary.currentValue)}
                    {summary.contributionBasisReliable &&
                    summary.valueAboveContributions != null
                      ? ` · Value above contributions ${formatSignedPortfolioCurrency(
                          summary.valueAboveContributions,
                          formatContributionAmount,
                        )}${valueAbovePercent ? ` · ${valueAbovePercent}` : ""}`
                      : ""}
                  </p>
                ) : (
                  <p className={appDashboardDarkMetaClass}>
                    Current portfolio value is unavailable, so the comparison
                    cannot be shown.
                  </p>
                )}

                {!summary.contributionBasisReliable ? (
                  <p className={appDarkCautionClass}>
                    Incomplete history. {CONTRIBUTIONS_INCOMPLETE_BASIS_COPY}
                  </p>
                ) : null}
              </>
            )}
          </div>
        </section>

        {status === "ready" && hasEntries && recentEntries.length > 0 ? (
          <section
            aria-labelledby="portfolio-funding-activity"
            className={`${appDarkCardClass} px-4 py-4 sm:px-5`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3
                id="portfolio-funding-activity"
                className="text-sm font-semibold text-white"
              >
                Recent activity
              </h3>
              <button
                type="button"
                onClick={() => setDialogOpen(true)}
                className="text-sm font-semibold text-white/80 underline-offset-2 hover:text-white hover:underline"
              >
                View all
              </button>
            </div>
            <ul className="mt-3 space-y-1.5">
              {recentEntries.map((entry) => (
                <li key={entry.id} className={appDarkActivityRowClass}>
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-sm font-semibold text-white">
                      {entry.entryType === "contribution" ? (
                        <ArrowUpCircle className="h-4 w-4 shrink-0" aria-hidden />
                      ) : (
                        <ArrowDownCircle className="h-4 w-4 shrink-0" aria-hidden />
                      )}
                      <span>{activityTypeLabel(entry)}</span>
                    </p>
                    <p className={`mt-0.5 ${appDashboardDarkMetaClass}`}>
                      {formatContributionEntryDate(entry.entryDate)} ·{" "}
                      {formatOriginalAmount(entry)}
                    </p>
                    {entry.note ? (
                      <p className={`mt-0.5 ${appDashboardDarkMetaClass}`}>
                        {entry.note}
                      </p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
            {entries.length > RECENT_ENTRY_LIMIT ? (
              <p className={`mt-2 ${appDashboardDarkMetaClass}`}>
                Showing {RECENT_ENTRY_LIMIT} of {entries.length} entries
              </p>
            ) : null}
          </section>
        ) : null}

        {status === "ready" ? (
          <section className={`${appDarkCardClass} px-4 py-4 sm:px-5`}>
            <h3 className="text-sm font-semibold text-white">Manage / history</h3>
            <p className={`mt-1 ${appDashboardDarkMetaClass}`}>
              Record deposits and withdrawals, or open the full history.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setDialogOpen(true)}
                className={appAnalysisUtilityButtonClass}
              >
                {manageActionLabel}
              </button>
              {hasEntries ? (
                <button
                  type="button"
                  onClick={() => setDialogOpen(true)}
                  className={appAnalysisUtilityButtonClass}
                >
                  View all
                </button>
              ) : null}
            </div>
          </section>
        ) : null}
      </div>

      {dialogOpen ? (
        <ManageContributionsDialog
          entries={entries}
          summary={summary}
          holdings={holdings}
          isMutating={isMutating}
          mutationError={mutationError}
          portfolioValueAvailable={portfolioValueAvailable}
          onClose={() => setDialogOpen(false)}
          onSave={saveEntry}
          onDelete={removeEntry}
        />
      ) : null}
    </>
  );
}

function FundingMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3">
      <p className={appHeroMetricLabelClass}>{label}</p>
      <p className={`mt-1 truncate ${appHeroKpiClass} text-white`}>{value}</p>
    </div>
  );
}
