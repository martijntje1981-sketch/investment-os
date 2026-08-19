"use client";

import { useMemo, useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, PiggyBank } from "lucide-react";

import { ManageContributionsDialog } from "@/components/contributions/ManageContributionsDialog";
import {
  appCardValueClass,
  appSectionBodyClass,
  appSectionLabelClass,
  appSectionMetaClass,
  appSectionTitleClass,
} from "@/components/layout/appSurface";
import {
  appIdentityAheadMetricClass,
  appIdentityHappenedMetricClass,
  appIdentityOnTrackCardClass,
  appIdentityOnTrackIconClass,
  appIdentityOnTrackMetricClass,
  appKpiFutureClass,
  appKpiIntelClass,
  appKpiNegativeClass,
  appKpiPositiveClass,
} from "@/components/layout/semanticIdentity";
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
        <div className="h-16 animate-pulse rounded-2xl bg-slate-100" />
        <div className="h-16 animate-pulse rounded-2xl bg-slate-100" />
        <div className="h-16 animate-pulse rounded-2xl bg-slate-100" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
        <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
      </div>
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
      <section
        aria-labelledby="portfolio-funding-title"
        className={appIdentityOnTrackCardClass}
      >
        <div className="flex flex-col gap-4 border-b border-amber-200/80 px-5 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-7">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <span className={appIdentityOnTrackIconClass} aria-hidden>
                <PiggyBank className="h-5 w-5" />
              </span>
              <h2 id="portfolio-funding-title" className={appSectionTitleClass}>
                {PORTFOLIO_FUNDING_TITLE}
              </h2>
            </div>
            <p className={`mt-1.5 ${appSectionMetaClass}`}>
              {PORTFOLIO_FUNDING_DESCRIPTION}
            </p>
          </div>
          {status === "ready" ? (
            <button
              type="button"
              onClick={() => setDialogOpen(true)}
              className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              {manageActionLabel}
            </button>
          ) : null}
        </div>

        <div className="space-y-5 px-5 py-5 sm:px-7">
          {status === "loading" ? (
            <FundingSkeleton />
          ) : status === "error" ? (
            <div className="space-y-3">
              <p className={appSectionBodyClass} role="alert">
                {error ?? "Could not load contributions."}
              </p>
              <button
                type="button"
                onClick={() => void reload()}
                className="inline-flex min-h-[40px] items-center text-sm font-semibold text-blue-700 transition hover:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              >
                Retry
              </button>
            </div>
          ) : !hasEntries ? (
            <div className="space-y-4">
              <p className={appSectionBodyClass}>{PORTFOLIO_FUNDING_EMPTY_COPY}</p>
              <button
                type="button"
                onClick={() => setDialogOpen(true)}
                className="inline-flex min-h-[44px] items-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              >
                {PORTFOLIO_FUNDING_OPENING_ACTION}
              </button>
            </div>
          ) : (
            <>
              <div className="grid min-w-0 gap-3 sm:grid-cols-3">
                <FundingMetric
                  label="Net contributed"
                  value={formatContributionAmount(summary.netContributed)}
                  prominent
                  surface={appIdentityHappenedMetricClass}
                  valueClass={appKpiIntelClass}
                />
                <FundingMetric
                  label="Current portfolio value"
                  value={
                    portfolioValueAvailable && summary.currentValue != null
                      ? formatEur(summary.currentValue)
                      : "Unavailable"
                  }
                  prominent
                  surface={appIdentityAheadMetricClass}
                  valueClass={appKpiFutureClass}
                />
                <FundingMetric
                  label="Value above contributions"
                  value={
                    portfolioValueAvailable &&
                    summary.contributionBasisReliable &&
                    summary.valueAboveContributions != null
                      ? `${formatSignedPortfolioCurrency(
                          summary.valueAboveContributions,
                          formatContributionAmount,
                        )}${valueAbovePercent ? ` · ${valueAbovePercent}` : ""}`
                      : !summary.contributionBasisReliable
                        ? "Incomplete history"
                        : "Unavailable"
                  }
                  prominent
                  tone={
                    summary.contributionBasisReliable &&
                    summary.valueAboveContributions != null
                      ? summary.valueAboveContributions > 0
                        ? "positive"
                        : summary.valueAboveContributions < 0
                          ? "negative"
                          : "neutral"
                      : "neutral"
                  }
                  surface={appIdentityOnTrackMetricClass}
                />
              </div>

              {!summary.contributionBasisReliable ? (
                <p className={appSectionMetaClass}>
                  {CONTRIBUTIONS_INCOMPLETE_BASIS_COPY}
                </p>
              ) : null}

              {portfolioValueAvailable ? null : (
                <p className={appSectionMetaClass}>
                  Current portfolio value is unavailable, so the comparison
                  cannot be shown.
                </p>
              )}

              <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                <FundingMetric
                  label="Total contributed"
                  value={formatContributionAmount(summary.totalContributed)}
                />
                <FundingMetric
                  label="Total withdrawn"
                  value={formatContributionAmount(summary.totalWithdrawn)}
                />
              </div>

              {recentEntries.length > 0 ? (
                <div className="space-y-3 border-t border-slate-100 pt-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-slate-900">
                      Recent activity
                    </h3>
                    <button
                      type="button"
                      onClick={() => setDialogOpen(true)}
                      className="text-sm font-semibold text-blue-700 transition hover:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                    >
                      View all
                    </button>
                  </div>

                  <ul className="space-y-2">
                    {recentEntries.map((entry) => (
                      <li
                        key={entry.id}
                        className="rounded-2xl border border-slate-200 px-4 py-3"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                              {entry.entryType === "contribution" ? (
                                <ArrowUpCircle
                                  className="h-4 w-4 shrink-0"
                                  aria-hidden
                                />
                              ) : (
                                <ArrowDownCircle
                                  className="h-4 w-4 shrink-0"
                                  aria-hidden
                                />
                              )}
                              <span>
                                {entry.entryType === "contribution"
                                  ? "Contribution"
                                  : "Withdrawal"}
                              </span>
                            </p>
                            <p className={`mt-1 ${appSectionMetaClass}`}>
                              {formatContributionEntryDate(entry.entryDate)} ·{" "}
                              {formatOriginalAmount(entry)}
                            </p>
                            {entry.note ? (
                              <p className={`mt-1 ${appSectionBodyClass}`}>
                                {entry.note}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>

                  {entries.length > RECENT_ENTRY_LIMIT ? (
                    <p className={appSectionMetaClass}>
                      Showing {RECENT_ENTRY_LIMIT} of {entries.length} entries
                    </p>
                  ) : null}
                </div>
              ) : null}
            </>
          )}
        </div>
      </section>

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
  prominent = false,
  tone = "neutral",
  surface,
  valueClass,
}: {
  label: string;
  value: string;
  prominent?: boolean;
  tone?: "positive" | "negative" | "neutral";
  surface?: string;
  valueClass?: string;
}) {
  const toneClass =
    valueClass ??
    (tone === "positive"
      ? appKpiPositiveClass
      : tone === "negative"
        ? appKpiNegativeClass
        : "text-slate-900");

  return (
    <div
      className={
        surface ??
        `rounded-2xl border border-slate-200 ${
          prominent ? "bg-slate-50 px-4 py-4" : "bg-white px-4 py-3"
        }`
      }
    >
      <p className={appSectionLabelClass}>{label}</p>
      <p
        className={`mt-1 truncate ${
          prominent ? appCardValueClass : "text-base font-semibold"
        } ${toneClass}`}
      >
        {value}
      </p>
    </div>
  );
}
