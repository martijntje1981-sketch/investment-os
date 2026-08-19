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
  keyStatisticLabel = "Net contributions",
  keyStatisticValue = null,
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
        iconToneClassName="bg-cyan-600 text-white shadow-md shadow-cyan-800/30"
        shellClassName="overflow-hidden rounded-[24px] border-2 border-cyan-300 bg-gradient-to-br from-cyan-100 via-sky-50 to-white shadow-[0_12px_32px_-16px_rgba(8,145,178,0.45)]"
      deepLink={{
        href: PORTFOLIO_HISTORY_PATH,
        label: "View Portfolio History",
      }}
      expandable={showChart}
      preview={
        <div className="space-y-3">
          {keyStatisticValue ? (
            <div className="min-w-0">
              <p className={appSectionLabelClass}>
                {keyStatisticLabel ?? "Key figure"}
              </p>
              <p className="mt-0.5 break-words text-[20px] font-bold tracking-[-0.03em] text-cyan-950">
                {keyStatisticValue}
              </p>
            </div>
          ) : (
            <p className={appSectionBodyClass}>
              Contributions, withdrawals and development over time — open
              Portfolio History for the full record.
            </p>
          )}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {onExportPortfolio ? (
              <button
                type="button"
                onClick={onExportPortfolio}
                disabled={isExporting}
                aria-busy={isExporting}
                data-testid="dashboard-export-portfolio"
                aria-label="Export Portfolio as Excel workbook"
                className="inline-flex min-h-[44px] items-center gap-1.5 text-[16px] font-semibold text-cyan-800 transition hover:text-cyan-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 disabled:opacity-70"
              >
                <Download className="h-4 w-4" aria-hidden />
                {isExporting ? "Exporting…" : "Export Portfolio"}
              </button>
            ) : null}
            <Link href={PORTFOLIO_HISTORY_PATH} className={appTextLinkClass}>
              View Portfolio History
            </Link>
          </div>

          {!showChart && !keyStatisticValue ? (
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
            <li>Contributions and withdrawals summary</li>
            <li>One-click Export Portfolio workbook</li>
          </ul>
        )
      }
    />
  );
}
