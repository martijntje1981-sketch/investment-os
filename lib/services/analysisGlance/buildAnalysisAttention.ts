/**
 * Rank 0–3 Analysis attention items from existing structure engines.
 * Numbers first — does not invent exposures, advice, or forecasts.
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
import { DASHBOARD_DEEP_LINKS } from "@/lib/navigation/deepLinks";
import { isBitcoinHolding } from "@/lib/services/classification";
import type { PortfolioScenarioExposureProfile } from "@/lib/services/scenarioRelevance";
import {
  ANALYSIS_BLOCK_LIMITED_COPY,
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
    return {
      items: [],
      quietMessage: ANALYSIS_BLOCK_LIMITED_COPY,
      limited: true,
    };
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
    const bitcoinLinked =
      holding.assetType === "crypto" && isBitcoinHolding(holding);
    candidates.push(
      ranked(
        {
          id: "holding_dominance",
          value: formatPortfolioPercent(largest.weightPercent),
          label: bitcoinLinked
            ? "Bitcoin-linked exposure"
            : holding.assetType === "cash"
              ? holding.name
              : `${holding.symbol} exposure`,
          implication: bitcoinLinked
            ? "Portfolio behaviour is dominated by one sleeve."
            : "One position can outweigh moves across the rest of the portfolio.",
          href: DASHBOARD_DEEP_LINKS.portfolioAllocation,
          hrefLabel: "Explore allocation",
          tone: "caution",
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
          value: formatPortfolioPercent(topThree),
          label: "Top three positions",
          implication:
            "Diversification is lower than the holding count suggests.",
          href: DASHBOARD_DEEP_LINKS.portfolioExposure,
          hrefLabel: "Explore exposure",
          tone: "caution",
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
          value: formatPortfolioPercent(crypto),
          label: "Classified crypto",
          implication: "Crypto moves can outweigh the rest of the mix.",
          href: DASHBOARD_DEEP_LINKS.portfolioExposure,
          hrefLabel: "Explore exposure",
          tone: "caution",
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
          value: formatPortfolioPercent(cash),
          label: "Cash",
          implication: "A large share is not in market-priced holdings.",
          href: DASHBOARD_DEEP_LINKS.cashIntelligence,
          hrefLabel: "Explore cash",
          tone: "info",
        },
        cash,
      ),
    );
  } else if (cash > 0 && cash <= OBSERVATION_LOW_CASH_THRESHOLD) {
    candidates.push(
      ranked(
        {
          id: "cash_buffer_low",
          value: formatPortfolioPercent(cash),
          label: "Cash",
          implication: "Cash is a small share of current portfolio value.",
          href: DASHBOARD_DEEP_LINKS.cashIntelligence,
          hrefLabel: "Explore cash",
          tone: "info",
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
          value: formatPortfolioPercent(fi),
          label: "Fixed income",
          implication: "Bond-price moves can affect a meaningful share of the mix.",
          href: DASHBOARD_DEEP_LINKS.bondsRates,
          hrefLabel: "Explore bonds & rates",
          tone: "info",
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
          value: formatPortfolioPercent(unclassified),
          label: "Unclassified",
          implication: "Structure conclusions for that sleeve stay limited.",
          href: DASHBOARD_DEEP_LINKS.portfolioExposure,
          hrefLabel: "Explore exposure",
          tone: "caution",
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
    .map(({ id, value, label, implication, href, hrefLabel, tone }) => ({
      id,
      value,
      label,
      implication,
      href,
      hrefLabel,
      tone,
    }));

  assertNoAnalysisGlanceAdvisoryLanguage(
    items.flatMap((item) => [item.label, item.implication]),
  );

  if (items.length === 0) {
    return {
      items: [],
      quietMessage: ANALYSIS_QUIET_ATTENTION_COPY,
      limited: false,
    };
  }

  return { items, quietMessage: null, limited: false };
}
