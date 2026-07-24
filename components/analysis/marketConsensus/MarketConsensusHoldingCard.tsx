"use client";

import { useState } from "react";
import { ChevronDown, Info } from "lucide-react";

import {
  MarketConsensusDemoBadge,
  MarketConsensusErrorBadge,
  MarketConsensusStatusBadge,
} from "@/components/analysis/marketConsensus/MarketConsensusStatusBadge";
import {
  appCardValueClass,
  appSectionBodyClass,
  appSectionLabelClass,
  appSectionMetaClass,
  appTableNameClass,
  appTickerClass,
} from "@/components/layout/appSurface";
import { formatMarketConsensusWeightLabel } from "@/lib/client/marketConsensus/buildMarketConsensusViewModel";
import type { MarketConsensusHoldingCardModel } from "@/lib/client/marketConsensus/types";

function HoldingIdentity({
  card,
}: {
  card: MarketConsensusHoldingCardModel;
}) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      <span
        className={`inline-flex shrink-0 rounded-xl px-3 py-2 text-sm font-bold ${
          card.state === "crypto_outlook"
            ? "bg-violet-100 text-violet-900"
            : card.state === "etf_outlook"
              ? "bg-blue-100 text-blue-900"
              : "bg-slate-950 text-white"
        }`}
        aria-hidden="true"
      >
        {card.symbol.slice(0, 6)}
      </span>
      <div className="min-w-0">
        <p className={`truncate ${appTableNameClass}`}>{card.name}</p>
        <p className={`truncate ${appTickerClass}`}>{card.symbol}</p>
      </div>
    </div>
  );
}

function RatingDistribution({
  distribution,
}: {
  distribution: NonNullable<MarketConsensusHoldingCardModel["ratingDistribution"]>;
}) {
  const total = distribution.buy + distribution.hold + distribution.sell;

  return (
    <div className="space-y-2">
      <p className={appSectionLabelClass}>Buy / Hold / Sell distribution</p>
      <div className="grid grid-cols-3 gap-2">
        <DistributionTile label="Buy" value={distribution.buy} total={total} tone="emerald" />
        <DistributionTile label="Hold" value={distribution.hold} total={total} tone="slate" />
        <DistributionTile label="Sell" value={distribution.sell} total={total} tone="rose" />
      </div>
    </div>
  );
}

function DistributionTile({
  label,
  value,
  total,
  tone,
}: {
  label: string;
  value: number;
  total: number;
  tone: "emerald" | "slate" | "rose";
}) {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0;
  const toneClass =
    tone === "emerald"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : tone === "rose"
        ? "border-rose-200 bg-rose-50 text-rose-900"
        : "border-slate-200 bg-slate-50 text-slate-900";

  return (
    <div className={`rounded-2xl border px-3 py-3 ${toneClass}`}>
      <p className="text-[11px] font-bold uppercase tracking-[0.08em]">{label}</p>
      <p className={`mt-1 ${appCardValueClass}`}>{value}</p>
      <p className={`mt-0.5 ${appSectionMetaClass}`}>{percent}%</p>
    </div>
  );
}

