/**
 * Canonical public site origin for auth email redirects.
 * Prefer NEXT_PUBLIC_SITE_URL so Server Actions never fall back to localhost
 * or an unlisted Vercel preview host when Origin is missing.
 */

/** Production marketing + auth host. Apex and .nl redirect here. */
export const CANONICAL_PUBLIC_SITE_URL = "https://www.tobailey.com";

const TOBAILEY_HOSTS = new Set([
  "www.tobailey.com",
  "tobailey.com",
  "www.tobailey.nl",
  "tobailey.nl",
  "www.tobailey.eu",
  "tobailey.eu",
]);

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function isVercelPreviewHost(host: string): boolean {
  return /\.vercel\.app$/i.test(host);
}

/**
 * Normalize known Tobailey apex / alt hosts to the canonical www.com origin.
 * Leaves localhost and unknown hosts unchanged for local/dev tooling.
 */
export function normalizePublicSiteUrl(raw: string): string {
  const trimmed = stripTrailingSlash(raw.trim());
  if (!trimmed) return CANONICAL_PUBLIC_SITE_URL;

  try {
    const url = new URL(
      trimmed.includes("://") ? trimmed : `https://${trimmed}`,
    );
    const host = url.hostname.toLowerCase();

    if (isVercelPreviewHost(host)) {
      return CANONICAL_PUBLIC_SITE_URL;
    }

    if (TOBAILEY_HOSTS.has(host)) {
      return CANONICAL_PUBLIC_SITE_URL;
    }

    return stripTrailingSlash(url.origin);
  } catch {
    return CANONICAL_PUBLIC_SITE_URL;
  }
}

export function getPublicSiteUrl(requestHeaders?: Headers | null): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) {
    return normalizePublicSiteUrl(configured);
  }

  if (requestHeaders) {
    const origin = requestHeaders.get("origin");
    if (origin && /^https?:\/\//i.test(origin)) {
      return normalizePublicSiteUrl(origin);
    }

    const forwardedHost = requestHeaders.get("x-forwarded-host");
    const forwardedProto = requestHeaders.get("x-forwarded-proto") ?? "https";
    if (forwardedHost) {
      const host = forwardedHost.split(",")[0]!.trim();
      return normalizePublicSiteUrl(`${forwardedProto}://${host}`);
    }

    const host = requestHeaders.get("host");
    if (host) {
      if (host.includes("localhost") || host.startsWith("127.0.0.1")) {
        return `http://${host}`.replace(/\/+$/, "");
      }
      return normalizePublicSiteUrl(`https://${host}`);
    }
  }

  return "http://localhost:3000";
}

/** Auth callback for Example Portfolio magic-link / email confirmation. */
export function buildExampleAuthCallbackUrl(siteUrl: string): string {
  const base = normalizePublicSiteUrl(siteUrl);
  const next = encodeURIComponent("/dashboard");
  return `${base}/auth/callback?next=${next}&example=1`;
}

/** Generic auth callback with a safe post-login destination. */
export function buildAuthCallbackUrl(
  siteUrl: string,
  nextPath = "/dashboard",
): string {
  const base = normalizePublicSiteUrl(siteUrl);
  const next = encodeURIComponent(
    nextPath.startsWith("/") ? nextPath : "/dashboard",
  );
  return `${base}/auth/callback?next=${next}`;
}
