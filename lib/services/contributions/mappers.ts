import { normalizePortfolioBaseCurrency } from "@/lib/types/portfolioBaseCurrency";
import { normalizeDestinationType } from "@/lib/services/contributions/destination";
import type {
  DbPortfolioContributionRow,
  PortfolioContributionEntry,
} from "@/lib/services/contributions/types";

function toNumber(value: number | string | null | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toOptionalNumber(
  value: number | string | null | undefined,
): number | null {
  if (value == null || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function mapDbContributionToEntry(
  row: DbPortfolioContributionRow,
): PortfolioContributionEntry {
  const destinationType = normalizeDestinationType(row.destination_type);

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
    destinationType,
    destinationHoldingId:
      destinationType === "holding"
        ? row.destination_holding_id ?? null
        : null,
    destinationHoldingSymbol:
      destinationType === "holding"
        ? row.destination_holding_symbol?.trim() || null
        : null,
    destinationQuantity:
      destinationType === "holding"
        ? toOptionalNumber(row.destination_quantity)
        : null,
    destinationPricePerUnit:
      destinationType === "holding"
        ? toOptionalNumber(row.destination_price_per_unit)
        : null,
    destinationFee:
      destinationType === "holding"
        ? toOptionalNumber(row.destination_fee)
        : null,
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
