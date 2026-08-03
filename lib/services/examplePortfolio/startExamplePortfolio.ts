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
  isExamplePortfolioTemplate,
  isValidExampleEmail,
  normalizeExampleEmail,
  type ExamplePortfolioTemplate,
} from "@/lib/services/examplePortfolio/types";

export type StartExamplePortfolioResult =
  | { ok: true; status: "check_email" }
  | {
      ok: false;
      status: "invalid" | "expired" | "converted" | "error" | "rate_limited";
      message: string;
    };

function mapOtpError(message: string): {
  status: "error" | "rate_limited";
  message: string;
} {
  const lower = message.toLowerCase();
  if (
    lower.includes("rate") ||
    lower.includes("security purposes") ||
    lower.includes("too many")
  ) {
    return {
      status: "rate_limited",
      message: "Please wait a moment, then try again.",
    };
  }
  return {
    status: "error",
    message: message || "Could not send the sign-in email.",
  };
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
      message: "Enter a valid email address.",
    };
  }

  if (!isExamplePortfolioTemplate(input.template)) {
    return {
      ok: false,
      status: "invalid",
      message: "Choose a portfolio to explore.",
    };
  }
  const template: ExamplePortfolioTemplate = input.template;

  const admin = createAdminClient();
  if (!admin) {
    return {
      ok: false,
      status: "error",
      message: "Example portfolios are temporarily unavailable.",
    };
  }

  let entitlement = null;
  try {
    entitlement = await findExampleEntitlementByEmail(admin, email);
  } catch {
    return {
      ok: false,
      status: "error",
      message: "Could not check example portfolio eligibility.",
    };
  }

  if (entitlement?.converted_at) {
    return {
      ok: false,
      status: "converted",
      message:
        "This email already keeps a Tobailey portfolio. Sign in to continue.",
    };
  }

  if (entitlement && isEntitlementPeriodExpired(entitlement)) {
    return {
      ok: false,
      status: "expired",
      message: "Your example portfolio has ended.",
    };
  }

  // Lock template on first request. Later requests keep the reserved template.
  try {
    const reserved = await reserveExampleEntitlement(admin, {
      email,
      template: entitlement?.template ?? template,
    });
    entitlement = reserved.entitlement;
  } catch {
    return {
      ok: false,
      status: "error",
      message: "Could not reserve your example portfolio.",
    };
  }

  const lockedTemplate = entitlement.template;

  const requestHeaders = await headers();
  const siteUrl = getPublicSiteUrl(requestHeaders);
  const emailRedirectTo = buildExampleAuthCallbackUrl(siteUrl);
  const supabase = await createClient();

  // Magic-link / OTP via existing Supabase Auth — one entitlement per email.
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      data: {
        // Informational only — activation reads template from the entitlement row.
        pending_example_template: lockedTemplate,
        account_mode: "example",
      },
      emailRedirectTo,
    },
  });

  if (error) {
    const mapped = mapOtpError(error.message);
    return {
      ok: false,
      status: mapped.status,
      message: mapped.message,
    };
  }

  return { ok: true, status: "check_email" };
}
