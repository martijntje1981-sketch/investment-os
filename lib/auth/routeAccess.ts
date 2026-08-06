/**
 * Route access matrix for Tobailey guest / auth gating.
 * Private user data APIs are gated separately in route handlers.
 */

import type { ExamplePortfolioUserMetadata } from "@/lib/services/examplePortfolio/types";
import { isExampleExpired } from "@/lib/services/examplePortfolio/types";

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
  "/portfolio-history",
  "/review",
] as const;

/**
 * App intelligence surfaces that guests may browse.
 * Same pages personalize when the visitor is signed in with holdings.
 */
export const PUBLIC_APP_PREFIXES = [
  "/explore",
  "/news",
  "/perspectives",
  "/market-pulse",
  "/supported-instruments",
  "/example-expired",
  "/pricing",
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

/** Paths an expired example user may still open. */
export const EXAMPLE_EXPIRED_ALLOWED_PREFIXES = [
  "/example-expired",
  "/explore",
  "/settings",
  "/pricing",
  /** Export exception — history page only; other Premium surfaces stay blocked. */
  "/portfolio-history",
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
  if (
    MARKETING_EXACT_PATHS.includes(
      pathname as (typeof MARKETING_EXACT_PATHS)[number],
    )
  ) {
    return true;
  }
  return false;
}

export function isExampleExpiredAllowedPath(pathname: string): boolean {
  return pathMatchesPrefix(pathname, EXAMPLE_EXPIRED_ALLOWED_PREFIXES);
}

/**
 * Expired example users are blocked from normal app surfaces until they
 * subscribe/convert. Enforced in middleware (server-side).
 */
export function shouldBlockExpiredExampleUser(input: {
  pathname: string;
  userMetadata: ExamplePortfolioUserMetadata | null | undefined;
  now?: Date;
}): boolean {
  if (!isExampleExpired(input.userMetadata, input.now)) return false;
  if (isExampleExpiredAllowedPath(input.pathname)) return false;
  if (isMarketingPath(input.pathname)) return false;
  if (
    isPublicAppPath(input.pathname) &&
    input.pathname !== "/example-expired"
  ) {
    return false;
  }
  return isAuthRequiredPath(input.pathname);
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

export type AudienceState =
  "guest" | "authenticated_empty" | "authenticated_holdings";

export function resolveAudienceState(input: {
  authenticated: boolean;
  holdingsCount: number;
}): AudienceState {
  if (!input.authenticated) return "guest";
  if (input.holdingsCount <= 0) return "authenticated_empty";
  return "authenticated_holdings";
}
