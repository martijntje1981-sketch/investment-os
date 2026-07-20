import { describe, expect, it } from "vitest";

import { getExtractionFieldsNeedingReview } from "@/lib/services/extraction/fieldConfidence";
import {
  applyImportPurchaseDateToRow,
  buildImportReviewPlan,
  confirmImportRow,
  getPurchaseDateValidationError,
  isPurchaseDateConfirmReady,
  normalizeImportPurchaseDate,
} from "@/lib/services/import";
import { annotateImportRow } from "@/lib/services/import/confidencePolicy";
import type { ImportRow } from "@/lib/services/import/types";

function reviewRow(overrides: Partial<ImportRow> = {}): ImportRow {
  return annotateImportRow({
    id: "1",
    symbol: "VWCE",
    name: "Vanguard FTSE All-World",
    quantity: 10,
    purchasePrice: 100,
    currentPrice: 0,
    assetType: "investment",
    matchMethod: "isin",
    matchConfidence: 0.9,
    providerSymbol: "VWCE.XETRA",
    requiresConfirmation: true,
    extractionFieldConfidence: {
      name: 0.99,
      isin: 0.99,
      ticker: 0.99,
      exchange: 0.99,
      quantity: 0.99,
      purchasePrice: 0.99,
      currentPrice: 0.99,
      marketValue: 0.99,
      purchaseDate: 0,
      currency: 0.99,
    },
    ...overrides,
  });
}

describe("optional import purchase date", () => {
  it("does not force review for an empty purchase date", () => {
    const fields = getExtractionFieldsNeedingReview(reviewRow({ purchaseDate: null }));
    expect(fields).not.toContain("purchaseDate");
  });

  it("flags only extracted purchase dates that still need review", () => {
    const fields = getExtractionFieldsNeedingReview(
      reviewRow({ purchaseDate: "2024-03-14" }),
    );
    expect(fields).toContain("purchaseDate");
  });

  it("normalizes valid dates to ISO format", () => {
    expect(normalizeImportPurchaseDate("14.03.2024")).toBe("2024-03-14");
    expect(normalizeImportPurchaseDate("2024-03-14")).toBe("2024-03-14");
  });

  it("allows confirmation with an empty purchase date", () => {
    const confirmed = confirmImportRow(reviewRow({ purchaseDate: null }));
    const plan = buildImportReviewPlan([confirmed]);

    expect(confirmed.purchaseDate).toBeNull();
    expect(isPurchaseDateConfirmReady(confirmed.purchaseDate)).toBe(true);
    expect(plan.readyToImport).toBe(true);
  });

  it("allows confirmation after entering a valid purchase date", () => {
    const updated = applyImportPurchaseDateToRow(reviewRow(), "2024-03-14");
    const confirmed = confirmImportRow(updated);
    const plan = buildImportReviewPlan([confirmed]);

    expect(updated.purchaseDate).toBe("2024-03-14");
    expect(getPurchaseDateValidationError(updated.purchaseDate)).toBeNull();
    expect(plan.readyToImport).toBe(true);
  });

  it("rejects invalid non-empty purchase dates", () => {
    expect(getPurchaseDateValidationError("not-a-date")).toBe(
      "Enter a valid purchase date.",
    );
    expect(isPurchaseDateConfirmReady("not-a-date")).toBe(false);
  });
});
