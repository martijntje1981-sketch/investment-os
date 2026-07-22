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
  /** EODHD exchange used for live quotes when purchase venue differs (e.g. Tradegate). */
  pricingExchange?: string | null;
  providerSymbol?: string | null;
  instrumentName?: string | null;
  matchMethod?: string;
  confirmationSource?: string;
  matchConfidence?: number;
  requiresConfirmation?: boolean;
  matchWarnings?: string[];
  changePercent?: number | null;
  previousClose?: number | null;
  changeAmount?: number | null;
  priceDataStatus?: "live" | "delayed" | "stale" | "unavailable";
  updatedAt?: string;
  /** ISO timestamp when currentPrice was last known to be valid. */
  marketPriceUpdatedAt?: string;
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
  /** @deprecated Use currentPrice — kept for backward compatibility. */
  priceEur: number;
  currentPrice?: number | null;
  previousClose?: number | null;
  change?: number | null;
  changePercent?: number | null;
  currency?: string | null;
  updatedAt?: string | null;
  dataStatus?: "live" | "delayed" | "stale" | "unavailable";
  cacheStatus?: "fresh" | "stale" | "unavailable";
  provider?: string;
  isStale?: boolean;
  unavailableReason?: string | null;
};

export type PriceApiResponse = {
  success?: boolean;
  message?: string;
  prices?: PriceApiQuote[];
  error?: string;
  errors?: string[];
  requested?: number;
  received?: number;
};

export type CachedPortfolioPrice = {
  symbol: string;
  providerSymbol?: string;
  isin?: string | null;
  price: number;
  previousClose?: number | null;
  change?: number | null;
  changePercent?: number | null;
  currency?: string | null;
  dataStatus?: "live" | "delayed" | "stale" | "unavailable";
  updatedAt?: string;
};

export type GoalSettings = {
  targetValue: number;
  targetYear: number;
  monthlyContribution: number;
  expectedAnnualReturn: number;
  /** Optional passive income target for dividend progress tracking. */
  passiveIncomeTarget?: number;
};
