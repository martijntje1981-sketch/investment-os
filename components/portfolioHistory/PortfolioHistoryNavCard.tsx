"use client";

import { History } from "lucide-react";

import { ExpandableDashboardSection } from "@/components/dashboard/ExpandableDashboardSection";
import {
  appSectionBodyClass,
  appSectionMetaClass,
} from "@/components/layout/appSurface";
import { PORTFOLIO_HISTORY_PATH } from "@/lib/navigation/appRoutes";

export const PORTFOLIO_HISTORY_LABEL = "Portfolio History";
export const PORTFOLIO_HISTORY_SUPPORTING_TEXT =
  "Track contributions, withdrawals and export your portfolio record.";

type PortfolioHistoryNavCardProps = {
  /** @deprecated Kept for callers; card is always the Dashboard preview shell. */
  variant?: "tinted" | "card";
};

/**
 * Compact Portfolio History preview with progressive disclosure.
 * Full ledger and charts live on the dedicated page.
 */
export function PortfolioHistoryNavCard(
  props: PortfolioHistoryNavCardProps = {},
) {
  // Call sites may still pass `variant`; the progressive-disclosure shell is unified.
  if (props.variant === "card") {
    // no-op: preserve API compatibility without branching visual shells
  }

  return (
    <ExpandableDashboardSection
      sectionKey="portfolio-history"
      title={PORTFOLIO_HISTORY_LABEL}
      titleId="portfolio-history-preview-heading"
      subtitle="Development over time"
      icon={<History className="h-5 w-5" />}
      iconToneClassName="bg-slate-100 text-slate-700 ring-1 ring-slate-200"
      deepLink={{
        href: PORTFOLIO_HISTORY_PATH,
        label: "Open Portfolio History",
      }}
      preview={
        <div className="space-y-2">
          <p className={appSectionBodyClass}>
            Review portfolio development, contributions and withdrawals in one
            place.
          </p>
          <p className={appSectionMetaClass}>
            Compact trend context opens on the History page — no duplicate of
            today’s portfolio value here.
          </p>
        </div>
      }
      expandedContent={
        <ul className={`list-disc space-y-1.5 pl-5 ${appSectionMetaClass}`}>
          <li>Portfolio development over selected timeframes</li>
          <li>Contributions and withdrawals summary</li>
          <li>Downloadable records / Excel export where available</li>
        </ul>
      }
    />
  );
}
