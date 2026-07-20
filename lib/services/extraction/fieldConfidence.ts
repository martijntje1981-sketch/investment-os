/**
 * Field-level extraction confidence helpers for import review UX.
 */

import type { ExtractionFieldConfidence } from "@/lib/services/extraction/types";
import type { ImportRow } from "@/lib/services/import/types";

/** Fields below this confidence may be edited during review. */
export const EXTRACTION_FIELD_REVIEW_THRESHOLD = 0.85;

export type ExtractionReviewField =
  | "name"
  | "isin"
  | "ticker"
  | "exchange"
  | "quantity"
  | "purchasePrice"
  | "currentPrice"
  | "purchaseDate";

const FIELD_LABELS: Record<ExtractionReviewField, string> = {
  name: "Instrument name",
  isin: "ISIN",
  ticker: "Ticker",
  exchange: "Exchange",
  quantity: "Quantity",
  purchasePrice: "Purchase price",
  currentPrice: "Current price",
  purchaseDate: "Purchase date",
};

export function extractionFieldLabel(field: ExtractionReviewField): string {
  return FIELD_LABELS[field];
}

function fieldConfidence(
  row: ImportRow,
  field: keyof ExtractionFieldConfidence,
): number {
  return row.extractionFieldConfidence?.[field] ?? row.extractionConfidence ?? 1;
}

export function getExtractionFieldsNeedingReview(
  row: ImportRow,
): ExtractionReviewField[] {
  const fields: ExtractionReviewField[] = [];

  if (row.assetType === "cash") {
    if (fieldConfidence(row, "quantity") < EXTRACTION_FIELD_REVIEW_THRESHOLD) {
      fields.push("quantity");
    }
    return fields;
  }

  if (fieldConfidence(row, "name") < EXTRACTION_FIELD_REVIEW_THRESHOLD) {
    fields.push("name");
  }
  if (fieldConfidence(row, "quantity") < EXTRACTION_FIELD_REVIEW_THRESHOLD) {
    fields.push("quantity");
  }
  if (
    fieldConfidence(row, "isin") < EXTRACTION_FIELD_REVIEW_THRESHOLD &&
    (!row.isin || fieldConfidence(row, "isin") < 0.95)
  ) {
    fields.push("isin");
  }
  if (
    fieldConfidence(row, "ticker") < EXTRACTION_FIELD_REVIEW_THRESHOLD &&
    !row.isin
  ) {
    fields.push("ticker");
  }
  if (fieldConfidence(row, "exchange") < EXTRACTION_FIELD_REVIEW_THRESHOLD) {
    fields.push("exchange");
  }
  if (
    fieldConfidence(row, "purchasePrice") < EXTRACTION_FIELD_REVIEW_THRESHOLD &&
    row.purchasePrice <= 0
  ) {
    fields.push("purchasePrice");
  }
  if (
    fieldConfidence(row, "currentPrice") < EXTRACTION_FIELD_REVIEW_THRESHOLD &&
    row.currentPrice <= 0
  ) {
    fields.push("currentPrice");
  }
  if (fieldConfidence(row, "purchaseDate") < EXTRACTION_FIELD_REVIEW_THRESHOLD) {
    fields.push("purchaseDate");
  }

  return fields;
}

export function aggregateFieldExtractionConfidence(
  fieldConfidence: ExtractionFieldConfidence | undefined,
  fallback?: number,
): number {
  if (!fieldConfidence) return fallback ?? 1;

  const scores = [
    fieldConfidence.name,
    fieldConfidence.quantity,
    Math.max(fieldConfidence.isin, fieldConfidence.ticker),
  ];

  return Math.min(...scores, fallback ?? 1);
}

export function hasUncertainExtraction(row: ImportRow): boolean {
  return getExtractionFieldsNeedingReview(row).length > 0;
}
