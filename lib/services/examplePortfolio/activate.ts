/**
 * Idempotent activation: claim entitlement, seed holdings/goal, stamp metadata.
 *
 * Template is taken only from the reserved entitlement row — never from a
 * client-supplied hint after authentication.
 *
 * Important: do not start the example clock on ordinary password sessions
 * just because a reserved entitlement row exists.
 */

import type { SupabaseClient, User } from "@supabase/supabase-js";

import {
  findExampleEntitlementByEmail,
  findExampleEntitlementByUserId,
  isEntitlementPeriodExpired,
  linkExampleEntitlementUser,
  markExampleEntitlementSeeded,
  startExampleEntitlementClock,
} from "@/lib/services/examplePortfolio/entitlements";
import { mayStartExampleClock } from "@/lib/services/examplePortfolio/repairFalseExample";
import {
  buildExampleGoal,
  buildExampleHoldings,
  hasExampleSeedHoldings,
} from "@/lib/services/examplePortfolio/templates";
import {
  computeExampleExpiry,
  normalizeExampleEmail,
  type ExamplePortfolioTemplate,
  type ExamplePortfolioUserMetadata,
} from "@/lib/services/examplePortfolio/types";
import { createPortfolioRepository } from "@/lib/services/portfolio/repository";
import { syncPortfolioSnapshot } from "@/lib/services/portfolio/syncService";

export type ActivateExampleResult =
  | {
      status: "activated";
      template: ExamplePortfolioTemplate;
      expiresAt: string;
    }
  | {
      status: "already_active";
      template: ExamplePortfolioTemplate;
      expiresAt: string;
    }
  | { status: "expired"; expiresAt: string }
  | { status: "converted" }
  | { status: "skipped"; reason: string }
  | { status: "error"; message: string };

async function stampUserMetadata(
  admin: SupabaseClient,
  userId: string,
  patch: ExamplePortfolioUserMetadata & {
    example_activated_via_email?: boolean | null;
  },
): Promise<void> {
  const { data, error: readError } = await admin.auth.admin.getUserById(userId);
  if (readError) throw readError;
  const existing = (data.user?.user_metadata ?? {}) as Record<string, unknown>;
  const { error } = await admin.auth.admin.updateUserById(userId, {
    user_metadata: {
      ...existing,
      ...patch,
      pending_example_template: null,
    },
  });
  if (error) throw error;
}

/**
 * Activate the example portfolio for a verified authenticated user.
 * Safe under duplicate callbacks, refreshes, and retries.
 */
export async function activateExamplePortfolioForUser(input: {
  admin: SupabaseClient;
  userClient: SupabaseClient;
  user: User;
  /** True only from /auth/callback after a verified example email link. */
  forceFromCallback?: boolean;
}): Promise<ActivateExampleResult> {
  const { admin, userClient, user } = input;
  const forceFromCallback = Boolean(input.forceFromCallback);

  // Prefer Auth admin email so entitlement lookup matches the reserved row
  // even when the JWT user object omits or lags email.
  let email = user.email ? normalizeExampleEmail(user.email) : "";
  try {
    const { data } = await admin.auth.admin.getUserById(user.id);
    const adminEmail = data.user?.email;
    if (adminEmail) email = normalizeExampleEmail(adminEmail);
  } catch {
    // Keep session email.
  }
  if (!email) {
    return { status: "error", message: "Verified email is required." };
  }

  // Reserved rows have user_id null until activation — email lookup is required.
  let entitlement =
    (await findExampleEntitlementByEmail(admin, email)) ??
    (await findExampleEntitlementByUserId(admin, user.id));

  if (!entitlement) {
    return { status: "skipped", reason: "No reserved example portfolio." };
  }

  if (entitlement.converted_at) {
    await stampUserMetadata(admin, user.id, {
      account_mode: "standard",
      example_portfolio_type: entitlement.template,
      example_started_at: entitlement.started_at ?? undefined,
      example_expires_at: entitlement.expires_at ?? undefined,
      example_converted_at: entitlement.converted_at,
      example_activated_via_email: null,
    });
    return { status: "converted" };
  }

  if (isEntitlementPeriodExpired(entitlement)) {
    await stampUserMetadata(admin, user.id, {
      account_mode: "example",
      example_portfolio_type: entitlement.template,
      example_started_at: entitlement.started_at ?? undefined,
      example_expires_at: entitlement.expires_at ?? undefined,
      example_converted_at: null,
    });
    return {
      status: "expired",
      expiresAt: entitlement.expires_at as string,
    };
  }

  const repo = createPortfolioRepository(userClient);
  const snapshot = await repo.fetchSnapshot(user.id);
  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;

  if (
    !mayStartExampleClock({
      forceFromCallback,
      metadata,
      holdings: snapshot.holdings,
      entitlement,
    })
  ) {
    return {
      status: "skipped",
      reason: "No example activation intent for this session.",
    };
  }

  // Template is locked on the entitlement row — ignore mutable user_metadata.
  const template = entitlement.template;

  if (!entitlement.user_id) {
    await linkExampleEntitlementUser(
      admin,
      entitlement.email_normalized,
      user.id,
    );
  } else if (entitlement.user_id !== user.id) {
    return {
      status: "error",
      message: "This email already used an example portfolio.",
    };
  }

  if (!entitlement.started_at || !entitlement.expires_at) {
    const startedAt = new Date().toISOString();
    const expiresAt = computeExampleExpiry(new Date(startedAt)).toISOString();
    entitlement = await startExampleEntitlementClock(
      admin,
      entitlement.email_normalized,
      startedAt,
      expiresAt,
    );
  }

  const expiresAt = entitlement.expires_at as string;
  const startedAt = entitlement.started_at as string;

  await stampUserMetadata(admin, user.id, {
    account_mode: "example",
    example_portfolio_type: template,
    example_started_at: startedAt,
    example_expires_at: expiresAt,
    example_converted_at: null,
    example_activated_via_email: true,
  });

  const alreadySeeded =
    Boolean(entitlement.seeded_at) || hasExampleSeedHoldings(snapshot.holdings);

  if (alreadySeeded) {
    if (!entitlement.seeded_at) {
      await markExampleEntitlementSeeded(admin, entitlement.email_normalized);
    }
    return {
      status: "already_active",
      template,
      expiresAt,
    };
  }

  // Do not overwrite an existing real portfolio.
  if (snapshot.holdings.length > 0) {
    return {
      status: "skipped",
      reason: "Existing portfolio is not an example seed set.",
    };
  }

  const holdings = buildExampleHoldings(template);
  const goal = buildExampleGoal(template);
  const idempotencyKey = `example-seed:${user.id}:${template}:${startedAt}`;

  await syncPortfolioSnapshot(
    repo,
    user.id,
    {
      holdings,
      goal,
      importMappings: [],
      idempotencyKey,
    },
    goal,
    [],
  );

  await markExampleEntitlementSeeded(admin, entitlement.email_normalized);

  return {
    status: "activated",
    template,
    expiresAt,
  };
}
