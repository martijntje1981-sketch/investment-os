"use client";

import { useId, useMemo, useState } from "react";
import { Coins } from "lucide-react";

import { DistributionPolicyHoldingRow } from "@/components/analysis/dividendPolicy/DistributionPolicyHoldingRow";
import {
  appAnalysisDarkHeaderCopyClass,
  appAnalysisDarkTitleClass,
  appHeroMetricLabelClass,
  appSectionBodyClass,
  appSectionLabelClass,
  appSectionMetaClass,
  appCardValueClass,
  appTextLinkClass,
} from "@/components/layout/appSurface";
import { useBaseCurrencyDisplay } from "@/lib/client/baseCurrencyDisplay";
import { formatPortfolioPercent } from "@/lib/client/portfolioAnalysis";
import { buildDistributionPolicyViewModel } from "@/lib/client/dividendPolicy/buildDividendPolicyViewModel";
import { buildDistributionPolicyInsight } from "@/lib/client/dividendPolicy/buildDistributionPolicyInsight";
import { buildPassiveIncomeProjection } from "@/lib/services/dividends/passiveIncomeProjection";
import type { DividendApiQuote } from "@/lib/types/dividends";
import type {
  DistributionPolicyUserOverride,
  PortfolioDistributionPolicySnapshot,
} from "@/lib/types/distributionPolicy";
import type { PassiveIncomeUserEstimate } from "@/lib/types/passiveIncomeUserEstimate";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

export function DividendIntelligenceSection({
  holdings,
  quotes,
  isLoading = false,
  onPolicyOverrideChange,
  onPassiveIncomeEstimateChange,
}: {
  holdings: StoredPortfolioHolding[];
  quotes: DividendApiQuote[];
  isLoading?: boolean;
  onPolicyOverrideChange?: (
    holdingId: string,
    value: DistributionPolicyUserOverride,
  ) => void;
  onPassiveIncomeEstimateChange?: (
    holdingId: string,
    estimate: PassiveIncomeUserEstimate | null,
  ) => void;
}) {
  const viewModel = useMemo(
    () => buildDistributionPolicyViewModel({ holdings, quotes }),
    [holdings, quotes],
  );
  const passiveIncomeByHoldingId = useMemo(() => {
    const projection = buildPassiveIncomeProjection(holdings, quotes);
    return new Map(
      projection.holdingRecords.map((record) => [record.holdingId, record]),
    );
  }, [holdings, quotes]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [holdingsExpanded, setHoldingsExpanded] = useState(false);
  const holdingsPanelId = useId();
  const insight = buildDistributionPolicyInsight(viewModel.summary);

  return (
    <section
      id="dividend-intelligence"
      className="mt-7 scroll-mt-24 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm"
      aria-labelledby="distribution-policy-heading"
    >
      <div className="border-b border-slate-200 bg-gradient-to-br from-emerald-700 to-brand-navy px-5 py-5 text-white sm:px-8">
        <div
          className={`inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 ${appHeroMetricLabelClass} text-emerald-100`}
        >
          <Coins className="h-3.5 w-3.5" aria-hidden="true" />
          Dividend intelligence
        </div>
        <h2
          id="distribution-policy-heading"
          className={`mt-3 ${appAnalysisDarkTitleClass}`}
        >
          {isLoading ? "Loading distribution policy…" : "Distribution policy"}
        </h2>
        <p
          className={`mt-2 max-w-2xl ${appAnalysisDarkHeaderCopyClass} text-emerald-50/95`}
        >
          Classifies whether holdings pay cash distributions or reinvest — it
          does not estimate income.
        </p>
      </div>

      <div className="space-y-4 p-5 sm:p-6">
        <PolicySummaryCompact
          summary={viewModel.summary}
          isLoading={isLoading}
        />

        <p className={appSectionBodyClass}>{isLoading ? "…" : insight}</p>

        {viewModel.holdings.length === 0 ? (
          <p className={appSectionMetaClass}>
            Add investment holdings to review distribution policy
            classification.
          </p>
        ) : (
          <div>
            <button
              type="button"
              className={appTextLinkClass}
              aria-expanded={holdingsExpanded}
              aria-controls={holdingsPanelId}
              onClick={() => setHoldingsExpanded((current) => !current)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setHoldingsExpanded((current) => !current);
                }
              }}
            >
              {holdingsExpanded ? "Hide holdings" : "View holdings"}
            </button>

            {holdingsExpanded ? (
              <div
                id={holdingsPanelId}
                className="mt-4 space-y-3"
                role="region"
              >
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
                    canEdit={Boolean(
                      onPolicyOverrideChange || onPassiveIncomeEstimateChange,
                    )}
                    onPolicyOverrideChange={
                      onPolicyOverrideChange
                        ? (value) =>
                            onPolicyOverrideChange(item.holding.id, value)
                        : undefined
                    }
                    passiveIncomeRecord={passiveIncomeByHoldingId.get(
                      item.holding.id,
                    )}
                    onPassiveIncomeEstimateChange={
                      onPassiveIncomeEstimateChange
                        ? (estimate) =>
                            onPassiveIncomeEstimateChange(
                              item.holding.id,
                              estimate,
                            )
                        : undefined
                    }
                  />
                ))}
              </div>
            ) : null}
          </div>
        )}

        <details className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <summary className={`cursor-pointer ${appSectionLabelClass}`}>
            Methodology
          </summary>
          <div className={`mt-3 space-y-2 ${appSectionBodyClass}`}>
            <p>
              Classifications prefer verified provider data, reviewed instrument
              metadata, or your explicit confirmation. Unknown means
              insufficient evidence — not a guarantee that no distributions
              occur.
            </p>
            <p>
              This section does not estimate income. User confirmation updates
              the stored classification for that holding only.
            </p>
            <p>
              Not applicable covers instruments where cash-distribution policy
              is not a meaningful concept (for example spot crypto).
            </p>
          </div>
        </details>
      </div>
    </section>
  );
}

