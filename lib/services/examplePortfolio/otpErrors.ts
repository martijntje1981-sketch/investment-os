/**
 * Pure OTP / eligibility error mapping for Example Portfolio start flow.
 */

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
  const lower = (message || "").toLowerCase();
  const code = (options?.code || "").toLowerCase();
  const httpStatus = options?.status ?? null;

  const isRateLimited =
    httpStatus === 429 ||
    code.includes("over_email_send_rate_limit") ||
    code.includes("rate_limit") ||
    lower.includes("security purposes") ||
    lower.includes("only request this after") ||
    lower.includes("too many") ||
    lower.includes("rate limit");

  if (isRateLimited) {
    return {
      status: "rate_limited",
      message:
        "Too many sign-in emails were requested. Please wait and try again.",
    };
  }

  if (
    lower.includes("invalid") &&
    (lower.includes("email") || lower.includes("address"))
  ) {
    return {
      status: "error",
      message: "Enter a valid email address.",
    };
  }

  return {
    status: "error",
    message: message?.trim() || "Could not send the sign-in email.",
  };
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
