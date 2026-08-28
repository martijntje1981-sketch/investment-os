"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { DividendIntelligenceSection } from "@/components/analysis/DividendIntelligenceSection";
import { CashIntelligenceSection } from "@/components/analysis/CashIntelligenceSection";
import { CryptoIntelligenceSection } from "@/components/analysis/CryptoIntelligenceSection";
import { BondsRatesSection } from "@/components/analysis/BondsRatesSection";
import { PortfolioExposureSection } from "@/components/analysis/PortfolioExposureSection";
import { PortfolioXRaySection } from "@/components/analysis/PortfolioXRaySection";
import { ScenarioStressSection } from "@/components/analysis/ScenarioStressSection";
import { PortfolioPerformanceSection } from "@/components/analysis/performance/PortfolioPerformanceSection";
import { MarketConsensusSection } from "@/components/analysis/marketConsensus/MarketConsensusSection";
import { TopPerformersByCategorySection } from "@/components/analysis/TopPerformersByCategorySection";
import { AnalysisOnTrackGateway } from "@/components/analysis/fourQuestions/AnalysisOnTrackGateway";
import { PortfolioAllocationSection } from "@/components/analysis/PortfolioAllocationSection";
import { PortfolioConcentrationSection } from "@/components/analysis/PortfolioConcentrationSection";
import {
  appAnalysisDarkBodyClass,
  appAnalysisDarkDisclaimerClass,
  appAnalysisDarkTitleClass,
  appCardClass,
  appCardPaddingClass,
  appDarkCardClass,
  appDarkCardPaddingClass,
  appDashboardDarkMetaClass,
  appHeroMetricLabelClass,
  appSectionMetaClass,
  appSectionTitleClass,
  appTableNameClass,
  appTextLinkClass,
} from "@/components/layout/appSurface";
import { ANALYSIS_PATH, PORTFOLIO_HISTORY_PATH } from "@/lib/navigation/appRoutes";
import { SECTION_IDS } from "@/lib/navigation/deepLinks";
import type { PortfolioAnalysisSnapshot } from "@/lib/client/portfolioAnalysis";
import type { ClientProductAccess } from "@/lib/client/useProductAccess";
import type { PortfolioExposureAllocation } from "@/lib/services/classification";
import {
  analysisDetailTitle,
  type AnalysisDetailId,
} from "@/lib/services/analysisGlance";
import type { GoalRealityCheck } from "@/lib/services/goals/buildGoalRealityCheck";
import type { GoalProgress } from "@/lib/services/goals/goalProgressEngine";
import type { ProductAccess } from "@/lib/services/productAccess";
import type { DividendApiQuote } from "@/lib/types/dividends";
import type { DistributionPolicyUserOverride } from "@/lib/types/distributionPolicy";
import type { NewsContentItem } from "@/lib/types/newsContent";
import type { PassiveIncomeUserEstimate } from "@/lib/types/passiveIncomeUserEstimate";
import type {
  GoalSettings,
  StoredPortfolioHolding,
} from "@/lib/types/portfolioStorage";

type RatePolicyContext = Pick<
  NewsContentItem,
  "title" | "canonicalUrl" | "sourceName" | "publishedAt"
> | null;

export type AnalysisDetailViewProps = {
  detailId: AnalysisDetailId;
  holdings: StoredPortfolioHolding[];
  analysis: PortfolioAnalysisSnapshot;
  exposureAllocation: PortfolioExposureAllocation;
  productAccess: ClientProductAccess | ProductAccess;
  userSub: string | null;
  goal: GoalSettings | null;
  hasSavedGoal: boolean;
  persistGoal: (nextGoal: GoalSettings) => void;
  goalProgress: GoalProgress;
  realityCheck: GoalRealityCheck | null;
  ratePolicyContext: RatePolicyContext;
  dividendQuotes: DividendApiQuote[];
  dividendsLoading: boolean;
  formatEur: (value: number) => string;
  onPolicyOverrideChange: (
    holdingId: string,
    value: DistributionPolicyUserOverride,
  ) => void;
  onPassiveIncomeEstimateChange: (
    holdingId: string,
    estimate: PassiveIncomeUserEstimate | null,
  ) => void;
};

function DetailHeader({ title }: { title: string }) {
  return (
    <header className="min-w-0" data-testid="analysis-detail-header">
      <Link
        href={ANALYSIS_PATH}
        onClick={(event) => {
          if (typeof window === "undefined") return;
          if (window.location.pathname !== ANALYSIS_PATH) return;
          if (!window.location.hash) return;
          event.preventDefault();
          window.history.pushState(null, "", ANALYSIS_PATH);
          window.dispatchEvent(new Event("hashchange"));
          window.scrollTo(0, 0);
        }}
        className="inline-flex min-h-11 items-center gap-1.5 text-[14px] font-medium text-white/70 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back to Analysis
      </Link>
      <p className={`mt-2 ${appHeroMetricLabelClass}`}>Analysis</p>
      <h1 className="mt-0.5 text-[1.35rem] font-bold leading-tight tracking-[-0.03em] text-white sm:text-[1.5rem]">
        {title}
      </h1>
      <p className={`mt-0.5 ${appDashboardDarkMetaClass}`}>
        Deeper detail — one module at a time.
      </p>
    </header>
  );
}

