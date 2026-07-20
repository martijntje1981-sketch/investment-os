/**
 * Dividend Intelligence types — shared across API, services, and UI.
 */

export type DividendFrequency =
  | "monthly"
  | "quarterly"
  | "semi_annual"
  | "annual"
  | "unknown";

export type DividendApiQuote = {
  symbol: string;
  providerSymbol: string;
  paysDividends: boolean;
  dividendYield: number | null;
  forwardAnnualDividendRate: number | null;
  estimatedAnnualDividendEur: number | null;
  estimatedNextPaymentEur: number | null;
  nextExDate: string | null;
  nextPaymentDate: string | null;
  frequency: DividendFrequency;
  currency: string | null;
  updatedAt: string;
};

export type DividendAllocationItem = {
  symbol: string;
  name: string;
  incomeEur: number;
  sharePercent: number;
};

export type DividendNextPayment = {
  symbol: string;
  name: string;
  paymentDate: string;
  amountEur: number;
};

export type PortfolioDividendSnapshot = {
  hasDividendData: boolean;
  estimatedAnnualIncomeEur: number;
  portfolioYieldPercent: number;
  payingHoldingsCount: number;
  averageYieldPercent: number;
  highestYield: {
    symbol: string;
    name: string;
    yieldPercent: number;
  } | null;
  largestContributor: DividendAllocationItem | null;
  concentrationSharePercent: number;
  incomeDiversificationLabel: "well_diversified" | "moderate" | "concentrated";
  allocation: DividendAllocationItem[];
  nextPayment: DividendNextPayment | null;
  observations: string[];
  insight: string;
  updatedAt: string | null;
};

export type DividendApiResponse = {
  success: boolean;
  quotes?: DividendApiQuote[];
  error?: string;
};

export type CachedDividendQuote = DividendApiQuote;
