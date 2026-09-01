/**
 * Server-only write gate for canonical crypto quote persistence.
 * Absent or any value other than exactly "true" is disabled.
 * Never expose as NEXT_PUBLIC_*. Preview/default remain write-disabled.
 */

export const CANONICAL_CRYPTO_QUOTE_PERSISTENCE_ENABLED_ENV =
  "CANONICAL_CRYPTO_QUOTE_PERSISTENCE_ENABLED" as const;

export type CanonicalCryptoQuotePersistenceEnv = {
  CANONICAL_CRYPTO_QUOTE_PERSISTENCE_ENABLED?: string;
  VERCEL_ENV?: string;
  NODE_ENV?: string;
};

export function isCanonicalCryptoQuotePersistenceEnabled(
  env: CanonicalCryptoQuotePersistenceEnv = process.env,
): boolean {
  return env.CANONICAL_CRYPTO_QUOTE_PERSISTENCE_ENABLED === "true";
}
