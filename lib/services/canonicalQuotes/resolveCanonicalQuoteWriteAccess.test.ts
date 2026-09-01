import { describe, expect, it } from "vitest";

import { resolveProductAccess } from "@/lib/services/productAccess";
import { resolveCanonicalQuoteWriteAccess } from "@/lib/services/canonicalQuotes/resolveCanonicalQuoteWriteAccess";

describe("resolveCanonicalQuoteWriteAccess", () => {
  it("allows personal Free, Trial, and Complete", () => {
    expect(
      resolveCanonicalQuoteWriteAccess(resolveProductAccess({ exampleKind: "none" })),
    ).toEqual({ outcome: "allow_personal" });
    expect(
      resolveCanonicalQuoteWriteAccess(
        resolveProductAccess({
          exampleKind: "active",
          trialKind: "personal",
          expiresAt: "2099-01-01T00:00:00.000Z",
          daysRemaining: 11,
        }),
      ),
    ).toEqual({ outcome: "allow_personal" });
    expect(
      resolveCanonicalQuoteWriteAccess(
        resolveProductAccess({ exampleKind: "converted" }),
      ),
    ).toEqual({ outcome: "allow_personal" });
  });

  it("skips Demo and unresolved access", () => {
    expect(
      resolveCanonicalQuoteWriteAccess(
        resolveProductAccess({ exampleKind: "active" }),
      ),
    ).toEqual({ outcome: "skip_demo" });
    expect(resolveCanonicalQuoteWriteAccess(null)).toEqual({
      outcome: "unresolved",
    });
    expect(resolveCanonicalQuoteWriteAccess(undefined)).toEqual({
      outcome: "unresolved",
    });
  });
});
