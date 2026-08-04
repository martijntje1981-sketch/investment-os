/**
 * Example portfolio — shared types, email normalization, and period helpers.
 */

export const EXAMPLE_PORTFOLIO_DAYS = 7;

export type ExamplePortfolioTemplate = "global" | "income";

export type ExampleAccountMode = "example" | "standard";

/** Persisted on auth.users.user_metadata for middleware + banner. */
export type ExamplePortfolioUserMetadata = {
  account_mode?: ExampleAccountMode;
  example_portfolio_type?: ExamplePortfolioTemplate | null;
  example_started_at?: string | null;
  example_expires_at?: string | null;
  example_converted_at?: string | null;
  pending_example_template?: ExamplePortfolioTemplate | null;
  /** Set only after a verified example email callback/activation. */
  example_activated_via_email?: boolean | null;
};

export type ExamplePortfolioEntitlement = {
  email_normalized: string;
  user_id: string | null;
  template: ExamplePortfolioTemplate;
  /** Null until activation starts the 7-day clock. */
  started_at: string | null;
  /** Null until activation starts the 7-day clock. */
  expires_at: string | null;
  seeded_at: string | null;
  converted_at: string | null;
};

export function normalizeExampleEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidExampleEmail(email: string): boolean {
  const normalized = normalizeExampleEmail(email);
  // Practical RFC-lite check — reject empty and obvious garbage.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
}

export function isExamplePortfolioTemplate(
  value: unknown,
): value is ExamplePortfolioTemplate {
  return value === "global" || value === "income";
}

export function computeExampleExpiry(
  startedAt: Date,
  days = EXAMPLE_PORTFOLIO_DAYS,
): Date {
  return new Date(startedAt.getTime() + days * 24 * 60 * 60 * 1000);
}

export function getExampleDaysRemaining(
  expiresAtIso: string | null | undefined,
  now = new Date(),
): number {
  if (!expiresAtIso) return 0;
  const expires = Date.parse(expiresAtIso);
  if (!Number.isFinite(expires)) return 0;
  const ms = expires - now.getTime();
  if (ms <= 0) return 0;
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

export function isExampleExpired(
  meta: ExamplePortfolioUserMetadata | null | undefined,
  now = new Date(),
): boolean {
  if (!meta || meta.account_mode !== "example") return false;
  if (meta.example_converted_at) return false;
  if (!meta.example_expires_at) return false;
  return Date.parse(meta.example_expires_at) <= now.getTime();
}

export function isExampleActive(
  meta: ExamplePortfolioUserMetadata | null | undefined,
  now = new Date(),
): boolean {
  if (!meta || meta.account_mode !== "example") return false;
  if (meta.example_converted_at) return false;
  if (!meta.example_expires_at) return false;
  return Date.parse(meta.example_expires_at) > now.getTime();
}

export function formatExampleBannerLabel(
  expiresAtIso: string | null | undefined,
  now = new Date(),
): string {
  // Shared Premium-trial wording — keep countdown math in getExampleDaysRemaining.
  if (!expiresAtIso) return "Premium trial";
  const expires = Date.parse(expiresAtIso);
  if (!Number.isFinite(expires)) return "Premium trial";
  if (expires <= now.getTime()) {
    return "Premium trial ended · Upgrade to continue";
  }

  const expiresLocal = new Date(expires);
  if (expiresLocal.toDateString() === now.toDateString()) {
    return "Premium trial · Expires today";
  }

  const days = getExampleDaysRemaining(expiresAtIso, now);
  if (days <= 0) {
    return "Premium trial ended · Upgrade to continue";
  }
  if (days === 1) {
    return "Premium trial · 1 day remaining";
  }
  return `Premium trial · ${days} days remaining`;
}

/**
 * Dedicated pricing destination until Stripe Checkout + webhooks exist.
 * Must not use `/#pricing` — authenticated `/` redirects to `/dashboard`.
 */
export const EXAMPLE_KEEP_PORTFOLIO_HREF = "/pricing";
