/**
 * Pure OTP / eligibility error mapping for Example Portfolio start flow.
 * Send-error classification is shared with auth magic-link recovery helpers.
 */

import { classifyMagicLinkSendError } from "@/lib/auth/magicLinkErrors";

export type ExampleStartErrorStatus =
  | "invalid"
  | "expired"
  | "converted"
  | "already_active"
  | "already_used"
  | "error"
  | "rate_limited";

export function mapExampleOtpError(
  message: string,
  options?: { status?: number | null; code?: string | null },
): { status: "error" | "rate_limited"; message: string } {
  const mapped = classifyMagicLinkSendError(message, options);
  if (mapped.kind === "rate_limited") {
    return { status: "rate_limited", message: mapped.message };
  }
  if (mapped.kind === "invalid_email") {
    return { status: "error", message: mapped.message };
  }
  return { status: "error", message: mapped.message };
}

export const EXAMPLE_START_MESSAGES = {
  invalid_email: "Enter a valid email address.",
  invalid_template: "Choose a portfolio to explore.",
  converted:
    "This email already keeps a Tobailey portfolio. Sign in to continue.",
  expired: "This email has already used an Example Portfolio.",
  already_active:
    "Your active Example Portfolio already exists. Check your email to sign in.",
  already_used: "This email has already used an Example Portfolio.",
  unavailable: "Example portfolios are temporarily unavailable.",
  eligibility: "Could not check example portfolio eligibility.",
  reserve: "Could not reserve your example portfolio.",
} as const;
