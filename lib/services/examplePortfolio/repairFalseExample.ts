/**
 * Detect and repair false Example Portfolio activations.
 *
 * Root cause: activate treated any non-empty portfolio as "already seeded"
 * and stamped example metadata when a reserved entitlement existed, including
 * normal password sessions via ExamplePortfolioActivator.
 */

import type { SupabaseClient, User } from "@supabase/supabase-js";

import type { ExamplePortfolioEntitlement } from "@/lib/services/examplePortfolio/types";
import { EXAMPLE_HOLDING_ID_PREFIX } from "@/lib/services/examplePortfolio/templates";
import { isEntitlementPeriodExpired } from "@/lib/services/examplePortfolio/entitlements";
import { createPortfolioRepository } from "@/lib/services/portfolio/repository";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

export function hasNonExampleMarketHoldings(
  holdings: Array<Pick<StoredPortfolioHolding, "id" | "assetType">>,
): boolean {
  return holdings.some(
    (holding) =>
      holding.assetType !== "cash" &&
      !holding.id.startsWith(EXAMPLE_HOLDING_ID_PREFIX),
  );
}

/**
 * True when an entitlement clock was started but example seeds were never
 * applied — the user kept their own portfolio while metadata was stamped.
 */
export function isFalseExampleActivation(input: {
  entitlement: ExamplePortfolioEntitlement | null;
  holdings: Array<Pick<StoredPortfolioHolding, "id" | "assetType">>;
  now?: Date;
}): boolean {
  const { entitlement, holdings } = input;
  if (!entitlement?.started_at || !entitlement.expires_at) return false;
  if (entitlement.converted_at) return false;
  if (
    isEntitlementPeriodExpired(entitlement, (input.now ?? new Date()).getTime())
  ) {
    return false;
  }

  const hasExampleSeed = holdings.some((holding) =>
    holding.id.startsWith(EXAMPLE_HOLDING_ID_PREFIX),
  );
  // Stamped active without example seeds = false activation on a real portfolio.
  return !hasExampleSeed && hasNonExampleMarketHoldings(holdings);
}

export function hasExampleActivationIntent(
  metadata: Record<string, unknown> | null | undefined,
): boolean {
  if (!metadata) return false;
  if (metadata.pending_example_template === "global") return true;
  if (metadata.pending_example_template === "income") return true;
  if (metadata.example_activated_via_email === true) return true;
  return false;
}

async function clearExampleMetadata(
  admin: SupabaseClient,
  userId: string,
): Promise<void> {
  const { data, error: readError } = await admin.auth.admin.getUserById(userId);
  if (readError) throw readError;
  const existing = (data.user?.user_metadata ?? {}) as Record<string, unknown>;
  const nextMeta: Record<string, unknown> = {
    ...existing,
    account_mode: "standard",
    example_converted_at: null,
    pending_example_template: null,
    example_activated_via_email: null,
    example_portfolio_type: null,
    example_started_at: null,
    example_expires_at: null,
  };
  const { error } = await admin.auth.admin.updateUserById(userId, {
    user_metadata: nextMeta,
  });
  if (error) throw error;
}

async function deleteEntitlementRow(
  admin: SupabaseClient,
  emailNormalized: string,
): Promise<void> {
  const { error } = await admin
    .from("example_portfolio_entitlements")
    .delete()
    .eq("email_normalized", emailNormalized);
  if (error) throw error;
}

/**
 * Remove a false example stamp: clear metadata + entitlement row.
 * Does not delete the user's own holdings.
 */
export async function repairFalseExampleActivation(input: {
  admin: SupabaseClient;
  userClient: SupabaseClient;
  user: User;
  entitlement: ExamplePortfolioEntitlement;
}): Promise<{ repaired: boolean; reason: string }> {
  const { admin, userClient, user, entitlement } = input;
  const repo = createPortfolioRepository(userClient);
  const snapshot = await repo.fetchSnapshot(user.id);

  if (
    !isFalseExampleActivation({
      entitlement,
      holdings: snapshot.holdings,
    })
  ) {
    return { repaired: false, reason: "not_false_activation" };
  }

  await clearExampleMetadata(admin, user.id);
  await deleteEntitlementRow(admin, entitlement.email_normalized);

  return { repaired: true, reason: "cleared_false_example_stamp" };
}

/**
 * Whether activate may start the example clock for this session.
 * Callback passes forceFromCallback after a verified example email link.
 */
export function mayStartExampleClock(input: {
  forceFromCallback?: boolean;
  metadata?: Record<string, unknown> | null;
  holdings: Array<Pick<StoredPortfolioHolding, "id" | "assetType">>;
  entitlement: ExamplePortfolioEntitlement;
}): boolean {
  // Email-callback path: a reserved row (template locked, clock not started)
  // is a valid pending choice — do not require user_metadata.
  if (input.forceFromCallback) {
    if (input.entitlement.converted_at) return false;
    return Boolean(input.entitlement.template);
  }
  if (hasExampleActivationIntent(input.metadata)) return true;
  // Already started previously — idempotent resume only when seeds exist
  // or portfolio is still empty (true example continuation).
  if (input.entitlement.started_at && input.entitlement.expires_at) {
    const hasExampleSeed = input.holdings.some((holding) =>
      holding.id.startsWith(EXAMPLE_HOLDING_ID_PREFIX),
    );
    if (hasExampleSeed) return true;
    if (input.holdings.length === 0) return true;
    return false;
  }
  // Reserved-only row without email-callback force must not start the clock
  // on ordinary password sessions.
  return false;
}
