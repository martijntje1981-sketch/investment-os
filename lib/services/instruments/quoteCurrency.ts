/**
 * Central provider quote currency resolution.
 *
 * Keeps purchase currency (EUR portfolio base), provider quote currency,
 * and user display currency separate. Never infers from exchange suffix alone.
 */

import { lookupVerifiedByProviderSymbol } from "@/lib/services/instruments/verifiedInstrumentRegistry";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";
import type { PriceCurrency } from "@/lib/services/prices/types";

export const QUOTE_CURRENCY_REVIEW_WARNING =
  "Quote currency could not be verified for this listing. Confirm the exact provider listing before live pricing.";

const SUPPORTED_QUOTE_CURRENCIES = new Set<PriceCurrency>([
  "EUR",
  "USD",
  "GBP",
  "CHF",
]);

export type QuoteCurrencySource =
  | "live_quote"
  | "persisted_listing"
  | "verified_registry"
  | "unresolved";

export type QuoteCurrencyResolution = {
  currency: PriceCurrency | null;
  source: QuoteCurrencySource;
  requiresReview: boolean;
};

export function normalizeProviderQuoteCurrency(
  value: string | null | undefined,
): PriceCurrency | null {
  const normalized = value?.trim().toUpperCase();
  if (!normalized || !SUPPORTED_QUOTE_CURRENCIES.has(normalized as PriceCurrency)) {
    return null;
  }
  return normalized as PriceCurrency;
}

export function resolveListingQuoteCurrency(input: {
  liveQuoteCurrency?: string | null;
  persistedQuoteCurrency?: PriceCurrency | null;
  providerSymbol?: string | null;
}): QuoteCurrencyResolution {
  const live = normalizeProviderQuoteCurrency(input.liveQuoteCurrency);
  if (live) {
    return {
      currency: live,
      source: "live_quote",
      requiresReview: false,
    };
  }

  if (input.persistedQuoteCurrency) {
    return {
      currency: input.persistedQuoteCurrency,
      source: "persisted_listing",
      requiresReview: false,
    };
  }

  const verified = lookupVerifiedByProviderSymbol(input.providerSymbol);
  if (verified?.quoteCurrency) {
    return {
      currency: verified.quoteCurrency,
      source: "verified_registry",
      requiresReview: false,
    };
  }

  return {
    currency: null,
    source: "unresolved",
    requiresReview: true,
  };
}

/** @deprecated Prefer resolveListingQuoteCurrency with persisted/live inputs. */
export function resolveQuoteCurrencyForProviderSymbol(
  providerSymbol: string | null | undefined,
): PriceCurrency | null {
  return resolveListingQuoteCurrency({ providerSymbol }).currency;
}

export function resolveMatchQuoteCurrency(input: {
  providerCurrency?: string | null;
  providerSymbol?: string | null;
}): PriceCurrency | null {
  return resolveListingQuoteCurrency({
    liveQuoteCurrency: input.providerCurrency,
    providerSymbol: input.providerSymbol,
  }).currency;
}

export function backfillListingQuoteCurrency(
  holding: StoredPortfolioHolding,
): StoredPortfolioHolding {
  if (holding.assetType === "cash") {
    return holding;
  }

  if (holding.quoteCurrency) {
    return holding;
  }

  const resolution = resolveListingQuoteCurrency({
    providerSymbol: holding.providerSymbol,
  });

  if (resolution.currency) {
    return {
      ...holding,
      quoteCurrency: resolution.currency,
    };
  }

  if (!holding.providerSymbol?.trim()) {
    return holding;
  }

  const warnings = new Set(holding.matchWarnings ?? []);
  warnings.add(QUOTE_CURRENCY_REVIEW_WARNING);

  return {
    ...holding,
    requiresConfirmation: true,
    matchWarnings: [...warnings],
  };
}

export function backfillListingQuoteCurrencies(
  holdings: StoredPortfolioHolding[],
): StoredPortfolioHolding[] {
  return holdings.map(backfillListingQuoteCurrency);
}

export function listingQuoteCurrenciesChanged(
  before: StoredPortfolioHolding[],
  after: StoredPortfolioHolding[],
): boolean {
  if (before.length !== after.length) {
    return false;
  }

  return after.some((holding, index) => {
    const previous = before[index];
    if (!previous) {
      return true;
    }
    return holding.quoteCurrency !== previous.quoteCurrency;
  });
}
