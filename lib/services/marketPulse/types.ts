/**
 * Provider-neutral Market Pulse types.
 * Presentation must not consume raw EODHD payloads.
 */

export type MarketPulseCategory =
  | "crypto"
  | "commodity"
  | "index"
  | "forex"
  | "thematic";

export type MarketPulseAvailability =
  | "available"
  | "partial"
  | "stale"
  | "unavailable"
  | "unsupported";

export type MarketPulseRelationship =
  | "Direct exposure"
  | "Thematic exposure"
  | "Broad-market exposure"
  | "Currency-linked"
  | "Proxy exposure";

export type MarketPulsePeriod = "1W" | "1M" | "3M" | "1Y";

/** Explicit quote / session period — never inferred in the UI. */
export type MarketPulseQuoteChangePeriod =
  | "24h"
  | "previous_close"
  | "previous_eod"
  | "session"
  | "last_session"
  | "1w"
  | "1m"
  | "3m"
  | "1y"
  | "unavailable";

export type MarketPulsePriceSource = "realtime" | "eod" | "unavailable";
export type MarketPulseQuoteRefreshMode = "realtime" | "eod";

export type MarketPulsePoint = {
  date: string;
  value: number;
};

export type MarketPortfolioLink = {
  holdingId: string;
  symbol: string;
  name: string;
  relationship: MarketPulseRelationship;
};

export type MarketPulseAsset = {
  id: string;
  name: string;
  symbol: string;
  category: MarketPulseCategory;
  /** Human-readable instrument / series description. */
  sourceType: string;
  providerSymbol: string;
  /** Canonical current price from quote or last reliable EOD point. */
  price: number | null;
  previousClose: number | null;
  changeAmount: number | null;
  unit: string | null;
  currency: string | null;
  /**
   * Daily / session move for hero + cards.
   * Never filled from chart-period history.
   */
  quoteChangePercent: number | null;
  quoteChangePeriod: MarketPulseQuoteChangePeriod;
  quoteUpdatedAt: string | null;
  /** Whether the displayed price came from realtime or EOD history. */
  priceSource: MarketPulsePriceSource;
  /** How often this asset should re-hit the provider quote path. */
  quoteRefreshMode: MarketPulseQuoteRefreshMode;
  /** Featured-chart period performance (1W / 1M / 3M / 1Y). */
  chartPeriodChangePercent: number | null;
  chartPeriod: MarketPulsePeriod | null;
  /** Momentum bar value — same selected common period as chart, never hero. */
  momentumChangePercent: number | null;
  /**
   * @deprecated Prefer quoteChangePercent. Kept as alias for card display.
   */
  changePercent: number | null;
  /**
   * @deprecated Prefer quoteChangePeriod.
   */
  changePeriod: MarketPulseQuoteChangePeriod | MarketPulsePeriod | "24h" | null;
  change7dPercent: number | null;
  history: MarketPulsePoint[];
  periodHigh: number | null;
  periodLow: number | null;
  dataFrequency: string | null;
  delayed: boolean;
  marketStatus: string | null;
  updatedAt: string | null;
  provider: string;
  availability: MarketPulseAvailability;
  portfolioLinks: MarketPortfolioLink[];
  isProxy: boolean;
  /** Original trading pair when crypto (e.g. BTC/USD). */
  tradingPair: string | null;
  /** Display currency after optional conversion. */
  displayCurrency: string | null;
  displayPrice: number | null;
  conversionApplied: boolean;
  accent: string;
  /** Share of portfolio value linked to this market (0–100). */
  portfolioWeightPercent: number | null;
  /** Deterministic relationship explanation for linked markets. */
  relevanceWhy: string | null;
};

export type MarketPulseHeroDriver = {
  kind: "dominant" | "distributed" | "unavailable";
  marketId: string | null;
  name: string | null;
  changePercent: number | null;
  changePeriod: MarketPulseQuoteChangePeriod | null;
  portfolioWeightPercent: number | null;
  summary: string;
  usesTodayWording: boolean;
};

export type MarketPulseMomentumHighlight = {
  marketId: string;
  name: string;
  changePercent: number;
};

export type MarketSessionStatusRow = {
  id: string;
  label: string;
  state: "open" | "closed" | "opens_soon";
  detail: string;
};

export type MarketPulseInsight = {
  id: string;
  text: string;
};

export type MarketMomentumRow = {
  marketId: string;
  name: string;
  /** Always momentumChangePercent for the selected common period. */
  changePercent: number | null;
  availability: MarketPulseAvailability;
  accent: string;
};

export type MarketPulseSnapshot = {
  generatedAt: string;
  leadInsight: string;
  heroDriver: MarketPulseHeroDriver;
  filter: "all" | "portfolio";
  momentumPeriod: MarketPulsePeriod;
  featuredMarketId: string | null;
  linkedMarkets: MarketPulseAsset[];
  commodities: MarketPulseAsset[];
  crypto: MarketPulseAsset[];
  momentum: MarketMomentumRow[];
  momentumStrongest: MarketPulseMomentumHighlight | null;
  momentumWeakest: MarketPulseMomentumHighlight | null;
  sessionStatus: MarketSessionStatusRow[];
  insights: MarketPulseInsight[];
  excludedMomentumIds: string[];
  dataNotes: string[];
  cryptoRankingMode: "configured_majors" | "live_market_cap";
};

export type MarketPulseCatalogEntry = {
  id: string;
  name: string;
  symbol: string;
  category: MarketPulseCategory;
  sourceType: string;
  providerSymbol: string;
  unit: string | null;
  currency: string | null;
  isProxy: boolean;
  dataFrequency: string;
  tradingPair: string | null;
  accent: string;
  /** Used for history + realtime when supported. */
  supportsRealtime: boolean;
  supportsHistory: boolean;
};