function PolicySummaryCompact({
  summary,
  isLoading,
}: {
  summary: PortfolioDistributionPolicySnapshot["summary"];
  isLoading: boolean;
}) {
  const tiles = [
    { label: "Cash distributing", value: summary.distributing },
    { label: "Accumulating", value: summary.accumulating },
    { label: "No distributions", value: summary.nonDistributing },
    { label: "Unknown", value: summary.unknown },
    { label: "Not applicable", value: summary.notApplicable },
  ];

  return (
    <div>
      <p className={appSectionLabelClass}>Portfolio summary</p>
      <div className="mt-2 grid grid-cols-2 divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-slate-50/90 sm:grid-cols-5 sm:divide-x sm:divide-y-0">
        {tiles.map((tile) => (
          <div key={tile.label} className="min-w-0 px-3 py-2.5 sm:text-center">
            <p className={`${appSectionLabelClass} text-[11px] leading-snug`}>
              {tile.label}
            </p>
            <p className={`mt-0.5 ${appCardValueClass} text-base`}>
              {isLoading ? "…" : tile.value}
            </p>
          </div>
        ))}
      </div>
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
  const { formatEur } = useBaseCurrencyDisplay();
  if (!annualIncomeEur && !yieldPercent) return null;

  return (
    <div className="mt-3 grid gap-2 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3 sm:grid-cols-2">
      {yieldPercent ? (
        <MiniStat label="Yield" value={formatPortfolioPercent(yieldPercent)} />
      ) : null}
      {annualIncomeEur ? (
        <MiniStat
          label="Est. annual dividend"
          value={formatEur(annualIncomeEur)}
        />
      ) : null}
      {nextPaymentEur ? (
        <MiniStat
          label="Est. next dividend"
          value={formatEur(nextPaymentEur)}
        />
      ) : null}
      {frequency !== "Unknown" ? (
        <MiniStat label="Frequency" value={frequency} />
      ) : null}
      {nextExDate ? (
        <MiniStat
          label="Next ex-dividend"
          value={formatShortDate(nextExDate)}
        />
      ) : null}
      {nextPaymentDate ? (
        <MiniStat
          label="Next payment"
          value={formatShortDate(nextPaymentDate)}
        />
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
