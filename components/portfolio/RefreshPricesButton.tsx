"use client";

import { RefreshCw } from "lucide-react";

import type { RefreshPricesUiStatus } from "@/lib/client/livePortfolioPriceRefreshAction";

type RefreshPricesButtonProps = {
  onClick: () => void;
  isRefreshing: boolean;
  disabled?: boolean;
  status?: RefreshPricesUiStatus;
  /** Visual density — dashboard sits beside the update timestamp. */
  variant?: "hero" | "compact";
  className?: string;
};

/**
 * Shared manual market-price refresh control.
 * Neutral label: does not imply markets are open.
 */
export function RefreshPricesButton({
  onClick,
  isRefreshing,
  disabled = false,
  status = "idle",
  variant = "hero",
  className = "",
}: RefreshPricesButtonProps) {
  const isDisabled = disabled || isRefreshing;
  const base =
    variant === "compact"
      ? "inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
      : "inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-bold text-white hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50";

  const statusLabel =
    status === "loading"
      ? "Refreshing prices"
      : status === "success"
        ? "Prices updated"
        : status === "error"
          ? "Price refresh failed"
          : "Refresh prices";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      aria-busy={isRefreshing}
      aria-label={statusLabel}
      data-refresh-status={status}
      className={`${base} ${className}`.trim()}
    >
      <RefreshCw
        className={`h-4 w-4 shrink-0 ${isRefreshing ? "animate-spin" : ""}`}
        aria-hidden
      />
      <span>{isRefreshing ? "Refreshing…" : "Refresh prices"}</span>
    </button>
  );
}
