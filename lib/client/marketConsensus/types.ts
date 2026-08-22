import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

export type MarketConsensusCardState =
  | "equity_coverage"
  | "partial_equity_coverage"
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
  | "Analyst coverage"
  | "No analyst coverage"
  | "Underlying market outlook"
  | "Theme-level outlook"
  | "Asset-class outlook"
  | "Market outlook"
  | "Partial analyst coverage"
  | "Analyst data temporarily unavailable"
  | "Symbol could not be resolved";

export type MarketConsensusCoverageType =
  | "Analyst coverage"
  | "Underlying market outlook"
  | "Theme-level outlook"
  | "Asset-class outlook"
  | "Market outlook"
  | "No analyst coverage"
  | "Not applicable"
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
  targetCurrencyNote?: string | null;
  analystCountLabel?: string | null;
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
  negativeConsensus: number | null;
  noAnalystCoverage: number | null;
  /** True unavailable only — cash-adjacent edge cases; ETFs/crypto use marketOutlook. */
  notApplicable: number | null;
  /** Funds/ETPs/ETCs/crypto using outlook-derived coverage. */
  marketOutlook: number | null;
  eligibleHoldings: number | null;
  providerUnavailable: number | null;
  symbolMappingIssues: number | null;
  /** @deprecated Prefer noAnalystCoverage */
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

export const MARKET_CONSENSUS_UNAVAILABLE_TITLE = "No analyst coverage";

export const MARKET_CONSENSUS_UNAVAILABLE_COPY =
  "No verified third-party analyst coverage was returned for this company share. Your performance and allocation data remain available.";

export const MARKET_CONSENSUS_NARRATIVE_TOOLTIP =
  "AI summarizes available third-party data and does not provide investment advice.";

export const MARKET_CONSENSUS_ELIGIBLE_HELPER =
  "Analyst rating counts use consensus-eligible company equities. Funds, ETPs, ETCs and crypto-linked instruments use underlying, theme-level or asset-class market outlook — not single-security analyst ratings.";
