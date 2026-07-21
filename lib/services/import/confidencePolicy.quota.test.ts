import { describe, expect, it } from "vitest";

import { buildReviewReason } from "@/lib/services/import/confidencePolicy";
import { MATCHING_UNAVAILABLE_WARNING } from "@/lib/services/marketData/providerErrors";
import type { ImportRow } from "@/lib/services/import/types";

function row(partial: Partial<ImportRow>): ImportRow {
  return {
    id: "1",
    assetType: "investment",
    symbol: "STRC",
    name: "STRC",
    quantity: 1,
    purchasePrice: 100,
    currentPrice: 0,
    currency: "EUR",
    matchMethod: "unresolved",
    matchConfidence: 0,
    requiresConfirmation: true,
    matchWarnings: [],
    providerSymbol: null,
    ...partial,
  };
}

describe("confidencePolicy quota messaging", () => {
  it("shows provider-unavailable instead of no-match when quota is exhausted", () => {
    const reason = buildReviewReason(
      row({
        matchWarnings: [MATCHING_UNAVAILABLE_WARNING],
      }),
      "review",
    );

    expect(reason).toBe(MATCHING_UNAVAILABLE_WARNING);
    expect(reason).not.toMatch(/could not match/i);
  });

  it("shows genuine no-match when provider is available", () => {
    const reason = buildReviewReason(row({ matchWarnings: [] }), "review");

    expect(reason).toMatch(/could not match this holding/i);
  });
});
