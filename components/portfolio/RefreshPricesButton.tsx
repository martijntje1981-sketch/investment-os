"use client";

import { RefreshCw } from "lucide-react";

import type { RefreshPricesUiStatus } from "@/lib/client/livePortfolioPriceRefreshAction";

type RefreshPricesButtonProps = {
  onClick: () => void;
  isRefreshing: boolean;
  disabled?: boolean;
  status?: RefreshPricesUiStatus;
  /**
   * Visual density:
   * - hero: labeled control for secondary surfaces
   * - compact: small labeled control
   * - icon: quiet icon-only control for primary heroes
   */
  variant?: "hero" | "compact" | "icon";
  /** Icon variant: onDark for premium-blue heroes; onLight for pale surfaces. */
  appearance?: "onDark" | "onLight";
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
  appearance = "onDark",
  className = "",
}: RefreshPricesButtonProps) {
  const isDisabled = disabled || isRefreshing;
  const onLight = appearance === "onLight";
  const base =
    variant === "icon"
      ? onLight
        ? "inline-flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-sky-200 bg-white text-slate-800 shadow-sm transition hover:bg-sky-50 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:ring-offset-2"
        : "inline-flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-white/25 bg-white/10 text-white transition hover:bg-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:ring-offset-2 focus-visible:ring-offset-navy-hero"
      : variant === "compact"
        ? onLight
          ? "inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-sm font-semibold text-cyan-950 transition hover:bg-white/70 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
          : "inline-flex min-h-[40px] min-w-[40px] items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] px-3 py-2 text-sm font-semibold text-white/85 transition hover:bg-white/12 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
        : "inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-bold text-white hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60";

  const statusLabel =
    status === "loading"
      ? "Refreshing prices"
      : status === "success"
        ? "Prices updated"
        : status === "error"
          ? "Price refresh failed"
          : "Refresh prices";

  const showLabel = variant !== "icon";
  const visibleLabel =
    variant === "compact" && onLight
      ? isRefreshing
        ? "Refreshing…"
        : "Refresh"
      : isRefreshing
        ? "Refreshing…"
        : "Refresh prices";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      aria-busy={isRefreshing}
      aria-label={statusLabel}
      title={statusLabel}
      data-refresh-status={status}
      className={`${base} ${className}`.trim()}
    >
      <RefreshCw
        className={`h-4 w-4 shrink-0 ${isRefreshing ? "animate-spin" : ""}`}
        aria-hidden
      />
      {showLabel ? <span>{visibleLabel}</span> : null}
    </button>
  );
}
