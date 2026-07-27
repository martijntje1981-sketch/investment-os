import {
  MarketConsensusDemoBadge,
} from "@/components/analysis/marketConsensus/MarketConsensusStatusBadge";
import {
  appCardValueClass,
  appSectionBodyClass,
  appSectionLabelClass,
  appSectionMetaClass,
  appSectionTitleClass,
} from "@/components/layout/appSurface";
import {
  MARKET_CONSENSUS_ELIGIBLE_HELPER,
  type MarketConsensusPortfolioSummaryModel,
} from "@/lib/client/marketConsensus/types";

function SummaryMetric({
  label,
  value,
  isDemoData,
  deemphasized = false,
}: {
  label: string;
  value: number | null;
  isDemoData: boolean;
  deemphasized?: boolean;
}) {
  return (
    <div
      className={`min-w-0 flex items-baseline justify-between gap-2 sm:block sm:text-center ${
        deemphasized ? "opacity-55" : ""
      }`}
    >
      <p className={`${appSectionLabelClass} text-[11px]`}>{label}</p>
      <p className={`sm:mt-1.5 ${appCardValueClass} text-base`}>
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
  const eligible = summary.eligibleHoldings ?? 0;
  const zeroEligible = eligible === 0;

  return (
    <article className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className={appSectionTitleClass}>Portfolio market outlook</h3>
          <p className={`mt-2 max-w-3xl ${appSectionBodyClass}`}>{summary.summary}</p>
        </div>
        {summary.isDemoData ? <MarketConsensusDemoBadge /> : null}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5 rounded-xl border border-slate-100 bg-slate-50/90 px-3.5 py-3 sm:grid-cols-3 xl:grid-cols-5">
        <SummaryMetric
          label="With coverage"
          value={
            zeroEligible
              ? null
              : summary.holdingsWithCoverage
          }
          isDemoData={summary.isDemoData}
          deemphasized={zeroEligible}
        />
        <SummaryMetric
          label="Positive"
          value={zeroEligible ? null : summary.positiveConsensus}
          isDemoData={summary.isDemoData}
          deemphasized={zeroEligible}
        />
        <SummaryMetric
          label="Mixed"
          value={zeroEligible ? null : summary.mixedConsensus}
          isDemoData={summary.isDemoData}
          deemphasized={zeroEligible}
        />
        <SummaryMetric
          label="No analyst coverage"
          value={zeroEligible ? null : summary.noAnalystCoverage}
          isDemoData={summary.isDemoData}
          deemphasized={zeroEligible}
        />
        <SummaryMetric
          label="Not applicable"
          value={summary.notApplicable}
          isDemoData={summary.isDemoData}
        />
      </div>
      <p className={`mt-3 ${appSectionMetaClass}`} title={MARKET_CONSENSUS_ELIGIBLE_HELPER}>
        {MARKET_CONSENSUS_ELIGIBLE_HELPER}
      </p>
    </article>
  );
}
