import { CONTRIBUTION_HOLDING_OR_PORTFOLIO_MESSAGE } from "@/lib/services/contributions/destination";
import {
  mapDbContributionToEntry,
  sortContributionsByDateDesc,
} from "@/lib/services/contributions/mappers";
import type {
  ContributionEntryDraft,
  ContributionHoldingOption,
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

const CONTRIBUTION_SELECT =
  "id, portfolio_id, user_id, entry_type, amount, currency, base_currency, base_amount, fx_rate_used, entry_date, note, source, destination_type, destination_holding_id, destination_holding_symbol, destination_quantity, destination_price_per_unit, destination_fee, created_at, updated_at";

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

async function assertOwnedHolding(
  client: PortfolioContributionsClient,
  userId: string,
  holdingId: string,
): Promise<{ id: string; symbol: string }> {
  const { data, error } = await client
    .from("holdings")
    .select("id, symbol, user_id, asset_type, deleted_at")
    .eq("id", holdingId)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "Could not verify holding.");
  }

  if (!data?.id) {
    throw new Error("Selected holding is not in your portfolio.");
  }

  if (data.asset_type === "cash") {
    throw new Error(CONTRIBUTION_HOLDING_OR_PORTFOLIO_MESSAGE);
  }

  return {
    id: data.id as string,
    symbol: String(data.symbol ?? "").trim(),
  };
}

function destinationPayload(draft: ContributionEntryDraft) {
  if (draft.destinationType !== "holding") {
    return {
      destination_type: "cash" as const,
      destination_holding_id: null,
      destination_holding_symbol: null,
      destination_quantity: null,
      destination_price_per_unit: null,
      destination_fee: null,
    };
  }

  return {
    destination_type: "holding" as const,
    destination_holding_id: draft.destinationHoldingId,
    destination_holding_symbol: draft.destinationHoldingSymbol,
    destination_quantity: draft.destinationQuantity,
    destination_price_per_unit: draft.destinationPricePerUnit,
    destination_fee: draft.destinationFee,
  };
}

export async function listPortfolioContributions(
  client: PortfolioContributionsClient,
  userId: string,
): Promise<PortfolioContributionEntry[]> {
  const { data, error } = await client
    .from("portfolio_contributions")
    .select(CONTRIBUTION_SELECT)
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
  options?: {
    allowedHoldings?: ContributionHoldingOption[];
  },
): Promise<PortfolioContributionEntry> {
  const validation = validateContributionDraft(
    draft,
    portfolioBaseCurrency,
    options,
  );
  if (!validation.ok) {
    throw new Error(validation.message);
  }

  let validatedDraft = validation.draft;
  if (validatedDraft.destinationType === "holding") {
    const holding = await assertOwnedHolding(
      client,
      userId,
      validatedDraft.destinationHoldingId!,
    );
    if (!holding.symbol) {
      throw new Error("Selected holding is missing a symbol.");
    }
    validatedDraft = {
      ...validatedDraft,
      destinationHoldingId: holding.id,
      destinationHoldingSymbol: holding.symbol,
    };
  }

  const portfolioId = await getPrimaryPortfolioId(client, userId);
  const currencyFields = buildContributionCurrencyFields(
    validatedDraft,
    portfolioBaseCurrency,
  );

  const { data, error } = await client
    .from("portfolio_contributions")
    .insert({
      portfolio_id: portfolioId,
      user_id: userId,
      entry_type: validatedDraft.entryType,
      amount: currencyFields.amount,
      currency: currencyFields.currency,
      base_currency: currencyFields.baseCurrency,
      base_amount: currencyFields.baseAmount,
      fx_rate_used: currencyFields.fxRateUsed,
      entry_date: validatedDraft.entryDate,
      note: validatedDraft.note,
      source: validatedDraft.source,
      ...destinationPayload(validatedDraft),
    })
    .select(CONTRIBUTION_SELECT)
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
  options?: {
    allowedHoldings?: ContributionHoldingOption[];
  },
): Promise<PortfolioContributionEntry> {
  const validation = validateContributionDraft(
    draft,
    portfolioBaseCurrency,
    options,
  );
  if (!validation.ok) {
    throw new Error(validation.message);
  }

  let validatedDraft = validation.draft;
  if (validatedDraft.destinationType === "holding") {
    const holding = await assertOwnedHolding(
      client,
      userId,
      validatedDraft.destinationHoldingId!,
    );
    if (!holding.symbol) {
      throw new Error("Selected holding is missing a symbol.");
    }
    validatedDraft = {
      ...validatedDraft,
      destinationHoldingId: holding.id,
      destinationHoldingSymbol: holding.symbol,
    };
  }

  const currencyFields = buildContributionCurrencyFields(
    validatedDraft,
    portfolioBaseCurrency,
  );

  const { data, error } = await client
    .from("portfolio_contributions")
    .update({
      entry_type: validatedDraft.entryType,
      amount: currencyFields.amount,
      currency: currencyFields.currency,
      base_currency: currencyFields.baseCurrency,
      base_amount: currencyFields.baseAmount,
      fx_rate_used: currencyFields.fxRateUsed,
      entry_date: validatedDraft.entryDate,
      note: validatedDraft.note,
      source: validatedDraft.source,
      ...destinationPayload(validatedDraft),
    })
    .eq("id", entryId)
    .eq("user_id", userId)
    .select(CONTRIBUTION_SELECT)
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
