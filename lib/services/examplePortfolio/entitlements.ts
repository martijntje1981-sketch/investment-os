/**
 * Example portfolio entitlement persistence (service-role writes).
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  ExamplePortfolioEntitlement,
  ExamplePortfolioTemplate,
} from "@/lib/services/examplePortfolio/types";
import { normalizeExampleEmail } from "@/lib/services/examplePortfolio/types";

function mapRow(row: Record<string, unknown>): ExamplePortfolioEntitlement {
  return {
    email_normalized: String(row.email_normalized),
    user_id: (row.user_id as string | null) ?? null,
    template: row.template as ExamplePortfolioTemplate,
    started_at: (row.started_at as string | null) ?? null,
    expires_at: (row.expires_at as string | null) ?? null,
    seeded_at: (row.seeded_at as string | null) ?? null,
    converted_at: (row.converted_at as string | null) ?? null,
  };
}

export function isEntitlementPeriodExpired(
  entitlement: Pick<ExamplePortfolioEntitlement, "expires_at" | "converted_at">,
  now = Date.now(),
): boolean {
  if (entitlement.converted_at) return false;
  if (!entitlement.expires_at) return false;
  return Date.parse(entitlement.expires_at) <= now;
}

export async function findExampleEntitlementByEmail(
  admin: SupabaseClient,
  email: string,
): Promise<ExamplePortfolioEntitlement | null> {
  const email_normalized = normalizeExampleEmail(email);
  const { data, error } = await admin
    .from("example_portfolio_entitlements")
    .select(
      "email_normalized, user_id, template, started_at, expires_at, seeded_at, converted_at",
    )
    .eq("email_normalized", email_normalized)
    .maybeSingle();

  if (error) throw error;
  return data ? mapRow(data as Record<string, unknown>) : null;
}

export async function findExampleEntitlementByUserId(
  admin: SupabaseClient,
  userId: string,
): Promise<ExamplePortfolioEntitlement | null> {
  const { data, error } = await admin
    .from("example_portfolio_entitlements")
    .select(
      "email_normalized, user_id, template, started_at, expires_at, seeded_at, converted_at",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data ? mapRow(data as Record<string, unknown>) : null;
}

/**
 * Reserve one entitlement row per email at OTP start.
 * Template is locked here — callback/activation must not accept a different choice.
 */
export async function reserveExampleEntitlement(
  admin: SupabaseClient,
  input: {
    email: string;
    template: ExamplePortfolioTemplate;
  },
): Promise<{ entitlement: ExamplePortfolioEntitlement; created: boolean }> {
  const email_normalized = normalizeExampleEmail(input.email);
  const existing = await findExampleEntitlementByEmail(admin, email_normalized);
  if (existing) {
    return { entitlement: existing, created: false };
  }

  const nowIso = new Date().toISOString();
  const { data, error } = await admin
    .from("example_portfolio_entitlements")
    .insert({
      email_normalized,
      user_id: null,
      template: input.template,
      started_at: null,
      expires_at: null,
      updated_at: nowIso,
    })
    .select(
      "email_normalized, user_id, template, started_at, expires_at, seeded_at, converted_at",
    )
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      const raced = await findExampleEntitlementByEmail(admin, input.email);
      if (!raced) throw error;
      return { entitlement: raced, created: false };
    }
    throw error;
  }

  if (!data) {
    const raced = await findExampleEntitlementByEmail(admin, input.email);
    if (!raced) throw new Error("Failed to reserve example entitlement.");
    return { entitlement: raced, created: false };
  }

  return {
    entitlement: mapRow(data as Record<string, unknown>),
    created: true,
  };
}

export async function linkExampleEntitlementUser(
  admin: SupabaseClient,
  emailNormalized: string,
  userId: string,
): Promise<void> {
  const { error } = await admin
    .from("example_portfolio_entitlements")
    .update({ user_id: userId, updated_at: new Date().toISOString() })
    .eq("email_normalized", emailNormalized)
    .is("user_id", null);

  if (error) throw error;
}

export async function startExampleEntitlementClock(
  admin: SupabaseClient,
  emailNormalized: string,
  startedAt: string,
  expiresAt: string,
): Promise<ExamplePortfolioEntitlement> {
  const { data, error } = await admin
    .from("example_portfolio_entitlements")
    .update({
      started_at: startedAt,
      expires_at: expiresAt,
      updated_at: startedAt,
    })
    .eq("email_normalized", emailNormalized)
    .is("started_at", null)
    .select(
      "email_normalized, user_id, template, started_at, expires_at, seeded_at, converted_at",
    )
    .maybeSingle();

  if (error) throw error;

  if (data) {
    return mapRow(data as Record<string, unknown>);
  }

  const existing = await findExampleEntitlementByEmail(admin, emailNormalized);
  if (!existing) {
    throw new Error("Example entitlement missing while starting clock.");
  }
  return existing;
}

export async function markExampleEntitlementSeeded(
  admin: SupabaseClient,
  emailNormalized: string,
  seededAt = new Date().toISOString(),
): Promise<void> {
  const { error } = await admin
    .from("example_portfolio_entitlements")
    .update({ seeded_at: seededAt, updated_at: seededAt })
    .eq("email_normalized", emailNormalized)
    .is("seeded_at", null);

  if (error) throw error;
}

export async function markExampleEntitlementConverted(
  admin: SupabaseClient,
  emailNormalized: string,
  convertedAt = new Date().toISOString(),
): Promise<void> {
  const { error } = await admin
    .from("example_portfolio_entitlements")
    .update({ converted_at: convertedAt, updated_at: convertedAt })
    .eq("email_normalized", emailNormalized)
    .is("converted_at", null);

  if (error) throw error;
}
