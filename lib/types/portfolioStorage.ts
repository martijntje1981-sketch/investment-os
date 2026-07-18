/**
 * Shared portfolio storage types and constants used by portfolio,
 * dashboard, briefing, goals, and the pricing API.
 */

export {
  LEGACY_ANNUAL_CONTRIBUTION_KEY,
  LEGACY_GOAL_STORAGE_KEY,
  LEGACY_PORTFOLIO_STORAGE_KEY,
  LEGACY_PRICE_CACHE_KEY,
  PORTFOLIO_HOLDINGS_UPDATED_EVENT,
  annualContributionKey,
  goalStorageKey,
  portfolioStorageKey,
  priceCacheKey,
} from "@/lib/client/portfolioStorageKeys";

/** @deprecated Use portfolioStorageKey(userSub) for authenticated storage. */
export const PORTFOLIO_STORAGE_KEY = "investment-os-holdings";

/** @deprecated Use priceCacheKey(userSub) for authenticated storage. */
export const PRICE_CACHE_KEY = "investment-os-market-price-cache";

/** A portfolio row persisted in localStorage. */
export type StoredPortfolioHolding = {
  id: string;
  symbol: string;
  name: string;
  quantity: number;
  purchasePrice: number;
  currentPrice: number;
  currency: "EUR";
  assetType?: "investment" | "cash";
  isin?: string | null;
  exchange?: string | null;
  providerSymbol?: string | null;
  instrumentName?: string | null;
  matchMethod?: string;
  matchConfidence?: number;
  requiresConfirmation?: boolean;
  matchWarnings?: string[];
  changePercent?: number;
  updatedAt?: string;
};

/** Payload sent to POST /api/prices and POST /api/briefing. */
export type PortfolioInstrumentPayload = {
  symbol: string;
  name?: string;
  isin?: string | null;
  exchange?: string | null;
  providerSymbol?: string | null;
  instrumentName?: string | null;
};

export type PriceApiQuote = {
  symbol: string;
  providerSymbol?: string;
  eodhdSymbol?: string;
  isin?: string | null;
  priceEur: number;
  changePercent?: number | null;
  updatedAt?: string;
};

export type PriceApiResponse = {
  success?: boolean;
  prices?: PriceApiQuote[];
  error?: string;
};

export type CachedPortfolioPrice = {
  symbol: string;
  providerSymbol?: string;
  isin?: string | null;
  price: number;
  changePercent?: number;
  updatedAt?: string;
};

export type GoalSettings = {
  targetValue: number;
  targetYear: number;
  monthlyContribution: number;
  expectedAnnualReturn: number;
};
