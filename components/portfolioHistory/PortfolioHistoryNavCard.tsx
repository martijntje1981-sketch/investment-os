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
 * Chart + one statistic + Export Portfolio + View full history.
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
      subtitle={quietNote ?? "Development over time"}
      icon={<History className="h-5 w-5" />}
      iconToneClassName="bg-slate-100 text-slate-700 ring-1 ring-slate-200"
      deepLink={{
        href: PORTFOLIO_HISTORY_PATH,
        label: "View full history",
      }}
      preview={
        <div className="space-y-3">
          {showChart ? (
            <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-50/50 px-1 py-1">
              <PortfolioPerformanceChart
                points={points}
                hasSeries
                emptyMessage=""
                shellClassName="h-[120px] sm:h-[132px]"
              />
            </div>
          ) : (
            <p className={appSectionBodyClass}>
              Review portfolio development, contributions and withdrawals in one
              place.
            </p>
          )}

          {keyStatisticValue ? (
            <div className="min-w-0">
              <p className={appSectionLabelClass}>
                {keyStatisticLabel ?? "Key figure"}
              </p>
              <p className="mt-0.5 truncate text-[18px] font-bold tracking-[-0.03em] text-slate-950">
                {keyStatisticValue}
              </p>
            </div>
          ) : (
            <p className={appSectionMetaClass}>
              Export your full portfolio workbook when you are ready.
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
                className="inline-flex min-h-[40px] items-center gap-1.5 text-sm font-semibold text-blue-700 transition hover:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-70"
              >
                <Download className="h-4 w-4" aria-hidden />
                {isExporting ? "Preparing export…" : "Export Portfolio"}
              </button>
            ) : null}
            <Link href={PORTFOLIO_HISTORY_PATH} className={appTextLinkClass}>
              View full history
            </Link>
          </div>
        </div>
      }
      expandedContent={
        <ul className={`list-disc space-y-1.5 pl-5 ${appSectionMetaClass}`}>
          <li>Portfolio development over selected timeframes</li>
          <li>Contributions and withdrawals summary</li>
          <li>One-click Export Portfolio workbook</li>
        </ul>
      }
    />
  );
}
