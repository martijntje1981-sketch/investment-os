import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

export type MarketConsensusCardState =
  | "equity_coverage"
  | "etf_outlook"
  | "crypto_outlook"
  | "no_coverage"
  | "loading"
  | "error";

export type MarketConsensusStatusLabel =
  | "Positive consensus"
  | "Neutral consensus"
  | "Mixed consensus"
  | "Negative consensus"
  | "Underlying market outlook"
  | "Market outlook"
  | "Limited coverage";

export type MarketConsensusCoverageType =
  | "Analyst coverage"
  | "Underlying market outlook"
  | "Market outlook"
  | "Limited coverage"
  | "No reliable coverage";

export type MarketConsensusRatingDistribution = {
  buy: number;
  hold: number;
  sell: number;
};

export type MarketConsensusHoldingCardModel = {
  id: string;
  state: MarketConsensusCardState;
  symbol: string;
  name: string;
  weightPercent: number | null;
  currentValueLabel: string | null;
  coverageType: MarketConsensusCoverageType;
  statusLabel: MarketConsensusStatusLabel | null;
  analystAgreementLabel: string | null;
  ratingDistribution: MarketConsensusRatingDistribution | null;
  priceTargetLabel: string | null;
  impliedUpsideLabel: string | null;
  summary: string;
  supportingFactors: string[];
  keyRisks: string[];
  sourceLabel: string | null;
  updatedAtLabel: string | null;
  cryptoDisclaimer?: string;
  unavailableTitle?: string;
  unavailableCopy?: string;
  errorMessage?: string;
  isDemoData: boolean;
  narrativeLabel?: string | null;
  narrativeTooltip?: string | null;
  holding?: StoredPortfolioHolding;
};

export type MarketConsensusPortfolioSummaryModel = {
  summary: string;
  holdingsWithCoverage: number | null;
  positiveConsensus: number | null;
  mixedConsensus: number | null;
  limitedCoverage: number | null;
  isDemoData: boolean;
};

export type MarketConsensusViewModel = {
  showDevPreviewBanner: boolean;
  portfolioSummary: MarketConsensusPortfolioSummaryModel;
  holdingCards: MarketConsensusHoldingCardModel[];
};

export const MARKET_CONSENSUS_DISCLAIMER =
  "Market consensus and price targets are based on third-party data and may be incomplete, delayed or subject to change. They are provided for informational purposes only and do not constitute investment advice, a recommendation or a guarantee of future performance. AI-generated summaries explain available data but do not independently assess whether an investment is suitable for you.";

export const MARKET_CONSENSUS_CRYPTO_DISCLAIMER =
  "Crypto forecasts are less standardized than equity analyst targets and can vary significantly.";

export const MARKET_CONSENSUS_UNAVAILABLE_TITLE =
  "No reliable consensus data available";

export const MARKET_CONSENSUS_UNAVAILABLE_COPY =
  "We could not find sufficiently reliable third-party analyst coverage for this holding. Your performance and allocation data remain available.";

export const MARKET_CONSENSUS_NARRATIVE_TOOLTIP =
  "AI summarizes available third-party data and does not provide investment advice.";
