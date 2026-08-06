import { describe, expect, it } from "vitest";

import {
  EXTRACTION_FIELD_REVIEW_THRESHOLD,
  getExtractionFieldsNeedingReview,
  shouldReviewExchange,
} from "@/lib/services/extraction/fieldConfidence";
import type { ImportRow } from "@/lib/services/import/types";

function reviewRow(overrides: Partial<ImportRow> = {}): ImportRow {
  return {
    id: "row-1",
    symbol: "NUKL",
    name: "VanEck Uranium and Nuclear Technologies UCITS ETF",
    quantity: 10,
    purchasePrice: 10,
    currentPrice: 12,
    assetType: "investment",
    extractionFieldConfidence: {
      name: 0.95,
      quantity: 0.95,
      isin: 0.95,
      ticker: 0.95,
      exchange: 0.4,
      purchasePrice: 0.95,
      currentPrice: 0.95,
      purchaseDate: 0.95,
      marketValue: 0.95,
      currency: 0.95,
    },
    ...overrides,
  };
}

describe("shouldReviewExchange", () => {
  it("keeps exchange editable while extraction confidence is low", () => {
    expect(shouldReviewExchange(reviewRow())).toBe(true);
    expect(getExtractionFieldsNeedingReview(reviewRow())).toContain("exchange");
  });

  it("hides exchange review after a high-confidence resolved listing exists", () => {
    const matched = reviewRow({
      providerSymbol: "NUKL.XETRA",
      exchange: "XETRA",
      matchMethod: "isin",
      matchConfidence: 0.97,
      requiresConfirmation: false,
    });

    expect(shouldReviewExchange(matched)).toBe(false);
    expect(getExtractionFieldsNeedingReview(matched)).not.toContain("exchange");
  });

  it("requires exchange selection when multiple listings remain", () => {
    const ambiguous = reviewRow({
      providerSymbol: null,
      matchMethod: "unresolved",
      candidates: [
        {
          providerSymbol: "NUKL.AS",
          instrumentName: "VanEck ETF",
          exchange: "AS",
          isin: "IE000M7V94E1",
          matchMethod: "isin",
          confidence: 0.6,
          requiresConfirmation: true,
          warnings: [],
        },
        {
          providerSymbol: "NUKL.XETRA",
          instrumentName: "VanEck ETF",
          exchange: "XETRA",
          isin: "IE000M7V94E1",
          matchMethod: "isin",
          confidence: 0.6,
          requiresConfirmation: true,
          warnings: [],
        },
      ],
    });

    expect(shouldReviewExchange(ambiguous)).toBe(true);
  });

  it("documents the one-character lock root cause", () => {
    const afterFirstKeystrokeConfidenceBump = reviewRow({
      exchange: "X",
      extractionFieldConfidence: {
        ...reviewRow().extractionFieldConfidence!,
        exchange: 1,
      },
    });

    expect(
      (afterFirstKeystrokeConfidenceBump.extractionFieldConfidence?.exchange ??
        0) >= EXTRACTION_FIELD_REVIEW_THRESHOLD,
    ).toBe(true);
    expect(shouldReviewExchange(afterFirstKeystrokeConfidenceBump)).toBe(false);
  });
});
