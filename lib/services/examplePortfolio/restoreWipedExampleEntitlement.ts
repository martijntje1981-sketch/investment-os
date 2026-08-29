/**
 * Restore an Example entitlement wiped by the false-repair bug
 * (seeded portfolios whose holding ids were remapped to UUIDs).
 */

import type { SupabaseClient, User } from "@supabase/supabase-js";

import {
  computeExampleExpiry,
  normalizeExampleEmail,
  type ExamplePortfolioEntitlement,
  type ExamplePortfolioTemplate,
  type ExamplePortfolioUserMetadata,
} from "@/lib/services/examplePortfolio/types";
import { findExampleEntitlementByEmail } from "@/lib/services/examplePortfolio/entitlements";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

const GLOBAL_MARKERS = ["VWCE", "CSPX", "AIFS", "PPFB"] as const;
const INCOME_MARKERS = ["VHYL", "VWCE", "STRC"] as const;

function investmentSymbols(
  holdings: Array<Pick<StoredPortfolioHolding, "symbol" | "assetType">>,
): Set<string> {
  return new Set(
    holdings
      .filter((h) => h.assetType === "investment")
      .map((h) =>
        String(h.symbol ?? "")
          .trim()
          .toUpperCase(),
      )
      .filter(Boolean),
  );
}

/** Infer template from the seeded Example book — not from id prefixes. */
export function detectExampleTemplateFromHoldings(
  holdings: Array<Pick<StoredPortfolioHolding, "symbol" | "assetType">>,
): ExamplePortfolioTemplate | null {
  const symbols = investmentSymbols(holdings);
  if (INCOME_MARKERS.every((s) => symbols.has(s))) return "income";
  if (GLOBAL_MARKERS.every((s) => symbols.has(s))) return "global";
  return null;
}

export function parseExampleRestoreAllowlist(
  raw: string | null | undefined,
): Set<string> {
  if (!raw?.trim()) return new Set();
  return new Set(
    raw
      .split(",")
      .map((part) => normalizeExampleEmail(part))
      .filter(Boolean),
  );
}

export function isEmailOnExampleRestoreAllowlist(
  email: string,
  allowlistRaw = process.env.EXAMPLE_ENTITLEMENT_RESTORE_EMAILS,
): boolean {
  const allowlist = parseExampleRestoreAllowlist(allowlistRaw);
  if (allowlist.size === 0) return false;
  return allowlist.has(normalizeExampleEmail(email));
}

/**
 * Recreate a single wiped entitlement for an allowlisted user whose portfolio
 * still matches an Example template. Does not reseed holdings.
 */
export async function restoreWipedExampleEntitlement(input: {
  admin: SupabaseClient;
  user: User;
  holdings: Array<Pick<StoredPortfolioHolding, "symbol" | "assetType">>;
  allowlistRaw?: string | null;
  now?: Date;
}): Promise<{
  restored: boolean;
  reason: string;
  entitlement: ExamplePortfolioEntitlement | null;
}> {
  const email = input.user.email ? normalizeExampleEmail(input.user.email) : "";
  if (!email) {
    return { restored: false, reason: "missing_email", entitlement: null };
  }
  if (
    !isEmailOnExampleRestoreAllowlist(email, input.allowlistRaw ?? undefined)
  ) {
    return { restored: false, reason: "not_allowlisted", entitlement: null };
  }

  const existing = await findExampleEntitlementByEmail(input.admin, email);
  if (existing?.started_at && existing.expires_at && !existing.converted_at) {
    return {
      restored: false,
      reason: "already_active",
      entitlement: existing,
    };
  }
  if (existing?.converted_at) {
    return {
      restored: false,
      reason: "converted",
      entitlement: existing,
    };
  }

  const template = detectExampleTemplateFromHoldings(input.holdings);
  if (!template) {
    return {
      restored: false,
      reason: "holdings_not_example_template",
      entitlement: existing,
    };
  }

  const now = input.now ?? new Date();
  const startedAt = now.toISOString();
  const expiresAt = computeExampleExpiry(now).toISOString();
  const seededAt = existing?.seeded_at ?? startedAt;

  const row = {
    email_normalized: email,
    user_id: input.user.id,
    template,
    started_at: startedAt,
    expires_at: expiresAt,
    seeded_at: seededAt,
    converted_at: null,
    updated_at: startedAt,
  };

  const { data, error } = await input.admin
    .from("example_portfolio_entitlements")
    .upsert(row, { onConflict: "email_normalized" })
    .select(
      "email_normalized, user_id, template, started_at, expires_at, seeded_at, converted_at",
    )
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    return { restored: false, reason: "upsert_failed", entitlement: null };
  }

  const entitlement: ExamplePortfolioEntitlement = {
    email_normalized: String(data.email_normalized),
    user_id: (data.user_id as string | null) ?? null,
    template: data.template as ExamplePortfolioTemplate,
    started_at: (data.started_at as string | null) ?? null,
    expires_at: (data.expires_at as string | null) ?? null,
    seeded_at: (data.seeded_at as string | null) ?? null,
    converted_at: (data.converted_at as string | null) ?? null,
  };

  const { data: userData, error: readError } =
    await input.admin.auth.admin.getUserById(input.user.id);
  if (readError) throw readError;
  const existingMeta = (userData.user?.user_metadata ??
    {}) as ExamplePortfolioUserMetadata;
  await input.admin.auth.admin.updateUserById(input.user.id, {
    user_metadata: {
      ...existingMeta,
      account_mode: "example",
      example_portfolio_type: template,
      example_started_at: startedAt,
      example_expires_at: expiresAt,
      example_converted_at: null,
      pending_example_template: null,
      example_activated_via_email: true,
    },
  });

  return { restored: true, reason: "restored", entitlement };
}
