import { describe, expect, it } from "vitest";

import { validateCanonicalCryptoQuoteCandidate } from "@/lib/services/canonicalQuotes/validateCanonicalCryptoQuote";

function validCandidate(overrides: Record<string, unknown> = {}) {
  return {
    holdingId: "c0c0c0c0-c0c0-40c0-80c0-c0c0c0c0c0c0",
    canonicalEurUnitPrice: 1,
    canonicalPricedAt: "2026-09-01T11:00:00.000Z",
    pairPrice: 1.1,
    pairCurrency: "USD",
    fxToEur: 0.9,
    fxAt: "2026-09-01T11:00:00.000Z",
    quoteUpdatedAt: "2026-09-01T11:00:00.000Z",
    fetchedAt: "2026-09-01T11:00:01.000Z",
    providerSymbol: "BTC-USD.CC",
    providerId: "eodhd-quotes",
    dataStatus: "live",
    estimateOnly: false,
    quoteKind: "crypto_market",
    ...overrides,
  };
}

describe("validateCanonicalCryptoQuoteCandidate", () => {
  it("accepts an internally produced live crypto market quote", () => {
    const result = validateCanonicalCryptoQuoteCandidate(validCandidate());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.candidate.pairCurrency).toBe("USD");
      expect(result.candidate.providerSymbol).toBe("BTC-USD.CC");
      expect(result.candidate.estimateOnly).toBe(false);
    }
  });

  it("accepts delayed status and very small pair prices", () => {
    const result = validateCanonicalCryptoQuoteCandidate(
      validCandidate({
        dataStatus: "delayed",
        pairPrice: 1.3e-8,
        canonicalEurUnitPrice: 1.2e-8,
        providerSymbol: "SHIB-USD.CC",
      }),
    );
    expect(result.ok).toBe(true);
  });

  it("rejects estimate-only quotes", () => {
    expect(
      validateCanonicalCryptoQuoteCandidate(validCandidate({ estimateOnly: true })),
    ).toMatchObject({ ok: false, reason: "estimate_only" });
  });

  it("rejects stale and unavailable quotes", () => {
    expect(
      validateCanonicalCryptoQuoteCandidate(validCandidate({ dataStatus: "stale" })),
    ).toMatchObject({ ok: false, reason: "stale_or_unavailable" });
    expect(
      validateCanonicalCryptoQuoteCandidate(
        validCandidate({ dataStatus: "unavailable" }),
      ),
    ).toMatchObject({ ok: false, reason: "stale_or_unavailable" });
  });

  it("rejects manual and purchase-price sources", () => {
    expect(
      validateCanonicalCryptoQuoteCandidate(validCandidate({ source: "manual" })),
    ).toMatchObject({ ok: false, reason: "manual_price" });
    expect(
      validateCanonicalCryptoQuoteCandidate(
        validCandidate({ source: "purchase_price" }),
      ),
    ).toMatchObject({ ok: false, reason: "purchase_price_fallback" });
  });

  it("rejects client-supplied financial fields", () => {
    expect(
      validateCanonicalCryptoQuoteCandidate(
        validCandidate({ purchasePrice: 90, currentPrice: 1 }),
      ),
    ).toMatchObject({ ok: false, reason: "client_financial_fields" });
    expect(
      validateCanonicalCryptoQuoteCandidate(
        validCandidate({ last_market_price: 1 }),
      ),
    ).toMatchObject({ ok: false, reason: "client_financial_fields" });
  });

  it("rejects missing pair, EUR, FX, and quote timestamps", () => {
    expect(
      validateCanonicalCryptoQuoteCandidate(validCandidate({ pairPrice: 0 })),
    ).toMatchObject({ ok: false, reason: "missing_pair_price" });
    expect(
      validateCanonicalCryptoQuoteCandidate(
        validCandidate({ canonicalEurUnitPrice: null }),
      ),
    ).toMatchObject({ ok: false, reason: "missing_canonical_eur" });
    expect(
      validateCanonicalCryptoQuoteCandidate(validCandidate({ fxToEur: undefined })),
    ).toMatchObject({ ok: false, reason: "missing_fx" });
    expect(
      validateCanonicalCryptoQuoteCandidate(
        validCandidate({ quoteUpdatedAt: "" }),
      ),
    ).toMatchObject({ ok: false, reason: "missing_quote_timestamp" });
  });

  it("rejects EUR pair quotes that are not FX 1", () => {
    expect(
      validateCanonicalCryptoQuoteCandidate(
        validCandidate({ pairCurrency: "EUR", fxToEur: 1.1, pairPrice: 1 }),
      ),
    ).toMatchObject({ ok: false, reason: "eur_pair_fx_mismatch" });
  });
});
