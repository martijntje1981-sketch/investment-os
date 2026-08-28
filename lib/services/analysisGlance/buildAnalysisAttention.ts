/**
 * Rank 0–3 Analysis attention items from existing structure engines.
 * Implications only — does not invent exposures, advice, or forecasts.
 */

import {
  OBSERVATION_HIGH_CASH_THRESHOLD,
  OBSERVATION_LARGEST_WEIGHT_THRESHOLD,
  OBSERVATION_LOW_CASH_THRESHOLD,
  OBSERVATION_SMALL_HOLDINGS_COUNT,
  OBSERVATION_TOP3_WEIGHT_THRESHOLD,
  formatPortfolioPercent,
  type PortfolioAnalysisSnapshot,
} from "@/lib/client/portfolioAnalysis";
import type { PortfolioValuationCoverage } from "@/lib/client/portfolioValuationCoverage";
import {
  DASHBOARD_DEEP_LINKS,
} from "@/lib/navigation/deepLinks";
import { isBitcoinHolding } from "@/lib/services/classification";
import type { PortfolioScenarioExposureProfile } from "@/lib/services/scenarioRelevance";
import {
  ANALYSIS_INCOMPLETE_COVERAGE_COPY,
  ANALYSIS_QUIET_ATTENTION_COPY,
  type AnalysisAttentionItem,
  type AnalysisAttentionView,
} from "@/lib/services/analysisGlance/types";
import { assertNoAnalysisGlanceAdvisoryLanguage } from "@/lib/services/analysisGlance/wording";

const UNCLASSIFIED_ATTENTION_MIN = 20;
const RATE_PRESENT_MIN_FI = 10;

type RankedItem = AnalysisAttentionItem & { materiality: number };

function ranked(
  item: AnalysisAttentionItem,
  materiality: number,
): RankedItem {
  return { ...item, materiality };
}

