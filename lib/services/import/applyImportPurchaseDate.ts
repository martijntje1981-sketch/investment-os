import { annotateImportRow } from "@/lib/services/import/confidencePolicy";
import type { ImportRow } from "@/lib/services/import/types";
import { normalizeImportPurchaseDate } from "@/lib/services/import/purchaseDate";
import type { ExtractionFieldConfidence } from "@/lib/services/extraction/types";

function defaultFieldConfidence(): ExtractionFieldConfidence {
  return {
    name: 1,
    isin: 1,
    ticker: 1,
    exchange: 1,
    quantity: 1,
    purchasePrice: 1,
    currentPrice: 1,
    marketValue: 1,
    purchaseDate: 0,
    currency: 1,
  };
}

/** Applies an optional purchase date edit and keeps review/confirm state stable. */
export function applyImportPurchaseDateToRow(
  row: ImportRow,
  raw: string | number,
): ImportRow {
  const normalized = normalizeImportPurchaseDate(raw);
  const next: ImportRow = {
    ...row,
    purchaseDate: normalized,
    extractionFieldConfidence: {
      ...(row.extractionFieldConfidence ?? defaultFieldConfidence()),
      purchaseDate: normalized ? 1 : 0,
    },
  };

  return annotateImportRow(next);
}
