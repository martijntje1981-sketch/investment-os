/**
 * Route access matrix for Tobailey guest / auth gating.
 * Private user data APIs are gated separately in route handlers.
 */

/** Authenticated-only app surfaces (middleware redirects guests to login). */
export const AUTH_REQUIRED_PREFIXES = [
  "/dashboard",
  "/portfolio",
  "/upload",
  "/analysis",
  "/briefing",
  "/discover",
  "/goals",
  "/holding",
  "/events",
  "/settings",
  "/portfolio-health",
] as const;

/**
 * App intelligence surfaces that guests may browse.
 * Same pages personalize when the visitor is signed in with holdings.
 */
export const PUBLIC_APP_PREFIXES = [
  "/news",
  "/perspectives",
  "/market-pulse",
  "/supported-instruments",
] as const;

export const MARKETING_EXACT_PATHS = [
  "/",
  "/faq",
  "/contact",
  "/privacy",
  "/terms",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
] as const;

export function pathMatchesPrefix(
  pathname: string,
  prefixes: readonly string[],
): boolean {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function isAuthRequiredPath(pathname: string): boolean {
  return pathMatchesPrefix(pathname, AUTH_REQUIRED_PREFIXES);
}

export function isPublicAppPath(pathname: string): boolean {
  return pathMatchesPrefix(pathname, PUBLIC_APP_PREFIXES);
}

export function isMarketingPath(pathname: string): boolean {
  if (MARKETING_EXACT_PATHS.includes(pathname as (typeof MARKETING_EXACT_PATHS)[number])) {
    return true;
  }
  return false;
}

/** Safe post-login destination — prevents open redirects and auth loops. */
export function safeAuthRedirectPath(
  next: string | null | undefined,
  fallback = "/dashboard",
): string {
  if (!next || typeof next !== "string") return fallback;
  const trimmed = next.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return fallback;
  if (trimmed.startsWith("/login") || trimmed.startsWith("/signup")) {
    return fallback;
  }
  if (trimmed.startsWith("/auth/")) return fallback;
  return trimmed;
}

export type AudienceState = "guest" | "authenticated_empty" | "authenticated_holdings";

export function resolveAudienceState(input: {
  authenticated: boolean;
  holdingsCount: number;
}): AudienceState {
  if (!input.authenticated) return "guest";
  if (input.holdingsCount <= 0) return "authenticated_empty";
  return "authenticated_holdings";
}