export function buildAnalysisAttention(input: {
  coverage: PortfolioValuationCoverage;
  analysis: PortfolioAnalysisSnapshot;
  profile: PortfolioScenarioExposureProfile;
}): AnalysisAttentionView {
  if (!input.coverage.allowsValuationConclusions) {
    const item: AnalysisAttentionItem = {
      id: "coverage_incomplete",
      title: "Prices are still settling",
      body: ANALYSIS_INCOMPLETE_COVERAGE_COPY,
      href: DASHBOARD_DEEP_LINKS.portfolioAllocation,
      hrefLabel: "Explore allocation",
    };
    assertNoAnalysisGlanceAdvisoryLanguage([item.title, item.body]);
    return { items: [item], quietMessage: null };
  }

  const candidates: RankedItem[] = [];
  const largest = input.analysis.largestPosition;
  const investmentCount = input.analysis.investmentCount;
  const topThree = input.analysis.topThreeWeightPercent;
  const cash = input.profile.cashWeightPercent;
  const fi = input.profile.fixedIncomeWeightPercent;
  const crypto = input.profile.cryptoWeightPercent;
  const bitcoin = input.profile.bitcoinWeightPercent;
  const unclassified = input.profile.unclassifiedWeightPercent;

  if (largest && largest.weightPercent >= OBSERVATION_LARGEST_WEIGHT_THRESHOLD) {
    const holding = largest.holding;
    const weight = formatPortfolioPercent(largest.weightPercent);
    const bitcoinLinked =
      holding.assetType === "crypto" && isBitcoinHolding(holding);
    const remainder = formatPortfolioPercent(
      Math.max(0, 100 - largest.weightPercent),
    );
    candidates.push(
      ranked(
        {
          id: "holding_dominance",
          title: bitcoinLinked
            ? "Bitcoin dominates portfolio behaviour"
            : `${holding.assetType === "cash" ? holding.name : holding.symbol} dominates portfolio behaviour`,
          body: bitcoinLinked
            ? `Around ${weight} of the portfolio is Bitcoin-linked, so Bitcoin movements can outweigh moves across the rest of the portfolio (${remainder}).`
            : `${holding.assetType === "cash" ? holding.name : holding.symbol} is about ${weight} of valued portfolio weight, so its moves can outweigh the remaining ${remainder}.`,
          href: DASHBOARD_DEEP_LINKS.portfolioAllocation,
          hrefLabel: "Explore allocation",
        },
        largest.weightPercent,
      ),
    );
  }

  if (
    topThree >= OBSERVATION_TOP3_WEIGHT_THRESHOLD &&
    investmentCount > OBSERVATION_SMALL_HOLDINGS_COUNT
  ) {
    candidates.push(
      ranked(
        {
          id: "top3_vs_count",
          title: "Diversification is lower than the holding count suggests",
          body: `${investmentCount} positions are recorded, but the top three represent ${formatPortfolioPercent(topThree)} of portfolio value.`,
          href: DASHBOARD_DEEP_LINKS.portfolioExposure,
          hrefLabel: "Explore exposure",
        },
        topThree * 0.85,
      ),
    );
  }

  const dominanceCoversCrypto =
    candidates.some((item) => item.id === "holding_dominance") &&
    bitcoin >= crypto * 0.85 &&
    crypto >= 25;
  if (crypto >= 25 && !dominanceCoversCrypto) {
    candidates.push(
      ranked(
        {
          id: "crypto_sleeve",
          title: "Crypto exposure can drive portfolio behaviour",
          body: `Classified crypto is about ${formatPortfolioPercent(crypto)} of portfolio value, so crypto moves can outweigh the rest of the mix.`,
          href: DASHBOARD_DEEP_LINKS.portfolioExposure,
          hrefLabel: "Explore exposure",
        },
        crypto * 0.9,
      ),
    );
  }

  if (cash >= OBSERVATION_HIGH_CASH_THRESHOLD) {
    candidates.push(
      ranked(
        {
          id: "cash_buffer_high",
          title: "Cash is a large share of current value",
          body: `Cash is about ${formatPortfolioPercent(cash)} of the valued portfolio, so a large share is not in market-priced holdings.`,
          href: DASHBOARD_DEEP_LINKS.cashIntelligence,
          hrefLabel: "Explore cash intelligence",
        },
        cash,
      ),
    );
  } else if (cash > 0 && cash <= OBSERVATION_LOW_CASH_THRESHOLD) {
    candidates.push(
      ranked(
        {
          id: "cash_buffer_low",
          title: "Cash is a small share of current value",
          body: `Cash is about ${formatPortfolioPercent(cash)} of the valued portfolio.`,
          href: DASHBOARD_DEEP_LINKS.cashIntelligence,
          hrefLabel: "Explore cash intelligence",
        },
        12,
      ),
    );
  }

  if (fi >= RATE_PRESENT_MIN_FI) {
    candidates.push(
      ranked(
        {
          id: "rate_sensitivity_present",
          title: "Fixed income is a material sleeve",
          body: `Classified fixed income is about ${formatPortfolioPercent(fi)} of portfolio value, so bond-price moves can affect a meaningful share of the mix.`,
          href: DASHBOARD_DEEP_LINKS.bondsRates,
          hrefLabel: "Explore bonds & rates",
        },
        fi,
      ),
    );
  }

  if (unclassified >= UNCLASSIFIED_ATTENTION_MIN) {
    candidates.push(
      ranked(
        {
          id: "unclassified_share",
          title: "A material share is unclassified",
          body: `About ${formatPortfolioPercent(unclassified)} of valued weight is unclassified, so structure conclusions for that sleeve stay limited.`,
          href: DASHBOARD_DEEP_LINKS.portfolioExposure,
          hrefLabel: "Explore exposure",
        },
        unclassified * 0.7,
      ),
    );
  }

  const items = [...candidates]
    .sort((left, right) => {
      if (right.materiality !== left.materiality) {
        return right.materiality - left.materiality;
      }
      return left.id.localeCompare(right.id);
    })
    .slice(0, 3)
    .map(({ id, title, body, href, hrefLabel }) => ({
      id,
      title,
      body,
      href,
      hrefLabel,
    }));

  const texts = items.flatMap((item) => [item.title, item.body]);
  assertNoAnalysisGlanceAdvisoryLanguage(texts);

  if (items.length === 0) {
    return { items: [], quietMessage: ANALYSIS_QUIET_ATTENTION_COPY };
  }

  return { items, quietMessage: null };
}
