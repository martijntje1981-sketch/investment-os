"use client";

import { useState } from "react";
import { ChevronDown, LineChart, Sparkles } from "lucide-react";

import {
  formatPortfolioCurrency,
  formatPortfolioPercent,
} from "@/lib/client/portfolioAnalysis";
import {
  formatAnalystConsensus,
  formatUpsideLabel,
} from "@/lib/services/analyst/analystCalculator";
import {
  ANALYST_DISCLAIMER,
  type AnalystApiQuote,
  type PortfolioAnalystSnapshot,
} from "@/lib/types/analyst";
import {
  consensusBadgeClass,
  formatConsensusRating,
} from "@/lib/services/analyst/normalizeRating";
import { hasAnalystCoverage } from "@/lib/services/analyst/analystCalculations";

export function AnalystIntelligenceSection({
  snapshot,
  isLoading = false,
}: {
  snapshot: PortfolioAnalystSnapshot;
  isLoading?: boolean;
}) {
  const emptyStateCopy = getAnalystEmptyStateCopy(snapshot);

  return (
    <section className="mt-7 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-gradient-to-br from-violet-700 to-slate-950 px-5 py-6 text-white sm:px-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-violet-100">
          <LineChart className="h-3.5 w-3.5" />
          Analyst intelligence
        </div>
        <h2 className="mt-4 text-3xl font-black tracking-[-0.05em] sm:text-4xl">
          {isLoading
            ? "Loading analyst insights…"
            : snapshot.hasMeaningfulCoverage
              ? formatAnalystConsensus(snapshot.weightedConsensus)
              : emptyStateCopy.title}
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
          {snapshot.hasMeaningfulCoverage
            ? "Sell-side consensus and price targets for covered holdings in your portfolio."
            : emptyStateCopy.description}
        </p>
      </div>

      {!isLoading ? (
        <div className="space-y-6 p-5 sm:p-8">
          {snapshot.hasMeaningfulCoverage ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <Metric
                  label="Portfolio coverage"
                  value={formatPortfolioPercent(snapshot.coveragePercentOfInvested)}
                />
                <Metric
                  label="Weighted implied upside"
                  value={formatUpsideLabel(snapshot.weightedImpliedUpsidePercent)}
                />
                <Metric
                  label="Covered holdings"
                  value={String(snapshot.coveredHoldingsCount)}
                />
                <Metric
                  label="Most bullish covered holding"
                  value={
                    snapshot.mostBullish
                      ? `${snapshot.mostBullish.symbol} · ${formatUpsideLabel(snapshot.mostBullish.impliedUpsidePercent)}`
                      : "—"
                  }
                />
                <Metric
                  label="Most cautious covered holding"
                  value={
                    snapshot.mostCautious
                      ? `${snapshot.mostCautious.symbol} · ${formatUpsideLabel(snapshot.mostCautious.impliedUpsidePercent)}`
                      : "—"
                  }
                />
                <Metric
                  label="Data completeness"
                  value={formatPortfolioPercent(snapshot.dataCompletenessPercent)}
                />
              </div>

              {snapshot.rankedHoldings.length > 0 ? (
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                    Holdings ranked by implied upside
                  </p>
                  <div className="mt-4 space-y-3">
                    {snapshot.rankedHoldings.slice(0, 6).map((item) => (
                      <div
                        key={item.symbol}
                        className="flex flex-col gap-2 rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-black">{item.symbol}</p>
                          <p className="truncate text-sm text-slate-500">{item.name}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${consensusBadgeClass(item.consensusRating)}`}
                          >
                            {formatConsensusRating(item.consensusRating)}
                          </span>
                          <span className="text-sm font-bold text-slate-950">
                            {formatUpsideLabel(item.impliedUpsidePercent)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {snapshot.recentActions.length > 0 ? (
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                    Recent upgrades and downgrades
                  </p>
                  <div className="mt-4 space-y-3">
                    {snapshot.recentActions.slice(0, 5).map((action) => (
                      <article
                        key={action.id}
                        className="rounded-[18px] border border-slate-200 px-4 py-3"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-black">{action.symbol}</p>
                          <span className="rounded-full bg-violet-50 px-2 py-0.5 text-xs font-bold text-violet-800">
                            {formatActionType(action.actionType)}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-slate-600">
                          {action.firm ?? action.sourceName}
                          {action.previousValue && action.newValue
                            ? ` · ${action.previousValue} → ${action.newValue}`
                            : ""}
                        </p>
                        <p className="mt-2 text-xs leading-5 text-slate-500">
                          {action.whyItMatters}
                        </p>
                      </article>
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <p className="text-sm leading-6 text-slate-600">
              {snapshot.observations[0] ?? emptyStateCopy.body}
            </p>
          )}

          {snapshot.observations.length > 0 && snapshot.hasMeaningfulCoverage ? (
            <div className="rounded-[24px] bg-slate-950 px-5 py-5 text-white sm:px-6">
              <div className="flex items-start gap-3">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-violet-300" />
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                    Observations
                  </p>
                  <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-200">
                    {snapshot.observations.map((observation, index) => (
                      <li key={`${index}-${observation.slice(0, 32)}`}>{observation}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ) : null}

          <p className="text-xs leading-5 text-slate-500">
            {ANALYST_DISCLAIMER}
            {snapshot.source && snapshot.updatedAt
              ? ` Source: ${snapshot.source}. Last updated ${formatShortDate(snapshot.updatedAt)}.`
              : ""}
          </p>
        </div>
      ) : null}
    </section>
  );
}

export function HoldingAnalystMeta({
  quote,
  currentPriceEur,
  impliedUpsidePercent,
}: {
  quote: AnalystApiQuote;
  currentPriceEur: number | null;
  impliedUpsidePercent: number | null;
}) {
  const [expanded, setExpanded] = useState(false);

  if (!hasAnalystCoverage(quote)) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-violet-100 bg-violet-50/50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${consensusBadgeClass(quote.consensusRating)}`}
          >
            {formatConsensusRating(quote.consensusRating)}
          </span>
          <span
            className={`text-sm font-bold ${
              (impliedUpsidePercent ?? 0) >= 0
                ? "text-emerald-700"
                : "text-red-700"
            }`}
          >
            {formatUpsideLabel(impliedUpsidePercent)} vs target
          </span>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="inline-flex min-h-[44px] items-center gap-1 rounded-xl px-3 text-xs font-bold text-violet-800 hover:bg-violet-100"
          aria-expanded={expanded}
          aria-label={expanded ? "Hide analyst details" : "Show analyst details"}
        >
          Details
          <ChevronDown
            className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      {expanded ? (
        <div className="mt-3 grid gap-2 border-t border-violet-100 pt-3 sm:grid-cols-2">
          <MiniStat
            label="Avg. price target"
            value={
              quote.averagePriceTarget != null
                ? formatPortfolioCurrency(quote.averagePriceTarget)
                : "—"
            }
          />
          <MiniStat label="Analysts" value={String(quote.analystCount)} />
          <MiniStat
            label="Target range"
            value={
              quote.lowPriceTarget != null && quote.highPriceTarget != null
                ? `${formatPortfolioCurrency(quote.lowPriceTarget)} – ${formatPortfolioCurrency(quote.highPriceTarget)}`
                : "—"
            }
          />
          <MiniStat
            label="Current price"
            value={
              currentPriceEur != null
                ? formatPortfolioCurrency(currentPriceEur)
                : "Price pending"
            }
          />
          <MiniStat
            label="Last updated"
            value={formatShortDate(quote.updatedAt)}
          />
          <MiniStat label="Source" value={quote.source} />
          <p className="sm:col-span-2 text-[11px] leading-5 text-slate-500">
            {ANALYST_DISCLAIMER}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-4">
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-sm font-black text-slate-950">{value}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-[0.1em] text-violet-800/70">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-bold text-violet-950">{value}</p>
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

function formatActionType(actionType: PortfolioAnalystSnapshot["recentActions"][number]["actionType"]) {
  return actionType
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getAnalystEmptyStateCopy(snapshot: PortfolioAnalystSnapshot): {
  title: string;
  description: string;
  body: string;
} {
  if (snapshot.coverageState === "provider_unavailable") {
    return {
      title: "Analyst data unavailable",
      description:
        "Live analyst coverage could not be loaded right now. Cached data will be shown when available.",
      body: "Analyst data is temporarily unavailable. Your portfolio view will update automatically when provider access is restored.",
    };
  }

  if (snapshot.coverageState === "cached" && snapshot.updatedAt) {
    return {
      title: "Limited analyst coverage",
      description:
        "Showing the latest cached analyst data while live refresh is pending.",
      body: "Traditional analyst coverage is not available for most funds, ETCs and crypto assets.",
    };
  }

  return {
    title: "Limited analyst coverage",
    description:
      "Traditional analyst coverage is not available for most funds, ETCs and crypto assets.",
    body: "Analyst opinion is not available for most of this portfolio because it primarily contains funds, ETCs or crypto assets.",
  };
}
