/**
 * Conversion boundary for example → paid/standard accounts.
 *
 * Stripe Checkout + webhooks are not implemented in this codebase yet.
 * When they land, call `convertExampleEntitlementForUser` from the verified
 * webhook handler only — never from the client.
 *
 * Owner/test Complete (until Stripe): set `example_portfolio_entitlements.converted_at`
 * for the auth user (insert the row with converted_at if none exists). That is the
 * same server-side Complete path as a real conversion. Do not hardcode emails in UI.
 * Remove later by clearing converted_at (and matching user_metadata.example_converted_at)
 * without leaving an active example trial clock.
 */

import type { SupabaseClient, User } from "@supabase/supabase-js";

import {
  findExampleEntitlementByEmail,
  findExampleEntitlementByUserId,
  markExampleEntitlementConverted,
} from "@/lib/services/examplePortfolio/entitlements";
import {
  normalizeExampleEmail,
  type ExamplePortfolioUserMetadata,
} from "@/lib/services/examplePortfolio/types";

export type ConvertExampleResult =
  | { status: "converted"; emailNormalized: string; convertedAt: string }
  | {
      status: "already_converted";
      emailNormalized: string;
      convertedAt: string;
    }
  | { status: "not_found" }
  | { status: "error"; message: string };

/**
 * Mark an example entitlement converted and lift example restrictions.
 * Idempotent: safe under duplicate webhook deliveries.
 *
 * Preserves the same auth user, holdings, goals, and settings.
 */
export async function convertExampleEntitlementForUser(input: {
  admin: SupabaseClient;
  user: User;
  convertedAt?: string;
}): Promise<ConvertExampleResult> {
  const { admin, user } = input;
  const convertedAt = input.convertedAt ?? new Date().toISOString();
  const email = user.email ? normalizeExampleEmail(user.email) : "";

  const entitlement =
    (await findExampleEntitlementByUserId(admin, user.id)) ??
    (email ? await findExampleEntitlementByEmail(admin, email) : null);

  if (!entitlement) {
    return { status: "not_found" };
  }

  if (entitlement.converted_at) {
    return {
      status: "already_converted",
      emailNormalized: entitlement.email_normalized,
      convertedAt: entitlement.converted_at,
    };
  }

  await markExampleEntitlementConverted(
    admin,
    entitlement.email_normalized,
    convertedAt,
  );

  const { data, error: readError } = await admin.auth.admin.getUserById(
    user.id,
  );
  if (readError) {
    return { status: "error", message: readError.message };
  }

  const existing = (data.user?.user_metadata ?? {}) as Record<string, unknown>;
  const patch: ExamplePortfolioUserMetadata = {
    account_mode: "standard",
    example_converted_at: convertedAt,
    example_portfolio_type: entitlement.template,
    example_started_at: entitlement.started_at ?? undefined,
    example_expires_at: entitlement.expires_at ?? undefined,
    pending_example_template: null,
  };

  const { error } = await admin.auth.admin.updateUserById(user.id, {
    user_metadata: {
      ...existing,
      ...patch,
    },
  });

  if (error) {
    return { status: "error", message: error.message };
  }

  return {
    status: "converted",
    emailNormalized: entitlement.email_normalized,
    convertedAt,
  };
}

/** Dedicated pricing page until Stripe Checkout exists. */
export const EXAMPLE_CONVERSION_STATUS = {
  automated: false,
  ctaHref: "/pricing",
  note: "Stripe Checkout and subscription webhooks are not implemented; CTA routes to /pricing.",
} as const;
