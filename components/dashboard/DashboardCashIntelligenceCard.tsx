"use client";

import Link from "next/link";
import { Landmark } from "lucide-react";

import {
  appCardPaddingCompactClass,
  appDashboardLightCardClass,
  appSectionLabelClass,
  appSectionMetaClass,
  appTextLinkClass,
} from "@/components/layout/appSurface";
import { useBaseCurrencyDisplay } from "@/lib/client/baseCurrencyDisplay";
import { useCashIntelligence } from "@/lib/client/useCashIntelligence";
import { formatAllocationPercent } from "@/lib/services/classification";
import { DASHBOARD_DEEP_LINKS } from "@/lib/navigation/deepLinks";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function formatRate(rate: number | null | undefined): string {
  if (rate == null || !Number.isFinite(rate)) return "Unavailable";
  return `${rate.toFixed(2)}%`;
}

function formatAllocation(value: number | null | undefined): string | null {
  if (value == null || !Number.isFinite(value)) return null;
  return formatAllocationPercent(value);
}

/**
 * Compact Dashboard Cash Intelligence teaser.
 * Full experience lives on Analysis (`/analysis#cash-intelligence`).
 */
export function DashboardCashIntelligenceCard({
  holdings,
}: {
  holdings: StoredPortfolioHolding[];
}) {
  const { snapshot, isLoading, disclaimer } = useCashIntelligence(
    holdings,
    holdings.length > 0,
  );
  const { formatEur } = useBaseCurrencyDisplay();

  if (!isLoading && !snapshot) {
    return null;
  }

  const benchmark = snapshot?.baseCurrencyBenchmark;
  const cashAmount =
    snapshot?.totalCashInBase ??
    snapshot?.totalCashInEur ??
    snapshot?.totalCashAmount;
  const allocation = formatAllocation(snapshot?.portfolioCashWeightPercent);

  return (
    <section
      className={`${appDashboardLightCardClass} ${appCardPaddingCompactClass} min-w-0 overflow-x-clip`}
      aria-busy={isLoading}
      aria-live="polite"
      title={disclaimer}
    >
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-700 ring-1 ring-sky-100">
          <Landmark className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className={appSectionLabelClass}>Cash held</p>
          <p className="mt-0.5 truncate text-[1.15rem] font-bold tabular-nums text-slate-950">
            {isLoading
              ? "Loading…"
              : snapshot?.hasCash && cashAmount != null
                ? formatEur(cashAmount)
                : "None recorded"}
          </p>
          <p className={`mt-1 ${appSectionMetaClass}`}>
            Allocation {allocation ? `${allocation} of portfolio` : "—"}
            {" · "}
            Benchmark yield {formatRate(benchmark?.cashBenchmarkPercent ?? null)}
          </p>
          <p className="sr-only">{disclaimer}</p>
          <Link
            href={DASHBOARD_DEEP_LINKS.cashIntelligence}
            className={`${appTextLinkClass} mt-1`}
          >
            View cash intelligence →
          </Link>
        </div>
      </div>
    </section>
  );
}
