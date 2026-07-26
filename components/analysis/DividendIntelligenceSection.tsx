"use client";

import { useMemo, useState } from "react";
import { Coins } from "lucide-react";

import { DistributionPolicyHoldingRow } from "@/components/analysis/dividendPolicy/DistributionPolicyHoldingRow";
import {
  appSectionBodyClass,
  appSectionLabelClass,
  appSectionMetaClass,
  appCardValueClass,
} from "@/components/layout/appSurface";
import {
  formatPortfolioCurrency,
  formatPortfolioPercent,
} from "@/lib/client/portfolioAnalysis";
import { buildDistributionPolicyViewModel } from "@/lib/client/dividendPolicy/buildDividendPolicyViewModel";
import type { DividendApiQuote } from "@/lib/types/dividends";
import type {
  DistributionPolicyUserOverride,
  PortfolioDistributionPolicySnapshot,
} from "@/lib/types/distributionPolicy";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

export function DividendIntelligenceSection({
  holdings,
  quotes,
  isLoading = false,
  onPolicyOverrideChange,
}: {
  holdings: StoredPortfolioHolding[];
  quotes: DividendApiQuote[];
  isLoading?: boolean;
  onPolicyOverrideChange?: (
    holdingId: string,
    value: DistributionPolicyUserOverride,
  ) => void;
}) {
  const viewModel = useMemo(
    () => buildDistributionPolicyViewModel({ holdings, quotes }),
    [holdings, quotes],
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <section className="mt-7 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-gradient-to-br from-emerald-700 to-slate-950 px-5 py-6 text-white sm:px-8">
        <div
          className={`inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 ${appSectionLabelClass} text-emerald-100`}
        >
          <Coins className="h-3.5 w-3.5" aria-hidden="true" />
          Dividend intelligence
        </div>
        <h2 className={`mt-4 ${appCardValueClass} text-white`}>
          {isLoading
            ? "Loading distribution policy…"
            : "Distribution policy classification"}
        </h2>
        <p className={`mt-3 max-w-2xl text-sm leading-6 text-emerald-50/95`}>
          Confirmed first, unknown by default. This section classifies whether holdings
          pay cash distributions or reinvest internally. It does not estimate income.
        </p>
      </div>

      <div className="space-y-6 p-5 sm:p-8">
        <PolicySummary summary={viewModel.summary} isLoading={isLoading} />

        {viewModel.holdings.length === 0 ? (
          <p className={appSectionMetaClass}>
            Add investment holdings to review distribution policy classification.
          </p>
        ) : (
          <div className="space-y-4">
            {viewModel.holdings.map((item) => (
              <DistributionPolicyHoldingRow
                key={item.holding.id}
                item={item}
                expanded={expandedId === item.holding.id}
                onToggle={() =>
                  setExpandedId((current) =>
                    current === item.holding.id ? null : item.holding.id,
                  )
                }
                canEdit={Boolean(onPolicyOverrideChange)}
                onPolicyOverrideChange={
                  onPolicyOverrideChange
                    ? (value) => onPolicyOverrideChange(item.holding.id, value)
                    : undefined
                }
              />
            ))}
          </div>
        )}

        <p className={`rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 ${appSectionBodyClass}`}>
          Distribution classifications are based on verified provider data, reviewed
          instrument metadata or your explicit confirmation. Unknown means insufficient
          evidence — not a guarantee that no distributions occur.
        </p>
      </div>
    </section>
  );
}

function PolicySummary({
  summary,
  isLoading,
}: {
  summary: PortfolioDistributionPolicySnapshot["summary"];
  isLoading: boolean;
}) {
  const tiles = [
    { label: "Cash distributing", value: summary.distributing },
    { label: "Accumulating / reinvesting", value: summary.accumulating },
    { label: "No current distributions", value: summary.nonDistributing },
    { label: "Unknown", value: summary.unknown },
    { label: "Not applicable", value: summary.notApplicable },
  ];

  return (
    <div>
      <p className={appSectionLabelClass}>Portfolio summary</p>
      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {tiles.map((tile) => (
          <div
            key={tile.label}
            className="min-w-0 rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3"
          >
            <p className={`${appSectionLabelClass} break-words`}>{tile.label}</p>
            <p className={`mt-1 ${appCardValueClass}`}>
              {isLoading ? "…" : tile.value}
            </p>
          </div>
        ))}
      </div>
      {!isLoading && summary.conflicted > 0 ? (
        <p className={`mt-3 ${appSectionMetaClass} text-amber-800`}>
          {summary.conflicted} holding
          {summary.conflicted === 1 ? "" : "s"} with conflicting distribution information.
        </p>
      ) : null}
    </div>
  );
}

/** Legacy per-holding dividend stats for portfolio list pages. */
export function HoldingDividendMeta({
  yieldPercent,
  annualIncomeEur,
  nextPaymentEur,
  nextExDate,
  nextPaymentDate,
  frequency,
}: {
  yieldPercent: number | null;
  annualIncomeEur: number | null;
  nextPaymentEur: number | null;
  nextExDate: string | null;
  nextPaymentDate: string | null;
  frequency: string;
}) {
  if (!annualIncomeEur && !yieldPercent) return null;

  return (
    <div className="mt-3 grid gap-2 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3 sm:grid-cols-2">
      {yieldPercent ? (
        <MiniStat label="Yield" value={formatPortfolioPercent(yieldPercent)} />
      ) : null}
      {annualIncomeEur ? (
        <MiniStat
          label="Est. annual dividend"
          value={formatPortfolioCurrency(annualIncomeEur)}
        />
      ) : null}
      {nextPaymentEur ? (
        <MiniStat
          label="Est. next dividend"
          value={formatPortfolioCurrency(nextPaymentEur)}
        />
      ) : null}
      {frequency !== "Unknown" ? (
        <MiniStat label="Frequency" value={frequency} />
      ) : null}
      {nextExDate ? (
        <MiniStat label="Next ex-dividend" value={formatShortDate(nextExDate)} />
      ) : null}
      {nextPaymentDate ? (
        <MiniStat label="Next payment" value={formatShortDate(nextPaymentDate)} />
      ) : null}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className={`${appSectionLabelClass} text-emerald-800/80`}>{label}</p>
      <p className="mt-0.5 text-sm font-bold text-emerald-950">{value}</p>
    </div>
  );
}

function formatShortDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}
