"use client";

import { useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, PiggyBank } from "lucide-react";

import { ManageContributionsDialog } from "@/components/contributions/ManageContributionsDialog";
import { DashboardSectionHeader } from "@/components/dashboard/DashboardSectionHeader";
import {
  appCardPaddingClass,
  appCardValueClass,
  appDashboardLightCardClass,
  appSectionBodyClass,
  appSectionLabelClass,
  appSectionMetaClass,
} from "@/components/layout/appSurface";
import {
  CONTRIBUTIONS_ADD_LABEL,
  CONTRIBUTIONS_EXPLANATORY_COPY,
  CONTRIBUTIONS_MANAGE_LABEL,
  CONTRIBUTIONS_ONBOARDING_COPY,
} from "@/lib/client/contributionsCopy";
import { useBaseCurrencyDisplay } from "@/lib/client/baseCurrencyDisplay";
import { formatContributionBaseAmount } from "@/lib/client/contributionsFormat";
import { usePortfolioContributions } from "@/lib/client/usePortfolioContributions";
import { formatSignedPortfolioCurrency } from "@/lib/client/portfolioMovementFormat";
import { formatPortfolioPercent } from "@/lib/client/portfolioAnalysis";
import type { DashboardPortfolioSnapshot } from "@/lib/client/dashboardPortfolioSnapshot";

function formatSignedPercent(value: number | null): string | null {
  if (value == null || !Number.isFinite(value)) {
    return null;
  }

  const formatted = formatPortfolioPercent(Math.abs(value));
  return value >= 0 ? `+${formatted}` : `−${formatted}`;
}

export function DashboardContributionsCard({
  snapshot,
}: {
  snapshot: DashboardPortfolioSnapshot;
}) {
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
    portfolioValueAvailable,
  } = usePortfolioContributions(
    snapshot.portfolioValue,
    snapshot.portfolioValueAvailable,
    true,
  );
  const [dialogOpen, setDialogOpen] = useState(false);

  const valueAbovePercent = formatSignedPercent(
    summary.valueAboveContributionsPercent,
  );

  return (
    <>
      <section className={appDashboardLightCardClass}>
        <DashboardSectionHeader
          variant="compact"
          title="Contributions"
          subtitle="Deposits and withdrawals"
          icon={<PiggyBank className="h-5 w-5" />}
          bordered={false}
        />

        <div className={`${appCardPaddingClass} space-y-4 pt-0`}>
          {status === "loading" ? (
            <p className={appSectionBodyClass}>Loading contributions…</p>
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
            <>
              <p className={appSectionBodyClass}>{CONTRIBUTIONS_ONBOARDING_COPY}</p>
              <button
                type="button"
                onClick={() => setDialogOpen(true)}
                className="inline-flex min-h-[40px] items-center rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              >
                {CONTRIBUTIONS_ADD_LABEL}
              </button>
            </>
          ) : (
            <>
              <div className="grid min-w-0 grid-cols-2 gap-3">
                <div className="min-w-0">
                  <p className={appSectionLabelClass}>Net contributed</p>
                  <p className={`mt-1 truncate ${appCardValueClass}`}>
                    {formatContributionAmount(summary.netContributed)}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className={appSectionLabelClass}>Current value</p>
                  <p className={`mt-1 truncate ${appCardValueClass}`}>
                    {portfolioValueAvailable && summary.currentValue != null
                      ? formatEur(summary.currentValue)
                      : "Unavailable"}
                  </p>
                </div>
              </div>

              {portfolioValueAvailable &&
              summary.valueAboveContributions != null ? (
                <div>
                  <p className={appSectionLabelClass}>Value above contributions</p>
                  <p
                    className={`mt-1 truncate ${appCardValueClass} ${
                      summary.valueAboveContributions > 0
                        ? "text-emerald-700"
                        : summary.valueAboveContributions < 0
                          ? "text-amber-800"
                          : ""
                    }`}
                  >
                    {formatSignedPortfolioCurrency(
                      summary.valueAboveContributions,
                      formatContributionAmount,
                    )}
                    {valueAbovePercent ? (
                      <span className={appSectionMetaClass}>
                        {" "}
                        · {valueAbovePercent}
                      </span>
                    ) : null}
                  </p>
                </div>
              ) : (
                <p className={appSectionMetaClass}>
                  Portfolio value is unavailable, so the comparison cannot be
                  shown.
                </p>
              )}

              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                <span className="inline-flex items-center gap-1.5">
                  <ArrowUpCircle className="h-3.5 w-3.5" aria-hidden />
                  Contributed {formatContributionAmount(summary.totalContributed)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <ArrowDownCircle className="h-3.5 w-3.5" aria-hidden />
                  Withdrawn {formatContributionAmount(summary.totalWithdrawn)}
                </span>
              </div>

              <p className={appSectionMetaClass}>{CONTRIBUTIONS_EXPLANATORY_COPY}</p>

              <button
                type="button"
                onClick={() => setDialogOpen(true)}
                className="inline-flex min-h-[40px] items-center text-sm font-semibold text-blue-700 transition hover:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              >
                {CONTRIBUTIONS_MANAGE_LABEL}
              </button>
            </>
          )}
        </div>
      </section>

      {dialogOpen ? (
        <ManageContributionsDialog
          entries={entries}
          summary={summary}
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
