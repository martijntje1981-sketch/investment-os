/**
 * Portfolio reporting / display base currency preference (Phase A).
 * Monetary ledger amounts remain EUR until Phase B conversion.
 */

export const PORTFOLIO_BASE_CURRENCIES = ["EUR", "USD", "GBP"] as const;

export type PortfolioBaseCurrency = (typeof PORTFOLIO_BASE_CURRENCIES)[number];

export const DEFAULT_PORTFOLIO_BASE_CURRENCY: PortfolioBaseCurrency = "EUR";

export const PORTFOLIO_BASE_CURRENCY_OPTIONS: ReadonlyArray<{
  value: PortfolioBaseCurrency;
  label: string;
}> = [
  { value: "EUR", label: "Euro (EUR)" },
  { value: "USD", label: "US Dollar (USD)" },
  { value: "GBP", label: "British Pound (GBP)" },
];

/** Auth signup metadata key — allowlisted values only. */
export const SIGNUP_BASE_CURRENCY_METADATA_KEY = "base_currency";

export function isPortfolioBaseCurrency(
  value: unknown,
): value is PortfolioBaseCurrency {
  return (
    typeof value === "string" &&
    (PORTFOLIO_BASE_CURRENCIES as readonly string[]).includes(
      value.trim().toUpperCase(),
    )
  );
}

/**
 * Strict normalization. Invalid, blank, or arbitrary ISO codes fall back to EUR.
 * Never accepts unchecked three-letter strings.
 */
export function normalizePortfolioBaseCurrency(
  value: unknown,
): PortfolioBaseCurrency {
  if (typeof value !== "string") {
    return DEFAULT_PORTFOLIO_BASE_CURRENCY;
  }

  const normalized = value.trim().toUpperCase();
  if (
    (PORTFOLIO_BASE_CURRENCIES as readonly string[]).includes(normalized)
  ) {
    return normalized as PortfolioBaseCurrency;
  }

  return DEFAULT_PORTFOLIO_BASE_CURRENCY;
}

/**
 * Resolve currency from auth signup metadata without trusting raw client data.
 * Only the allowlisted key is read; invalid values become EUR.
 */
export function resolveSignupBaseCurrencyFromMetadata(
  metadata: unknown,
): PortfolioBaseCurrency {
  if (!metadata || typeof metadata !== "object") {
    return DEFAULT_PORTFOLIO_BASE_CURRENCY;
  }

  const record = metadata as Record<string, unknown>;
  return normalizePortfolioBaseCurrency(
    record[SIGNUP_BASE_CURRENCY_METADATA_KEY],
  );
}

/** Build allowlisted signup user_metadata for Supabase Auth. */
export function buildSignupUserMetadata(input: {
  fullName: string;
  baseCurrency: unknown;
}): { full_name: string; base_currency: PortfolioBaseCurrency } {
  return {
    full_name: input.fullName,
    base_currency: normalizePortfolioBaseCurrency(input.baseCurrency),
  };
}

export function portfolioBaseCurrencyLabel(
  currency: PortfolioBaseCurrency,
): string {
  return (
    PORTFOLIO_BASE_CURRENCY_OPTIONS.find((option) => option.value === currency)
      ?.label ?? PORTFOLIO_BASE_CURRENCY_OPTIONS[0]!.label
  );
}

/** Compact currency symbol for monetary input prefixes. */
export function portfolioBaseCurrencySymbol(
  currency: PortfolioBaseCurrency,
): string {
  switch (currency) {
    case "USD":
      return "$";
    case "GBP":
      return "£";
    default:
      return "€";
  }
}
