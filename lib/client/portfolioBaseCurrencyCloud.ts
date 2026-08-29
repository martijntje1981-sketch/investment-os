/**
 * Cloud read/update for portfolio base currency via Supabase RLS.
 * Updates only `base_currency` — never replaces preferences JSON.
 */

import {
  DEFAULT_PORTFOLIO_BASE_CURRENCY,
  normalizePortfolioBaseCurrency,
  type PortfolioBaseCurrency,
} from "@/lib/types/portfolioBaseCurrency";

/** Minimal Supabase query builder surface used by Phase A. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type UserSettingsBaseCurrencyClient = { from: (table: string) => any };

export async function fetchPortfolioBaseCurrency(
  client: UserSettingsBaseCurrencyClient,
  userId: string,
): Promise<PortfolioBaseCurrency> {
  const { data, error } = await client
    .from("user_settings")
    .select("base_currency")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "Could not load portfolio base currency.");
  }

  if (!data) {
    return DEFAULT_PORTFOLIO_BASE_CURRENCY;
  }

  return normalizePortfolioBaseCurrency(data.base_currency);
}

/**
 * Persist base currency with a column-only UPDATE so preferences and other
 * settings columns remain untouched. Never inserts a duplicate settings row
 * when the row already exists.
 */
export async function updatePortfolioBaseCurrency(
  client: UserSettingsBaseCurrencyClient,
  userId: string,
  currency: unknown,
): Promise<PortfolioBaseCurrency> {
  const next = normalizePortfolioBaseCurrency(currency);

  const { data, error } = await client
    .from("user_settings")
    .update({ base_currency: next })
    .eq("user_id", userId)
    .select("base_currency")
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "Could not save portfolio base currency.");
  }

  if (!data) {
    throw new Error(
      "Your account settings were not found. Please refresh and try again.",
    );
  }

  return normalizePortfolioBaseCurrency(data.base_currency);
}

/** Pure helper mirroring SQL allowlist for signup persistence tests. */
export function simulateHandleNewUserBaseCurrency(
  metadata: Record<string, unknown> | null | undefined,
): PortfolioBaseCurrency {
  const raw = metadata?.base_currency;
  return normalizePortfolioBaseCurrency(raw);
}
