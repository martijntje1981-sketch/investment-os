import type { PortfolioBaseCurrency } from "@/lib/types/portfolioBaseCurrency";

export type ContributionEntryType = "contribution" | "withdrawal";

export type ContributionSource = "manual" | "opening_balance" | "import";

export type ContributionDestinationType = "cash" | "holding";

export type PortfolioContributionEntry = {
  id: string;
  portfolioId: string;
  userId: string;
  entryType: ContributionEntryType;
  amount: number;
  currency: PortfolioBaseCurrency;
  baseCurrency: PortfolioBaseCurrency;
  baseAmount: number;
  fxRateUsed: number;
  entryDate: string;
  note: string | null;
  source: ContributionSource;
  destinationType: ContributionDestinationType;
  destinationHoldingId: string | null;
  destinationHoldingSymbol: string | null;
  destinationQuantity: number | null;
  destinationPricePerUnit: number | null;
  destinationFee: number | null;
  createdAt: string;
  updatedAt: string;
};

export type ContributionSummary = {
  totalContributed: number;
  totalWithdrawn: number;
  netContributed: number;
  currentValue: number | null;
  valueAboveContributions: number | null;
  valueAboveContributionsPercent: number | null;
  contributionCount: number;
  withdrawalCount: number;
  hasContributionData: boolean;
  /**
   * False when the ledger does not establish a credible funding basis
   * (no opening balance and net contributed is a small share of portfolio value).
   */
  contributionBasisReliable: boolean;
};

export type ContributionEntryDraft = {
  entryType: ContributionEntryType;
  amount: number;
  currency: PortfolioBaseCurrency;
  entryDate: string;
  note: string | null;
  source: ContributionSource;
  destinationType: ContributionDestinationType;
  destinationHoldingId: string | null;
  destinationHoldingSymbol: string | null;
  destinationQuantity: number | null;
  destinationPricePerUnit: number | null;
  destinationFee: number | null;
};

export type ContributionHoldingOption = {
  id: string;
  symbol: string;
  name: string;
  assetType?: "investment" | "cash" | "crypto";
};

export type DbPortfolioContributionRow = {
  id: string;
  portfolio_id: string;
  user_id: string;
  entry_type: ContributionEntryType;
  amount: number | string;
  currency: string;
  base_currency: string;
  base_amount: number | string;
  fx_rate_used: number | string;
  entry_date: string;
  note: string | null;
  source: ContributionSource;
  destination_type?: ContributionDestinationType | null;
  destination_holding_id?: string | null;
  destination_holding_symbol?: string | null;
  destination_quantity?: number | string | null;
  destination_price_per_unit?: number | string | null;
  destination_fee?: number | string | null;
  created_at: string;
  updated_at: string;
};
