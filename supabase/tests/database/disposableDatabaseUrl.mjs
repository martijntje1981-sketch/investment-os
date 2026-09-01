/**
 * Allow only loopback / CI-service Postgres URLs.
 * Never accept a configured Supabase, TransIP, Vercel, or other hosted URL.
 */

const BLOCKED_HOST_PATTERN =
  /supabase|transip|vercel|neon\.tech|amazonaws|azure|railway\.app|render\.com|pooler/i;

const CI_ALLOWED_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
  "postgres",
]);

const LOCAL_ALLOWED_HOSTS = new Set([
  ...CI_ALLOWED_HOSTS,
  "host.docker.internal",
]);

export function isCiDisposableDbMode(env = process.env) {
  return env.GITHUB_ACTIONS === "true" || env.DISPOSABLE_DB_MODE === "ci";
}

function isPrivateIpv4(hostname) {
  const match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!match) return false;
  const parts = match.slice(1).map((part) => Number(part));
  if (parts.some((part) => part > 255)) return false;
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  return false;
}

export function describeDisposableDatabaseTarget(raw) {
  const url = new URL(raw);
  return {
    protocol: url.protocol.replace(/:$/, ""),
    hostname: url.hostname,
    port: url.port || (url.protocol === "postgres:" || url.protocol === "postgresql:" ? "5432" : ""),
    database: url.pathname.replace(/^\//, "") || "postgres",
  };
}

export function assertDisposableDatabaseUrl(raw, env = process.env) {
  const ci = isCiDisposableDbMode(env);
  if (!raw || !String(raw).trim()) {
    if (ci) {
      throw new Error(
        "CI requires DATABASE_URL for the disposable Postgres service. Refusing to continue.",
      );
    }
    return null;
  }

  const trimmed = String(raw).trim();
  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error("DATABASE_URL is not a valid URL. Refusing to continue.");
  }

  if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") {
    throw new Error("DATABASE_URL must use postgres://. Refusing to continue.");
  }

  const hostname = parsed.hostname.toLowerCase();
  if (BLOCKED_HOST_PATTERN.test(hostname) || BLOCKED_HOST_PATTERN.test(trimmed)) {
    throw new Error(
      "DATABASE_URL host is not a disposable local/CI database. Refusing to continue.",
    );
  }

  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  if (supabaseUrl) {
    try {
      const configuredHost = new URL(supabaseUrl).hostname.toLowerCase();
      if (
        configuredHost &&
        configuredHost === hostname &&
        !LOCAL_ALLOWED_HOSTS.has(configuredHost)
      ) {
        throw new Error("DATABASE_URL must not be the configured Supabase URL.");
      }
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "DATABASE_URL must not be the configured Supabase URL."
      ) {
        throw error;
      }
    }
  }

  const allowed = ci ? CI_ALLOWED_HOSTS : LOCAL_ALLOWED_HOSTS;
  if (!allowed.has(hostname) && !(ci === false && isPrivateIpv4(hostname))) {
    throw new Error(
      `DATABASE_URL host '${hostname}' is not an allowed disposable target. Refusing to continue.`,
    );
  }

  return describeDisposableDatabaseTarget(trimmed);
}