function DetailList({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div>
      <p className={appSectionLabelClass}>{title}</p>
      <ul className={`mt-2 space-y-2 ${appSectionBodyClass}`}>
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CardSkeleton() {
  return (
    <article
      className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
      aria-busy="true"
      aria-label="Loading consensus data"
    >
      <div className="animate-pulse motion-reduce:animate-none">
        <div className="flex items-start gap-3">
          <div className="h-11 w-16 rounded-xl bg-slate-100" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-4 w-2/3 rounded bg-slate-100" />
            <div className="h-3 w-1/3 rounded bg-slate-100" />
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="h-16 rounded-2xl bg-slate-100" />
          <div className="h-16 rounded-2xl bg-slate-100" />
        </div>
        <div className="mt-4 h-20 rounded-2xl bg-slate-100" />
      </div>
    </article>
  );
}

function NarrativeSummaryLabel({
  label,
  tooltip,
}: {
  label: string;
  tooltip: string;
}) {
  return (
    <div className="mb-2 flex flex-wrap items-center gap-2">
      <p className={appSectionMetaClass}>{label}</p>
      <button
        type="button"
        className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
        aria-label={tooltip}
        title={tooltip}
      >
        <Info className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

function SummaryBlock({
  card,
}: {
  card: MarketConsensusHoldingCardModel;
}) {
  if (!card.summary) {
    return null;
  }

  return (
    <div>
      {card.narrativeLabel ? (
        <NarrativeSummaryLabel
          label={card.narrativeLabel}
          tooltip={card.narrativeTooltip ?? ""}
        />
      ) : null}
      <p className={appSectionBodyClass}>{card.summary}</p>
    </div>
  );
}

function ExpandedDetails({
  card,
}: {
  card: MarketConsensusHoldingCardModel;
}) {
  return (
    <div className="mt-4 space-y-4 border-t border-slate-200 pt-4">
      {card.ratingDistribution ? (
        <RatingDistribution distribution={card.ratingDistribution} />
      ) : null}

      {card.priceTargetLabel ? (
        <div>
          <p className={appSectionLabelClass}>Third-party price targets</p>
          <p className={`mt-1 ${appSectionBodyClass}`}>{card.priceTargetLabel}</p>
        </div>
      ) : null}

      {card.impliedUpsideLabel ? (
        <div>
          <p className={appSectionLabelClass}>Consensus-implied upside</p>
          <p className={`mt-1 ${appCardValueClass}`}>{card.impliedUpsideLabel}</p>
        </div>
      ) : null}

      {card.summary ? (
        <div>
          <p className={appSectionLabelClass}>Summary</p>
          {card.narrativeLabel ? (
            <NarrativeSummaryLabel
              label={card.narrativeLabel}
              tooltip={card.narrativeTooltip ?? ""}
            />
          ) : null}
          <p className={`mt-1 ${appSectionBodyClass}`}>{card.summary}</p>
        </div>
      ) : null}

      <DetailList title="Supporting factors" items={card.supportingFactors} />
      <DetailList title="Key risks" items={card.keyRisks} />

      {card.cryptoDisclaimer ? (
        <p className={`rounded-2xl border border-violet-100 bg-violet-50 px-4 py-3 ${appSectionBodyClass} text-violet-950`}>
          {card.cryptoDisclaimer}
        </p>
      ) : null}

      {(card.sourceLabel || card.updatedAtLabel) && (
        <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:gap-x-4">
          {card.sourceLabel ? (
            <p className={appSectionMetaClass}>Source: {card.sourceLabel}</p>
          ) : null}
          {card.updatedAtLabel ? (
            <p className={appSectionMetaClass}>Updated: {card.updatedAtLabel}</p>
          ) : null}
        </div>
      )}
    </div>
  );
}

export function MarketConsensusHoldingCard({
  card,
}: {
  card: MarketConsensusHoldingCardModel;
}) {
  const [expanded, setExpanded] = useState(false);

  if (card.state === "loading") {
    return <CardSkeleton />;
  }

  const weightLabel = formatMarketConsensusWeightLabel(
    card.weightPercent,
    card.currentValueLabel,
  );
  const showUnavailable =
    card.state === "no_coverage" && card.unavailableTitle != null;
  const showLimitedSummary =
    card.state === "no_coverage" &&
    !showUnavailable &&
    Boolean(card.summary);
  const hasExpandableDetails =
    card.state === "equity_coverage" ||
    card.state === "etf_outlook" ||
    card.state === "crypto_outlook";

  return (
    <article className="min-w-0 rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <HoldingIdentity card={card} />
          <div className="flex flex-wrap items-center gap-2">
            {card.isDemoData ? <MarketConsensusDemoBadge /> : null}
            {card.statusLabel ? (
              <MarketConsensusStatusBadge label={card.statusLabel} />
            ) : null}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <MetricTile label="Portfolio weight / value" value={weightLabel} />
          <MetricTile label="Coverage type" value={card.coverageType} />
          {card.analystAgreementLabel ? (
            <MetricTile label="Analyst agreement" value={card.analystAgreementLabel} />
          ) : null}
        </div>

        {card.errorMessage ? (
          <MarketConsensusErrorBadge message={card.errorMessage} />
        ) : null}

        {showUnavailable ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <p className={appCardValueClass}>{card.unavailableTitle}</p>
            <p className={`mt-2 ${appSectionBodyClass}`}>
              {card.unavailableCopy ?? card.summary}
            </p>
          </div>
        ) : card.state === "etf_outlook" || card.state === "crypto_outlook" ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <SummaryBlock card={card} />
            {card.cryptoDisclaimer ? (
              <p className={`mt-3 ${appSectionBodyClass} text-violet-900`}>
                {card.cryptoDisclaimer}
              </p>
            ) : null}
          </div>
        ) : showLimitedSummary ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <SummaryBlock card={card} />
          </div>
        ) : null}

        {hasExpandableDetails ? (
          <>
            <div className="hidden sm:block">
              <ExpandedDetails card={card} />
            </div>

            <div className="sm:hidden">
              <button
                type="button"
                onClick={() => setExpanded((value) => !value)}
                className="inline-flex min-h-[44px] w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900"
                aria-expanded={expanded}
                aria-controls={`consensus-details-${card.id}`}
              >
                {expanded ? "Hide details" : "Show details"}
                <ChevronDown
                  className={`h-4 w-4 transition-transform motion-reduce:transition-none ${
                    expanded ? "rotate-180" : ""
                  }`}
                  aria-hidden="true"
                />
              </button>
              {expanded ? (
                <div id={`consensus-details-${card.id}`}>
                  <ExpandedDetails card={card} />
                </div>
              ) : null}
            </div>
          </>
        ) : null}
      </div>
    </article>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3">
      <p className={appSectionLabelClass}>{label}</p>
      <p className={`mt-1 break-words ${appCardValueClass}`}>{value}</p>
    </div>
  );
}
