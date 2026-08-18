"use client";

import Link from "next/link";

import type { ProductAccess } from "@/lib/services/productAccess";

/**
 * Unobtrusive Complete trial strip for Dashboard.
 */
export function CompleteTrialIndicator({
  access,
}: {
  access: ProductAccess;
}) {
  if (!access.isCompleteTrial || !access.trialIndicatorLabel) return null;

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200/80 bg-white px-3.5 py-2.5 text-[13px] text-slate-600 sm:px-4"
      data-testid="complete-trial-indicator"
      data-tier={access.tier}
    >
      <p className="min-w-0 font-medium text-slate-800">
        {access.trialIndicatorLabel}
      </p>
      <Link
        href={access.upgradeHref}
        className="shrink-0 font-semibold text-slate-900 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
      >
        {access.upgradeCtaLabel}
      </Link>
    </div>
  );
}

/**
 * Calm Free-tier note when Complete depth is unavailable.
 */
export function FreeIntelligenceNote({
  access,
}: {
  access: ProductAccess;
}) {
  if (access.tier !== "free") return null;

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200/70 bg-slate-50/80 px-3.5 py-2.5 text-[13px] text-slate-600 sm:px-4"
      data-testid="free-intelligence-note"
      data-tier="free"
    >
      <p className="min-w-0">
        You’re on Free — basic portfolio answers stay available. Complete adds
        deeper personal intelligence.
      </p>
      <Link
        href={access.upgradeHref}
        className="shrink-0 font-semibold text-slate-900 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
      >
        {access.upgradeCtaLabel}
      </Link>
    </div>
  );
}
