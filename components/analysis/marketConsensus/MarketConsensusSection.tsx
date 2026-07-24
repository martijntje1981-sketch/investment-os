"use client";

import { useMemo } from "react";
import { Users } from "lucide-react";

import { MarketConsensusHoldingCard } from "@/components/analysis/marketConsensus/MarketConsensusHoldingCard";
import { MarketConsensusPortfolioSummary } from "@/components/analysis/marketConsensus/MarketConsensusPortfolioSummary";
import {
  appSectionBodyClass,
  appSectionLabelClass,
  appSectionTitleClass,
} from "@/components/layout/appSurface";
import { buildMarketConsensusViewModel } from "@/lib/client/marketConsensus/buildMarketConsensusViewModel";
import { useMarketConsensus } from "@/lib/client/marketConsensus/useMarketConsensus";
import { MARKET_CONSENSUS_DISCLAIMER } from "@/lib/client/marketConsensus/types";
import type { PortfolioAnalysisSnapshot } from "@/lib/client/portfolioAnalysis";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

export function MarketConsensusSection({
  analysis,
  holdings,
  userSub,
}: {
  analysis: PortfolioAnalysisSnapshot;
  holdings: StoredPortfolioHolding[];
  userSub: string | null;
}) {
  const { results, summary, isLoading } = useMarketConsensus(
    holdings,
    userSub,
    holdings.length > 0,
  );

  const viewModel = useMemo(
    () =>
      buildMarketConsensusViewModel({
        valuedPositions: analysis.valuedPositions,
        unvaluedHoldings: analysis.unvaluedHoldings,
        results,
        summary,
        isLoading,
      }),
    [
      analysis.unvaluedHoldings,
      analysis.valuedPositions,
      isLoading,
      results,
      summary,
    ],
  );

  const investmentCards = viewModel.holdingCards.filter(
    (card) => !card.id.startsWith("demo-"),
  );
  const previewCards = viewModel.holdingCards.filter((card) =>
    card.id.startsWith("demo-"),
  );

  return (
    <section
      className="mt-7 min-w-0 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm"
      aria-labelledby="market-consensus-heading"
    >
      <div className="border-b border-slate-200 bg-gradient-to-br from-sky-700 to-slate-950 px-5 py-6 text-white sm:px-8">
        <div
          className={`inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 ${appSectionLabelClass} text-sky-100`}
        >
          <Users className="h-3.5 w-3.5" aria-hidden="true" />
          Market consensus
        </div>
        <h2 id="market-consensus-heading" className={`mt-4 ${appSectionTitleClass} text-white`}>
          Market consensus
        </h2>
        <p className={`mt-3 max-w-3xl ${appSectionBodyClass} text-slate-300`}>
          See how third-party analysts and market research currently assess the
          holdings in your portfolio. Consensus data reflects external opinions
          and is not an Investment OS recommendation.
        </p>
      </div>

      <div className="space-y-6 p-5 sm:p-8">
        {viewModel.showDevPreviewBanner ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            Development preview: cards and metrics marked{" "}
            <span className="font-bold">Demo data</span> are illustrative only and
            are never shown in production.
          </div>
        ) : null}

        <MarketConsensusPortfolioSummary summary={viewModel.portfolioSummary} />

        {investmentCards.length > 0 ? (
          <div className="space-y-4">
            <div>
              <h3 className={appSectionTitleClass}>Holdings</h3>
              <p className={`mt-1.5 ${appSectionBodyClass}`}>
                Coverage status for investments in your portfolio.
              </p>
            </div>
            <div className="grid min-w-0 gap-4 lg:grid-cols-2">
              {investmentCards.map((card) => (
                <MarketConsensusHoldingCard key={card.id} card={card} />
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-5 py-6">
            <p className={appSectionTitleClass}>No investment holdings yet</p>
            <p className={`mt-2 ${appSectionBodyClass}`}>
              Add investment holdings to your portfolio to see consensus coverage
              cards here.
            </p>
          </div>
        )}

        {previewCards.length > 0 ? (
          <div className="space-y-4 border-t border-slate-200 pt-6">
            <div>
              <h3 className={appSectionTitleClass}>UI state preview</h3>
              <p className={`mt-1.5 ${appSectionBodyClass}`}>
                Development-only examples of supported card states. These cards use
                synthetic tickers and demo figures.
              </p>
            </div>
            <div className="grid min-w-0 gap-4 lg:grid-cols-2">
              {previewCards.map((card) => (
                <MarketConsensusHoldingCard key={card.id} card={card} />
              ))}
            </div>
          </div>
        ) : null}

        <p className={`${appSectionBodyClass} text-slate-600`}>
          {MARKET_CONSENSUS_DISCLAIMER}
        </p>
      </div>
    </section>
  );
}
