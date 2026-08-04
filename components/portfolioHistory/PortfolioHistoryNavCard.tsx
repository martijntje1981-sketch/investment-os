"use client";

import Link from "next/link";
import { ArrowRight, History } from "lucide-react";

import {
  appCardClass,
  appCardInteractiveClass,
  appCardPaddingCompactClass,
  appSectionBodyClass,
  appSectionTitleClass,
  appTintedPanelClass,
} from "@/components/layout/appSurface";
import { PORTFOLIO_HISTORY_PATH } from "@/lib/navigation/appRoutes";

export const PORTFOLIO_HISTORY_LABEL = "Portfolio History";
export const PORTFOLIO_HISTORY_SUPPORTING_TEXT =
  "Track contributions, withdrawals and export your portfolio record.";

type PortfolioHistoryNavCardProps = {
  variant?: "tinted" | "card";
};

/**
 * Compact discoverability card for Portfolio History.
 */
export function PortfolioHistoryNavCard({
  variant = "tinted",
}: PortfolioHistoryNavCardProps) {
  const shellClass =
    variant === "tinted"
      ? `${appTintedPanelClass} ${appCardPaddingCompactClass}`
      : `${appCardClass} ${appCardInteractiveClass} ${appCardPaddingCompactClass}`;

  return (
    <Link
      href={PORTFOLIO_HISTORY_PATH}
      aria-label={PORTFOLIO_HISTORY_LABEL}
      className={`${shellClass} flex min-h-[88px] items-start gap-3 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2`}
    >
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-navy"
        aria-hidden
      >
        <History className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block ${appSectionTitleClass}`}>
          {PORTFOLIO_HISTORY_LABEL}
        </span>
        <span className={`mt-1 block ${appSectionBodyClass}`}>
          {PORTFOLIO_HISTORY_SUPPORTING_TEXT}
        </span>
      </span>
      <ArrowRight
        className="mt-1 h-4 w-4 shrink-0 text-slate-400"
        aria-hidden
      />
    </Link>
  );
}
