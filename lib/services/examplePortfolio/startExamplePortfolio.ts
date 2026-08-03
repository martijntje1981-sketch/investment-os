/**
 * Server actions for the /explore example-portfolio entry.
 */

"use server";

import { headers } from "next/headers";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  buildExampleAuthCallbackUrl,
  getPublicSiteUrl,
} from "@/lib/auth/siteUrl";
import {
  findExampleEntitlementByEmail,
  isEntitlementPeriodExpired,
  reserveExampleEntitlement,
} from "@/lib/services/examplePortfolio/entitlements";
import {
  EXAMPLE_START_MESSAGES,
  mapExampleOtpError,
} from "@/lib/services/examplePortfolio/otpErrors";
import {
  isExamplePortfolioTemplate,
  isValidExampleEmail,
  normalizeExampleEmail,
  type ExamplePortfolioTemplate,
} from "@/lib/services/examplePortfolio/types";

export type StartExamplePortfolioResult =
  | { ok: true; status: "check_email" | "already_active" }
  | {
      ok: false;
      status:
        | "invalid"
        | "expired"
        | "converted"
        | "already_used"
        | "error"
        | "rate_limited";
      message: string;
    };

function logExampleStartFailure(code: string, detail?: string) {
  // Safe operational signal only — never log tokens/secrets/raw emails.
  console.info(
    `[example-portfolio] start_failed code=${code}${detail ? ` detail=${detail}` : ""}`,
  );
}

export async function startExamplePortfolio(input: {
  email: string;
  template: string;
}): Promise<StartExamplePortfolioResult> {
  const email = normalizeExampleEmail(input.email);
  if (!isValidExampleEmail(email)) {
    return {
      ok: false,
      status: "invalid",
      message: EXAMPLE_START_MESSAGES.invalid_email,
    };
  }

  if (!isExamplePortfolioTemplate(input.template)) {
    return {
      ok: false,
      status: "invalid",
      message: EXAMPLE_START_MESSAGES.invalid_template,
    };
  }
  const template: ExamplePortfolioTemplate = input.template;

  const admin = createAdminClient();
  if (!admin) {
    logExampleStartFailure("unavailable");
    return {
      ok: false,
      status: "error",
      message: EXAMPLE_START_MESSAGES.unavailable,
    };
  }

  let entitlement = null;
  try {
    entitlement = await findExampleEntitlementByEmail(admin, email);
  } catch {
    logExampleStartFailure("eligibility_lookup");
    return {
      ok: false,
      status: "error",
      message: EXAMPLE_START_MESSAGES.eligibility,
    };
  }

  if (entitlement?.converted_at) {
    logExampleStartFailure("converted");
    return {
      ok: false,
      status: "converted",
      message: EXAMPLE_START_MESSAGES.converted,
    };
  }

  if (entitlement && isEntitlementPeriodExpired(entitlement)) {
    logExampleStartFailure("expired");
    return {
      ok: false,
      status: "expired",
      message: EXAMPLE_START_MESSAGES.expired,
    };
  }

  const alreadyActive =
    Boolean(entitlement?.started_at) &&
    Boolean(entitlement?.expires_at) &&
    !isEntitlementPeriodExpired(entitlement!);

  // Lock template on first request. Later requests keep the reserved template.
  try {
    const reserved = await reserveExampleEntitlement(admin, {
      email,
      template: entitlement?.template ?? template,
    });
    entitlement = reserved.entitlement;
  } catch {
    logExampleStartFailure("reserve");
    return {
      ok: false,
      status: "error",
      message: EXAMPLE_START_MESSAGES.reserve,
    };
  }

  const lockedTemplate = entitlement.template;

  const requestHeaders = await headers();
  const siteUrl = getPublicSiteUrl(requestHeaders);
  const emailRedirectTo = buildExampleAuthCallbackUrl(siteUrl);
  const supabase = await createClient();

  // Magic-link / OTP via existing Supabase Auth — one entitlement per email.
  // Do not stamp account_mode here — activation owns the example clock/metadata.
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      data: {
        pending_example_template: lockedTemplate,
      },
      emailRedirectTo,
    },
  });

  if (error) {
    const mapped = mapExampleOtpError(error.message, {
      status: typeof error.status === "number" ? error.status : null,
      code:
        "code" in error
          ? String((error as { code?: string }).code ?? "")
          : null,
    });
    logExampleStartFailure(mapped.status, error.status?.toString());
    return {
      ok: false,
      status: mapped.status,
      message: mapped.message,
    };
  }

  if (alreadyActive) {
    return { ok: true, status: "already_active" };
  }

  return { ok: true, status: "check_email" };
}
