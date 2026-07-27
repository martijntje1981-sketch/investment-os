import { formatRegistryExchangeLabel } from "@/lib/services/instruments/exchangeRegistry";
import type { ResolvedInstrument } from "@/lib/types/instrument";

export const LIVE_PRICING_AUTO_SELECTED_COPY =
  "Automatically selected from a verified listing.";

export const MANUAL_PRICING_SELECTION_TITLE =
  "Choose the listing Investment OS should use for live prices.";

export type HoldingVenuePresentation = {
  purchaseExchangeCode: string | null;
  purchaseExchangeLabel: string | null;
  pricingExchangeCode: string | null;
  pricingExchangeLabel: string | null;
  providerSymbol: string | null;
  instrumentName: string | null;
  autoSelectedPricing: boolean;
  needsManualPricingSelection: boolean;
};

export function resolveLivePricingExchangeCode(input: {
  exchange?: string | null;
  pricingExchange?: string | null;
  providerSymbol?: string | null;
}): string | null {
  if (input.pricingExchange?.trim()) {
    return input.pricingExchange.trim().toUpperCase();
  }

  const provider = input.providerSymbol?.trim();
  if (provider?.includes(".")) {
    const suffix = provider.slice(provider.lastIndexOf(".") + 1).trim();
    if (suffix) return suffix.toUpperCase();
  }

  return null;
}

/**
 * True when the user still needs to pick a live pricing listing.
 * Deterministic provider symbols must not open a selector.
 */
export function needsManualPricingSelection(input: {
  providerSymbol?: string | null;
  candidates?: ReadonlyArray<Pick<ResolvedInstrument, "providerSymbol">> | null;
}): boolean {
  if (input.providerSymbol?.trim()) {
    return false;
  }

  const candidateCount = (input.candidates ?? []).filter((candidate) =>
    Boolean(candidate.providerSymbol?.trim()),
  ).length;

  return candidateCount > 0;
}

export function buildHoldingVenuePresentation(input: {
  exchange?: string | null;
  pricingExchange?: string | null;
  providerSymbol?: string | null;
  instrumentName?: string | null;
  name?: string | null;
  candidates?: ReadonlyArray<Pick<ResolvedInstrument, "providerSymbol">> | null;
  confirmationSource?: string | null;
}): HoldingVenuePresentation {
  const purchaseExchangeCode = input.exchange?.trim()
    ? input.exchange.trim().toUpperCase()
    : null;
  const pricingExchangeCode = resolveLivePricingExchangeCode(input);
  const providerSymbol = input.providerSymbol?.trim()
    ? input.providerSymbol.trim().toUpperCase()
    : null;
  const autoSelectedPricing =
    Boolean(providerSymbol) &&
    (input.confirmationSource === "verified_mapping" ||
      (Boolean(input.pricingExchange?.trim()) &&
        input.confirmationSource !== "user_candidate" &&
        input.confirmationSource !== "manual_exact_listing" &&
        input.confirmationSource !== "manual_entry"));

  return {
    purchaseExchangeCode,
    purchaseExchangeLabel: purchaseExchangeCode
      ? formatRegistryExchangeLabel(purchaseExchangeCode)
      : null,
    pricingExchangeCode,
    pricingExchangeLabel: pricingExchangeCode
      ? formatRegistryExchangeLabel(pricingExchangeCode)
      : null,
    providerSymbol,
    instrumentName: input.instrumentName?.trim() || input.name?.trim() || null,
    autoSelectedPricing,
    needsManualPricingSelection: needsManualPricingSelection(input),
  };
}
