"use client";

import Link from "next/link";

import {
  COMPLETE_UPGRADE_CTA_LABEL,
  COMPLETE_UPGRADE_HREF,
} from "@/lib/services/productAccess";

/**
 * Non-transactional Complete upgrade CTA — routes to /pricing.
 * Stripe checkout is intentionally not wired in Phase 6B.
 */
export function CompleteUpgradeLink({
  className,
  label = COMPLETE_UPGRADE_CTA_LABEL,
  href = COMPLETE_UPGRADE_HREF,
}: {
  className?: string;
  label?: string;
  href?: string;
}) {
  return (
    <Link
      href={href}
      className={
        className ??
        "inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
      }
      data-testid="complete-upgrade-cta"
    >
      {label}
    </Link>
  );
}
