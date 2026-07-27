import type { PortfolioBaseCurrency } from "@/lib/types/portfolioBaseCurrency";

export type ContributionEntryType = "contribution" | "withdrawal";

export type ContributionSource = "manual" | "opening_balance" | "import";

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
};

export type ContributionEntryDraft = {
  entryType: ContributionEntryType;
  amount: number;
  currency: PortfolioBaseCurrency;
  entryDate: string;
  note: string | null;
  source: ContributionSource;
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
  created_at: string;
  updated_at: string;
};
