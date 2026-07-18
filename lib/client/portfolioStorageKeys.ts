/**
 * User-scoped localStorage keys for portfolio state.
 *
 * Supabase Auth exposes a stable `user.id` (UUID) — the equivalent of a
 * Cognito `sub`. All portfolio keys are scoped to that identifier.
 */

/** Legacy unscoped key — legacy test/demo data; never read for authenticated users. */
export const LEGACY_PORTFOLIO_STORAGE_KEY = "investment-os-holdings";
export const LEGACY_PRICE_CACHE_KEY = "investment-os-market-price-cache";
export const LEGACY_GOAL_STORAGE_KEY = "investment-os-goal";
export const LEGACY_ANNUAL_CONTRIBUTION_KEY = "investment-os-annual-contribution";

export const PORTFOLIO_HOLDINGS_UPDATED_EVENT =
  "investment-os-holdings-updated";

export const LEGACY_MIGRATION_SESSION_FLAG =
  "investment-os-request-legacy-migration";

export function isValidUserSub(
  userSub: string | null | undefined,
): userSub is string {
  return typeof userSub === "string" && userSub.trim().length > 0;
}

export function assertUserSub(
  userSub: string | null | undefined,
): asserts userSub is string {
  if (!isValidUserSub(userSub)) {
    throw new Error(
      "Authenticated user sub is required for portfolio storage.",
    );
  }
}

export function portfolioStorageKey(userSub: string): string {
  assertUserSub(userSub);
  return `investment-os-holdings:${userSub}`;
}

export function priceCacheKey(userSub: string): string {
  assertUserSub(userSub);
  return `investment-os-market-price-cache:${userSub}`;
}

export function goalStorageKey(userSub: string): string {
  assertUserSub(userSub);
  return `investment-os-goal:${userSub}`;
}

export function annualContributionKey(userSub: string): string {
  assertUserSub(userSub);
  return `investment-os-annual-contribution:${userSub}`;
}

export function legacyMigrationFlagKey(userSub: string): string {
  assertUserSub(userSub);
  return `investment-os-legacy-migrated:${userSub}`;
}
