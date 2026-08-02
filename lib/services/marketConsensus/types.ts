import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

export type ConsensusClassification =
  "positive" | "neutral" | "mixed" | "negative" | "unavailable";

export type CoverageType =
  | "equity-analyst"
  | "underlying-market"
  | "sector-outlook"
  | "crypto-market-outlook"
  | "unavailable";

export type ConsensusAvailability =
  "available" | "limited" | "unavailable" | "error";

export type ConsensusAgreementLevel =
  "high" | "moderate" | "divided" | "limited";

export interface AnalystConsensusResult {
  instrumentId: string;
  symbol?: string;
  coverageType: CoverageType;
  availability: ConsensusAvailability;
  classification: ConsensusClassification;
  analystCount?: number;
  buyCount?: number;
  holdCount?: number;
  sellCount?: number;
  currentPrice?: number;
  averageTarget?: number;
  highTarget?: number;
  lowTarget?: number;
  impliedUpsidePercent?: number;
  agreementLevel?: ConsensusAgreementLevel;
  positiveFactors?: string[];
  riskFactors?: string[];
  summary?: string;
  sourceName?: string;
  sourceUrl?: string;
  updatedAt?: string;
  isStale?: boolean;
  targetCurrency?: string;
  listingCurrency?: string;
  targetCurrencyNote?: string;
  errorCode?: string;
  narrativeSource?: "ai" | "fallback";
}

export type PortfolioConsensusSummary = {
  summary: string;
  holdingsWithCoverage: number;
  positiveConsensus: number;
  mixedConsensus: number;
  /** Eligible equities classified negative (preserved when present). */
  negativeConsensus: number;
  /** Eligible equities with valid routing but no usable analyst data. */
  noAnalystCoverage: number;
  /**
   * True unavailable only (no defensible outlook mapping).
   * Funds/ETPs/crypto with outlook kinds are counted in {@link marketOutlook}.
   */
  notApplicable: number;
  /** Funds, ETPs, ETCs and crypto-linked holdings using outlook-derived coverage. */
  marketOutlook: number;
  /** Company equities eligible for classic analyst consensus. */
  eligibleHoldings: number;
  providerUnavailable: number;
  symbolMappingIssues: number;
  /**
   * @deprecated Prefer {@link noAnalystCoverage}. Kept for transitional callers;
   * equals noAnalystCoverage and no longer includes not-applicable instruments.
   */
  limitedCoverage: number;
  totalInvestments: number;
  providerAvailable: boolean;
  generatedAt: string;
};

export type MarketConsensusApiResponse = {
  success: boolean;
  results: AnalystConsensusResult[];
  summary: PortfolioConsensusSummary;
  providerAvailable: boolean;
  generatedAt: string;
  error?: string;
};

export type MarketConsensusProviderContext = {
  fxRateToEur: number | null;
};

export interface MarketConsensusProvider {
  id: string;
  supports(
    holding: Pick<
      StoredPortfolioHolding,
      "name" | "symbol" | "providerSymbol" | "assetType"
    >,
  ): boolean;
  getConsensus(
    holding: StoredPortfolioHolding,
    context: MarketConsensusProviderContext,
  ): Promise<AnalystConsensusResult>;
}

export const MARKET_CONSENSUS_CACHE_TTL_MS = {
  available: 24 * 60 * 60 * 1000,
  unavailable: 12 * 60 * 60 * 1000,
  error: 30 * 60 * 1000,
} as const;
