"use client";

import Link from "next/link";
import { Download, History } from "lucide-react";

import { PortfolioPerformanceChart } from "@/components/analysis/performance/PortfolioPerformanceChart";
import { ExpandableDashboardSection } from "@/components/dashboard/ExpandableDashboardSection";
import {
  appSectionBodyClass,
  appSectionLabelClass,
  appSectionMetaClass,
  appTextLinkClass,
} from "@/components/layout/appSurface";
import { CONTRIBUTIONS_ADD_LABEL } from "@/lib/client/contributionsCopy";
import type { PortfolioPerformancePoint } from "@/lib/client/performance/types";
import { PORTFOLIO_HISTORY_PATH } from "@/lib/navigation/appRoutes";

export const PORTFOLIO_HISTORY_LABEL = "Portfolio History";
export const PORTFOLIO_HISTORY_SUPPORTING_TEXT =
  "Track contributions, withdrawals and export your portfolio record.";

type PortfolioHistoryNavCardProps = {
  /** @deprecated Kept for callers; preview shell is unified. */
  variant?: "tinted" | "card";
  chartPoints?: PortfolioPerformancePoint[] | null;
  hasSeries?: boolean;
  /** One key statistic already formatted for display. */
  keyStatisticLabel?: string | null;
  keyStatisticValue?: string | null;
  supportingMeta?: string | null;
  incompleteNote?: string | null;
  exportDisclaimer?: string | null;
  onAddContribution?: () => void;
  addContributionLabel?: string;
  onExportPortfolio?: () => void;
  isExporting?: boolean;
  /** Optional quiet emphasis line (Phase 3C) — not a second statistic. */
  emphasisNote?: string | null;
};

/**
 * Compact Dashboard Portfolio History preview.
 * One statistic + Export + deep link by default; chart only on expand.
 * Full chart experience lives on Portfolio History (and Analysis).
 */
export function PortfolioHistoryNavCard({
  variant: _variant = "tinted",
  chartPoints = null,
  hasSeries = false,
  keyStatisticLabel = "Recorded contributions",
  keyStatisticValue = null,
  supportingMeta = null,
  incompleteNote = null,
  exportDisclaimer = null,
  onAddContribution,
  addContributionLabel = CONTRIBUTIONS_ADD_LABEL,
  onExportPortfolio,
  isExporting = false,
  emphasisNote = null,
}: PortfolioHistoryNavCardProps) {
  void _variant;
  const points = chartPoints ?? [];
  const showChart = hasSeries && points.length >= 2;
  const quietNote = emphasisNote?.trim() || null;

  return (
    <ExpandableDashboardSection
      sectionKey="portfolio-history"
      title={PORTFOLIO_HISTORY_LABEL}
      titleId="portfolio-history-preview-heading"
      subtitle={quietNote ?? "How your portfolio developed"}
        icon={<History className="h-5 w-5" />}
        iconToneClassName="bg-q1-strong text-white shadow-md shadow-q1-deep/25"
        shellClassName="overflow-hidden rounded-[24px] border-2 border-q1/45 bg-gradient-to-br from-q1-soft via-white to-white shadow-[0_12px_32px_-16px_rgba(12,111,168,0.22)]"
      deepLink={{
        href: PORTFOLIO_HISTORY_PATH,
        label: "View history",
      }}
      expandable={showChart}
      preview={
        <div className="space-y-3">
          {keyStatisticValue ? (
            <div className="min-w-0">
              <p className={appSectionLabelClass}>
                {keyStatisticLabel ?? "Recorded contributions"}
              </p>
              <p className="mt-0.5 break-words text-[20px] font-bold tracking-[-0.03em] text-q1-deep">
                {keyStatisticValue}
              </p>
              {supportingMeta ? (
                <p className={`mt-1 ${appSectionMetaClass}`}>{supportingMeta}</p>
              ) : null}
            </div>
          ) : (
            <p className={appSectionBodyClass}>
              Recorded contributions, withdrawals and development over time —
              open Portfolio History for the full record.
            </p>
          )}

          {incompleteNote ? (
            <p className={appSectionMetaClass}>{incompleteNote}</p>
          ) : null}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {onAddContribution ? (
              <button
                type="button"
                onClick={onAddContribution}
                className="inline-flex min-h-[44px] items-center text-[16px] font-semibold text-q1-strong transition hover:text-q1-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-q1 focus-visible:ring-offset-2"
              >
                {addContributionLabel}
              </button>
            ) : null}
            {onExportPortfolio ? (
              <button
                type="button"
                onClick={onExportPortfolio}
                disabled={isExporting}
                aria-busy={isExporting}
                data-testid="dashboard-export-portfolio"
                aria-label="Export portfolio as Excel workbook (.xlsx)"
                className="inline-flex min-h-[44px] items-center gap-1.5 text-[16px] font-semibold text-q1-strong transition hover:text-q1-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-q1 focus-visible:ring-offset-2 disabled:opacity-70"
              >
                <Download className="h-4 w-4" aria-hidden />
                {isExporting ? "Exporting…" : "Export"}
              </button>
            ) : null}
            <Link href={PORTFOLIO_HISTORY_PATH} className={appTextLinkClass}>
              View history
            </Link>
          </div>

          {exportDisclaimer ? (
            <p className={appSectionMetaClass}>{exportDisclaimer}</p>
          ) : !showChart && !keyStatisticValue ? (
            <p className={appSectionMetaClass}>
              Export your full portfolio workbook when you are ready.
            </p>
          ) : null}
        </div>
      }
      expandedContent={
        showChart ? (
          <div className="min-w-0 space-y-3 overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-50/50 px-1 py-1">
            <PortfolioPerformanceChart
              points={points}
              hasSeries
              emptyMessage=""
              shellClassName="h-[120px] sm:h-[132px]"
            />
            <p className={`px-2 pb-1 ${appSectionMetaClass}`}>
              Full charts and timeline live on Portfolio History.
            </p>
          </div>
        ) : (
          <ul className={`list-disc space-y-1.5 pl-5 ${appSectionMetaClass}`}>
            <li>Portfolio development over selected timeframes</li>
            <li>Recorded contributions and withdrawals</li>
            <li>One-click Export portfolio (.xlsx) workbook</li>
          </ul>
        )
      }
    />
  );
}
