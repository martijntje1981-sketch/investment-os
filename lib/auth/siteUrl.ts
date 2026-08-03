/**
 * Canonical public site origin for auth email redirects.
 * Prefer NEXT_PUBLIC_SITE_URL so Server Actions never fall back to localhost
 * or an unlisted Vercel preview host when Origin is missing.
 */

export function getPublicSiteUrl(requestHeaders?: Headers | null): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) {
    return configured.replace(/\/+$/, "");
  }

  if (requestHeaders) {
    const origin = requestHeaders.get("origin");
    if (origin && /^https?:\/\//i.test(origin)) {
      return origin.replace(/\/+$/, "");
    }

    const forwardedHost = requestHeaders.get("x-forwarded-host");
    const forwardedProto = requestHeaders.get("x-forwarded-proto") ?? "https";
    if (forwardedHost) {
      const host = forwardedHost.split(",")[0]!.trim();
      return `${forwardedProto}://${host}`.replace(/\/+$/, "");
    }

    const host = requestHeaders.get("host");
    if (host) {
      const proto = host.includes("localhost") ? "http" : "https";
      return `${proto}://${host}`.replace(/\/+$/, "");
    }
  }

  // Last resort for local tooling only.
  return "http://localhost:3000";
}

/** Auth callback for Example Portfolio magic-link / email confirmation. */
export function buildExampleAuthCallbackUrl(siteUrl: string): string {
  const base = siteUrl.replace(/\/+$/, "");
  const next = encodeURIComponent("/dashboard");
  return `${base}/auth/callback?next=${next}&example=1`;
}

/** Generic auth callback with a safe post-login destination. */
export function buildAuthCallbackUrl(
  siteUrl: string,
  nextPath = "/dashboard",
): string {
  const base = siteUrl.replace(/\/+$/, "");
  const next = encodeURIComponent(nextPath.startsWith("/") ? nextPath : "/dashboard");
  return `${base}/auth/callback?next=${next}`;
}