function UnvaluedHoldingsCard({
  holdings,
}: {
  holdings: StoredPortfolioHolding[];
}) {
  if (holdings.length === 0) return null;

  return (
    <section className={`${appCardClass} ${appCardPaddingClass}`}>
      <h3 className={appSectionTitleClass}>Excluded from valued totals</h3>
      <p className={`mt-1 ${appSectionMetaClass}`}>
        Visible holdings without a usable price — not counted as zero.
      </p>
      <div className="mt-5 divide-y divide-slate-200 rounded-2xl border border-slate-200">
        {holdings.map((holding) => (
          <div
            key={holding.id}
            className="flex items-center justify-between gap-3 px-4 py-3.5 text-sm text-slate-700"
          >
            <div>
              <p className={appTableNameClass}>{holding.symbol}</p>
              <p className={appSectionMetaClass}>{holding.name}</p>
            </div>
            <p className="font-semibold text-amber-700">Missing usable price</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ObservationsCard({
  observations,
}: {
  observations: string[];
}) {
  return (
    <section className={`${appDarkCardClass} ${appDarkCardPaddingClass}`}>
      <p className={appHeroMetricLabelClass}>Observations</p>
      <h3 className={`mt-2 ${appAnalysisDarkTitleClass}`}>
        Portfolio observations
      </h3>
      {observations.length > 0 ? (
        <ul className={`mt-5 space-y-3 ${appAnalysisDarkBodyClass}`}>
          {observations.map((observation) => (
            <li key={observation} className="flex gap-3">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
              <span>{observation}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className={`mt-5 ${appAnalysisDarkBodyClass}`}>
          Add valued holdings to generate portfolio observations.
        </p>
      )}
      <p className={`mt-6 ${appAnalysisDarkDisclaimerClass}`}>
        These observations describe portfolio structure only. They are not
        financial advice and do not include buy or sell instructions.
      </p>
    </section>
  );
}

export function AnalysisDetailView(props: AnalysisDetailViewProps) {
  return (
    <div
      data-testid="analysis-detail"
      data-detail-id={props.detailId}
      className="space-y-4"
    >
      <DetailHeader title={analysisDetailTitle(props.detailId)} />
      <AnalysisDetailModule {...props} />
    </div>
  );
}

function AnalysisDetailModule({
  detailId,
  holdings,
  analysis,
  exposureAllocation,
  productAccess,
  userSub,
  goal,
  hasSavedGoal,
  persistGoal,
  goalProgress,
  realityCheck,
  ratePolicyContext,
  dividendQuotes,
  dividendsLoading,
  formatEur,
  onPolicyOverrideChange,
  onPassiveIncomeEstimateChange,
}: AnalysisDetailViewProps) {
  switch (detailId) {
    case "portfolio-allocation":
      return (
        <div className="space-y-4">
          <PortfolioAllocationSection
            analysis={analysis}
            formatEur={formatEur}
          />
          <UnvaluedHoldingsCard holdings={analysis.unvaluedHoldings} />
          <ObservationsCard observations={analysis.observations} />
        </div>
      );
    case "portfolio-exposure":
      return (
        <section id={SECTION_IDS.whatMatters} className="scroll-mt-24 space-y-4">
          <PortfolioExposureSection
            allocation={exposureAllocation}
            showSubgroups={productAccess.intelligenceDepth === "complete"}
            ratePolicyContext={ratePolicyContext}
          />
        </section>
      );
    case "portfolio-concentration":
      return (
        <PortfolioConcentrationSection
          analysis={analysis}
          formatEur={formatEur}
        />
      );
    case "portfolio-xray":
      return <PortfolioXRaySection holdings={holdings} />;
    case "portfolio-performance":
      return (
        <section id={SECTION_IDS.whatHappened} className="scroll-mt-24 space-y-4">
          <PortfolioPerformanceSection
            holdings={holdings}
            compositionMeta={{
              investmentCount: analysis.investmentCount,
              cashCurrencyCount: analysis.cashCurrencyCount,
              cashWeightPercent: analysis.cashWeightPercent,
              largestSymbol: analysis.largestPosition?.holding.symbol ?? null,
              largestWeightPercent:
                analysis.largestPosition?.weightPercent ?? null,
            }}
          />
          <TopPerformersByCategorySection holdings={holdings} />
          <p className={appSectionMetaClass}>
            For the full timeline and Portfolio Evolution, open{" "}
            <Link
              href={`${PORTFOLIO_HISTORY_PATH}#portfolio-evolution`}
              className={appTextLinkClass}
            >
              Portfolio History
            </Link>
            .
          </p>
        </section>
      );
    case "crypto-intelligence":
      return (
        <CryptoIntelligenceSection holdings={holdings} userSub={userSub} />
      );
    case "bonds-rates":
      return (
        <BondsRatesSection
          allocation={exposureAllocation}
          holdings={holdings}
          ratePolicyContext={ratePolicyContext}
          intelligenceDepth={productAccess.intelligenceDepth}
        />
      );
    case "cash-intelligence":
      return <CashIntelligenceSection holdings={holdings} />;
    case "dividend-intelligence":
      return (
        <DividendIntelligenceSection
          holdings={holdings}
          quotes={dividendQuotes}
          isLoading={dividendsLoading}
          onPolicyOverrideChange={onPolicyOverrideChange}
          onPassiveIncomeEstimateChange={onPassiveIncomeEstimateChange}
        />
      );
    case "scenario-stress":
      return (
        <section id={SECTION_IDS.whatsAhead} className="scroll-mt-24 space-y-4">
          <ScenarioStressSection
            holdings={holdings}
            goal={goal}
            hasSavedGoal={hasSavedGoal}
            onPersistGoal={persistGoal}
            productAccess={productAccess}
          />
        </section>
      );
    case "market-consensus":
      return (
        <MarketConsensusSection
          analysis={analysis}
          holdings={holdings}
          userSub={userSub}
        />
      );
    case "on-track":
      return (
        <section id={SECTION_IDS.onTrack} className="scroll-mt-24 space-y-4">
          <AnalysisOnTrackGateway
            progress={goalProgress}
            goal={goal}
            realityCheck={realityCheck}
          />
        </section>
      );
    default:
      return null;
  }
}
