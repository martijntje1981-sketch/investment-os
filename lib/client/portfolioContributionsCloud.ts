import {
  mapDbContributionToEntry,
  sortContributionsByDateDesc,
} from "@/lib/services/contributions/mappers";
import type {
  ContributionEntryDraft,
  DbPortfolioContributionRow,
  PortfolioContributionEntry,
} from "@/lib/services/contributions/types";
import {
  buildContributionCurrencyFields,
  validateContributionDraft,
} from "@/lib/services/contributions/validation";
import type { PortfolioBaseCurrency } from "@/lib/types/portfolioBaseCurrency";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PortfolioContributionsClient = { from: (table: string) => any };

async function getPrimaryPortfolioId(
  client: PortfolioContributionsClient,
  userId: string,
): Promise<string> {
  const { data, error } = await client
    .from("portfolios")
    .select("id, created_at")
    .eq("user_id", userId)
    .eq("is_primary", true)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "Could not load portfolio.");
  }

  if (!data?.id) {
    throw new Error("Primary portfolio not found.");
  }

  return data.id as string;
}

export async function listPortfolioContributions(
  client: PortfolioContributionsClient,
  userId: string,
): Promise<PortfolioContributionEntry[]> {
  const { data, error } = await client
    .from("portfolio_contributions")
    .select(
      "id, portfolio_id, user_id, entry_type, amount, currency, base_currency, base_amount, fx_rate_used, entry_date, note, source, created_at, updated_at",
    )
    .eq("user_id", userId)
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message || "Could not load contributions.");
  }

  const rows = (data ?? []) as DbPortfolioContributionRow[];
  return sortContributionsByDateDesc(rows.map(mapDbContributionToEntry));
}

export async function createPortfolioContribution(
  client: PortfolioContributionsClient,
  userId: string,
  draft: Partial<ContributionEntryDraft>,
  portfolioBaseCurrency: PortfolioBaseCurrency,
): Promise<PortfolioContributionEntry> {
  const validation = validateContributionDraft(draft, portfolioBaseCurrency);
  if (!validation.ok) {
    throw new Error(validation.message);
  }

  const portfolioId = await getPrimaryPortfolioId(client, userId);
  const currencyFields = buildContributionCurrencyFields(
    validation.draft,
    portfolioBaseCurrency,
  );

  const { data, error } = await client
    .from("portfolio_contributions")
    .insert({
      portfolio_id: portfolioId,
      user_id: userId,
      entry_type: validation.draft.entryType,
      amount: currencyFields.amount,
      currency: currencyFields.currency,
      base_currency: currencyFields.baseCurrency,
      base_amount: currencyFields.baseAmount,
      fx_rate_used: currencyFields.fxRateUsed,
      entry_date: validation.draft.entryDate,
      note: validation.draft.note,
      source: validation.draft.source,
    })
    .select(
      "id, portfolio_id, user_id, entry_type, amount, currency, base_currency, base_amount, fx_rate_used, entry_date, note, source, created_at, updated_at",
    )
    .single();

  if (error) {
    throw new Error(error.message || "Could not save contribution.");
  }

  return mapDbContributionToEntry(data as DbPortfolioContributionRow);
}

export async function updatePortfolioContribution(
  client: PortfolioContributionsClient,
  userId: string,
  entryId: string,
  draft: Partial<ContributionEntryDraft>,
  portfolioBaseCurrency: PortfolioBaseCurrency,
): Promise<PortfolioContributionEntry> {
  const validation = validateContributionDraft(draft, portfolioBaseCurrency);
  if (!validation.ok) {
    throw new Error(validation.message);
  }

  const currencyFields = buildContributionCurrencyFields(
    validation.draft,
    portfolioBaseCurrency,
  );

  const { data, error } = await client
    .from("portfolio_contributions")
    .update({
      entry_type: validation.draft.entryType,
      amount: currencyFields.amount,
      currency: currencyFields.currency,
      base_currency: currencyFields.baseCurrency,
      base_amount: currencyFields.baseAmount,
      fx_rate_used: currencyFields.fxRateUsed,
      entry_date: validation.draft.entryDate,
      note: validation.draft.note,
      source: validation.draft.source,
    })
    .eq("id", entryId)
    .eq("user_id", userId)
    .select(
      "id, portfolio_id, user_id, entry_type, amount, currency, base_currency, base_amount, fx_rate_used, entry_date, note, source, created_at, updated_at",
    )
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "Could not update contribution.");
  }

  if (!data) {
    throw new Error("Contribution entry not found.");
  }

  return mapDbContributionToEntry(data as DbPortfolioContributionRow);
}

export async function deletePortfolioContribution(
  client: PortfolioContributionsClient,
  userId: string,
  entryId: string,
): Promise<void> {
  const { data, error } = await client
    .from("portfolio_contributions")
    .delete()
    .eq("id", entryId)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "Could not delete contribution.");
  }

  if (!data) {
    throw new Error("Contribution entry not found.");
  }
}
