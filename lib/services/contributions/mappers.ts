import { normalizePortfolioBaseCurrency } from "@/lib/types/portfolioBaseCurrency";
import type {
  DbPortfolioContributionRow,
  PortfolioContributionEntry,
} from "@/lib/services/contributions/types";

function toNumber(value: number | string | null | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function mapDbContributionToEntry(
  row: DbPortfolioContributionRow,
): PortfolioContributionEntry {
  return {
    id: row.id,
    portfolioId: row.portfolio_id,
    userId: row.user_id,
    entryType: row.entry_type,
    amount: toNumber(row.amount),
    currency: normalizePortfolioBaseCurrency(row.currency),
    baseCurrency: normalizePortfolioBaseCurrency(row.base_currency),
    baseAmount: toNumber(row.base_amount),
    fxRateUsed: toNumber(row.fx_rate_used),
    entryDate: row.entry_date,
    note: row.note,
    source: row.source,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function sortContributionsByDateDesc(
  entries: PortfolioContributionEntry[],
): PortfolioContributionEntry[] {
  return [...entries].sort((left, right) => {
    const dateCompare = right.entryDate.localeCompare(left.entryDate);
    if (dateCompare !== 0) {
      return dateCompare;
    }

    return right.createdAt.localeCompare(left.createdAt);
  });
}
