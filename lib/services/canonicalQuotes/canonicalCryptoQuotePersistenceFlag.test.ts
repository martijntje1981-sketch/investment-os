import { afterEach, describe, expect, it, vi } from "vitest";

import { isCanonicalCryptoQuotePersistenceEnabled } from "@/lib/services/canonicalQuotes/canonicalCryptoQuotePersistenceFlag";

describe("isCanonicalCryptoQuotePersistenceEnabled", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is disabled when absent", () => {
    expect(isCanonicalCryptoQuotePersistenceEnabled({})).toBe(false);
  });

  it("is disabled for any value except exact true", () => {
    expect(
      isCanonicalCryptoQuotePersistenceEnabled({
        CANONICAL_CRYPTO_QUOTE_PERSISTENCE_ENABLED: "false",
      }),
    ).toBe(false);
    expect(
      isCanonicalCryptoQuotePersistenceEnabled({
        CANONICAL_CRYPTO_QUOTE_PERSISTENCE_ENABLED: "TRUE",
      }),
    ).toBe(false);
    expect(
      isCanonicalCryptoQuotePersistenceEnabled({
        CANONICAL_CRYPTO_QUOTE_PERSISTENCE_ENABLED: "1",
      }),
    ).toBe(false);
    expect(
      isCanonicalCryptoQuotePersistenceEnabled({
        CANONICAL_CRYPTO_QUOTE_PERSISTENCE_ENABLED: "true ",
      }),
    ).toBe(false);
  });

  it("is enabled only for exact true", () => {
    expect(
      isCanonicalCryptoQuotePersistenceEnabled({
        CANONICAL_CRYPTO_QUOTE_PERSISTENCE_ENABLED: "true",
      }),
    ).toBe(true);
  });

  it("keeps Preview and default environments write-disabled without the flag", () => {
    expect(
      isCanonicalCryptoQuotePersistenceEnabled({
        VERCEL_ENV: "preview",
        NODE_ENV: "production",
      }),
    ).toBe(false);
    expect(
      isCanonicalCryptoQuotePersistenceEnabled({
        VERCEL_ENV: "production",
      }),
    ).toBe(false);
    expect(
      isCanonicalCryptoQuotePersistenceEnabled({
        VERCEL_ENV: "preview",
        CANONICAL_CRYPTO_QUOTE_PERSISTENCE_ENABLED: "false",
      }),
    ).toBe(false);
  });
});
