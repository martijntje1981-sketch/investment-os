/**
 * Shared magic-link / email OTP error classification for Explore onboarding
 * and auth callback recovery. Pure helpers — no network calls.
 */

export type MagicLinkCallbackFailureKind =
  | "expired"
  | "already_used"
  | "invalid"
  | "missing"
  | "rate_limited"
  | "failed";

export type MagicLinkSendFailureKind = "rate_limited" | "invalid_email" | "error";

/** Local cooldown after a successful send (does not override Supabase limits). */
export const MAGIC_LINK_RESEND_COOLDOWN_SECONDS = 45;

/** Local cooldown after a rate-limit response. */
export const MAGIC_LINK_RATE_LIMIT_COOLDOWN_SECONDS = 180;

export const MAGIC_LINK_RATE_LIMIT_MESSAGE =
  "Too many login links were requested. Please wait a few minutes before trying again.";

export const MAGIC_LINK_CROSS_BROWSER_COPY =
  "Open the newest email link on this device. For the smoothest sign-in, use the same browser you started with.";

export const MAGIC_LINK_NEWEST_ONLY_WARNING =
  "After you request a new link, do not open an older email link — only the newest one will work.";

const CALLBACK_MESSAGES: Record<MagicLinkCallbackFailureKind, string> = {
  expired: "This sign-in link has expired. Request a new one to continue.",
  already_used:
    "This sign-in link was already used. Request a new one to continue.",
  invalid: "This sign-in link is invalid. Request a new one to continue.",
  missing:
    "We could not find a valid sign-in link in this page. Request a new one to continue.",
  rate_limited: MAGIC_LINK_RATE_LIMIT_MESSAGE,
  failed:
    "We could not complete sign-in with that link. Request a new one to continue.",
};

export function classifyMagicLinkCallbackError(
  message: string | null | undefined,
): MagicLinkCallbackFailureKind {
  const lower = (message || "").toLowerCase();

  if (!lower || lower === "missing_auth_params") {
    return "missing";
  }

  if (
    lower.includes("too many") ||
    lower.includes("rate limit") ||
    lower.includes("over_email_send_rate_limit") ||
    lower.includes("security purposes") ||
    lower.includes("only request this after")
  ) {
    return "rate_limited";
  }

  if (
    lower.includes("already been used") ||
    lower.includes("already used") ||
    (lower.includes("otp_expired") && lower.includes("used")) ||
    (lower.includes("token") && lower.includes("used"))
  ) {
    return "already_used";
  }

  if (
    lower.includes("expired") ||
    lower.includes("otp_expired") ||
    lower.includes("flow_state_expired")
  ) {
    return "expired";
  }

  if (
    lower.includes("invalid") ||
    lower.includes("otp_disabled") ||
    lower.includes("bad_jwt") ||
    lower.includes("pkce") ||
    lower.includes("code verifier") ||
    lower.includes("session_not_established")
  ) {
    return "invalid";
  }

  return "failed";
}

export function magicLinkCallbackUserMessage(
  kind: MagicLinkCallbackFailureKind,
): string {
  return CALLBACK_MESSAGES[kind];
}

export function classifyMagicLinkSendError(
  message: string,
  options?: { status?: number | null; code?: string | null },
): { kind: MagicLinkSendFailureKind; message: string } {
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
      kind: "rate_limited",
      message: MAGIC_LINK_RATE_LIMIT_MESSAGE,
    };
  }

  if (
    lower.includes("invalid") &&
    (lower.includes("email") || lower.includes("address"))
  ) {
    return {
      kind: "invalid_email",
      message: "Enter a valid email address.",
    };
  }

  return {
    kind: "error",
    message: message?.trim() || "Could not send the sign-in email.",
  };
}

export function formatMagicLinkCooldownMessage(secondsRemaining: number): string {
  const seconds = Math.max(0, Math.ceil(secondsRemaining));
  return `You can request another link in ${seconds} seconds.`;
}

export function parseMagicLinkAuthErrorParam(
  value: string | null | undefined,
): MagicLinkCallbackFailureKind | null {
  if (!value) return null;
  const allowed: MagicLinkCallbackFailureKind[] = [
    "expired",
    "already_used",
    "invalid",
    "missing",
    "rate_limited",
    "failed",
  ];
  return allowed.includes(value as MagicLinkCallbackFailureKind)
    ? (value as MagicLinkCallbackFailureKind)
    : null;
}

/** Build explore recovery URL — uses auth_error codes, never raw provider text. */
export function buildExploreMagicLinkRecoveryPath(
  kind: MagicLinkCallbackFailureKind,
): string {
  return `/explore?auth_error=${encodeURIComponent(kind)}`;
}
