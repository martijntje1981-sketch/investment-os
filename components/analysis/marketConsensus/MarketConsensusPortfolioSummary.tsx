import {
  MarketConsensusDemoBadge,
} from "@/components/analysis/marketConsensus/MarketConsensusStatusBadge";
import {
  appCardValueClass,
  appSectionBodyClass,
  appSectionLabelClass,
  appSectionTitleClass,
} from "@/components/layout/appSurface";
import type { MarketConsensusPortfolioSummaryModel } from "@/lib/client/marketConsensus/types";

function SummaryMetric({
  label,
  value,
  isDemoData,
}: {
  label: string;
  value: number | null;
  isDemoData: boolean;
}) {
  return (
    <div className="min-w-0 rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-4">
      <p className={appSectionLabelClass}>{label}</p>
      <p className={`mt-2 ${appCardValueClass}`}>
        {value ?? "—"}
        {isDemoData && value != null ? (
          <span className="ml-1 text-xs font-bold text-amber-800">(Demo)</span>
        ) : null}
      </p>
    </div>
  );
}

export function MarketConsensusPortfolioSummary({
  summary,
}: {
  summary: MarketConsensusPortfolioSummaryModel;
}) {
  return (
    <article className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className={appSectionTitleClass}>Portfolio market outlook</h3>
          <p className={`mt-2 max-w-3xl ${appSectionBodyClass}`}>{summary.summary}</p>
        </div>
        {summary.isDemoData ? <MarketConsensusDemoBadge /> : null}
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryMetric
          label="Holdings with coverage"
          value={summary.holdingsWithCoverage}
          isDemoData={summary.isDemoData}
        />
        <SummaryMetric
          label="Positive consensus"
          value={summary.positiveConsensus}
          isDemoData={summary.isDemoData}
        />
        <SummaryMetric
          label="Mixed consensus"
          value={summary.mixedConsensus}
          isDemoData={summary.isDemoData}
        />
        <SummaryMetric
          label="Limited coverage"
          value={summary.limitedCoverage}
          isDemoData={summary.isDemoData}
        />
      </div>
    </article>
  );
}
