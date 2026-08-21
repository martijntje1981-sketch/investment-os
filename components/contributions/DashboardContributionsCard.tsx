"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { PiggyBank } from "lucide-react";

import { ManageContributionsDialog } from "@/components/contributions/ManageContributionsDialog";
import { ExpandableDashboardSection } from "@/components/dashboard/ExpandableDashboardSection";
import {
  appCardValueClass,
  appSectionBodyClass,
  appSectionLabelClass,
  appSectionMetaClass,
  appTextLinkClass,
} from "@/components/layout/appSurface";
import {
  CONTRIBUTIONS_ADD_LABEL,
  CONTRIBUTIONS_INCOMPLETE_BASIS_COPY,
  CONTRIBUTIONS_MANAGE_LABEL,
  CONTRIBUTIONS_ONBOARDING_COPY,
} from "@/lib/client/contributionsCopy";
import { useBaseCurrencyDisplay } from "@/lib/client/baseCurrencyDisplay";
import {
  formatContributionBaseAmount,
  formatSignedContributionPercent,
} from "@/lib/client/contributionsFormat";
import { usePortfolioContributions } from "@/lib/client/usePortfolioContributions";
import { formatSignedPortfolioCurrency } from "@/lib/client/portfolioMovementFormat";
import { formatPortfolioPercent } from "@/lib/client/portfolioAnalysis";
import type { DashboardPortfolioSnapshot } from "@/lib/client/dashboardPortfolioSnapshot";
import { PORTFOLIO_HISTORY_PATH } from "@/lib/navigation/appRoutes";
import { activityTypeLabel } from "@/lib/services/contributions/activityLabels";
import type { ContributionHoldingOption } from "@/lib/services/contributions/types";

const RECENT_ENTRY_LIMIT = 3;

export function DashboardContributionsCard({
  snapshot,
  holdings = [],
}: {
  snapshot: DashboardPortfolioSnapshot;
  holdings?: ContributionHoldingOption[];
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
    holdings,
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const recentEntries = entries.slice(0, RECENT_ENTRY_LIMIT);

  const valueAbovePercent = formatSignedContributionPercent(
    summary.valueAboveContributionsPercent,
    formatPortfolioPercent,
  );

  let preview: ReactNode;
  if (status === "loading") {
    preview = <p className={appSectionBodyClass}>Loading contributions…</p>;
  } else if (status === "error") {
    preview = (
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
    );
  } else if (!hasEntries) {
    preview = (
      <div className="space-y-3">
        <p className={appSectionBodyClass}>{CONTRIBUTIONS_ONBOARDING_COPY}</p>
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          className="inline-flex min-h-[40px] items-center rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          {CONTRIBUTIONS_ADD_LABEL}
        </button>
      </div>
    );
  } else {
    preview = (
      <div className="space-y-3">
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
        summary.contributionBasisReliable &&
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
        ) : hasEntries && !summary.contributionBasisReliable ? (
          <p className={appSectionMetaClass}>
            {CONTRIBUTIONS_INCOMPLETE_BASIS_COPY}
          </p>
        ) : (
          <p className={appSectionMetaClass}>
            Portfolio value is unavailable, so the comparison cannot be shown.
          </p>
        )}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className="inline-flex min-h-[40px] items-center text-sm font-semibold text-blue-700 transition hover:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            {CONTRIBUTIONS_ADD_LABEL}
          </button>
          <Link href={PORTFOLIO_HISTORY_PATH} className={appTextLinkClass}>
            View full history
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <ExpandableDashboardSection
        sectionKey="contributions"
        title="Contributions"
        titleId="contributions-preview-heading"
        subtitle="Funding activity"
        icon={<PiggyBank className="h-5 w-5" />}
        iconToneClassName="bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
        deepLink={{
          href: PORTFOLIO_HISTORY_PATH,
          label: "Portfolio History",
        }}
        loading={status === "loading"}
        expandable={hasEntries && recentEntries.length > 0}
        preview={preview}
        expandedContent={
          hasEntries ? (
            <div className="space-y-3">
              <p className={appSectionLabelClass}>Recent activity</p>
              <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200/80">
                {recentEntries.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex min-w-0 items-baseline justify-between gap-3 px-3 py-2.5"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-slate-900">
                        {activityTypeLabel(entry)}
                        {entry.destinationType === "holding" &&
                        entry.destinationHoldingSymbol
                          ? ` · ${entry.destinationHoldingSymbol}`
                          : ""}
                      </span>
                      <span className={appSectionMetaClass}>
                        {entry.entryDate}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-950">
                      {formatContributionAmount(entry.amount)}
                    </span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => setDialogOpen(true)}
                className="inline-flex min-h-[40px] items-center text-sm font-semibold text-blue-700 transition hover:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              >
                {CONTRIBUTIONS_MANAGE_LABEL}
              </button>
            </div>
          ) : null
        }
      />

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
