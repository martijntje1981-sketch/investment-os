/**
 * Import confidence policy — decides auto-import vs user review.
 *
 * Match Engine remains the source of truth; this layer only classifies UX tiers.
 */

import { MATCHING_UNAVAILABLE_WARNING } from "@/lib/services/marketData/providerErrors";
import type { ImportReviewTier, ImportRow, ImportReviewPlan } from "@/lib/services/import/types";
import { aggregateFieldExtractionConfidence } from "@/lib/services/extraction/fieldConfidence";

/** Auto-import when effective confidence is at or above this value. */
export const AUTO_IMPORT_THRESHOLD = 0.94;

/** Ask the user to confirm between this value and AUTO_IMPORT_THRESHOLD. */
export const REVIEW_THRESHOLD = 0.82;

export function roundConfidencePercent(confidence: number | undefined): number {
  if (confidence == null || !Number.isFinite(confidence)) return 0;
  return Math.round(Math.max(0, Math.min(1, confidence)) * 100);
}

/** Combines extraction and match signals into one decision score. */
export function effectiveImportConfidence(row: ImportRow): number {
  if (row.assetType === "cash") return 1;

  const match = row.matchConfidence ?? 0;
  const extraction =
    row.extractionConfidence ??
    aggregateFieldExtractionConfidence(row.extractionFieldConfidence);

  if (row.fromSavedMapping && row.providerSymbol) return 1;
  if (!row.providerSymbol || row.matchMethod === "unresolved") return match;

  if (extraction == null) return match;

  // Both signals matter: a shaky OCR read should not auto-import even on a strong ISIN match.
  return Math.min(match, extraction);
}

function isProviderUnavailableRow(row: ImportRow): boolean {
  const warnings = row.matchWarnings ?? [];
  return warnings.some(
    (warning) =>
      warning.includes(MATCHING_UNAVAILABLE_WARNING) ||
      /temporarily unavailable|quota|rate.?limit|402|429/i.test(warning),
  );
}

export function isImportProviderLookupUnavailable(row: ImportRow): boolean {
  return isProviderUnavailableRow(row);
}

export function shouldShowExactListingFallback(
  row: ImportRow,
  candidateCount: number,
): boolean {
  if (row.assetType === "cash" || row.providerSymbol?.trim()) {
    return false;
  }

  return isProviderUnavailableRow(row) || candidateCount === 0;
}

export function buildReviewReason(row: ImportRow, tier: ImportReviewTier): string | null {
  if (tier === "auto") return null;

  if (row.assetType !== "cash" && (!row.providerSymbol || row.matchMethod === "unresolved")) {
    if (isProviderUnavailableRow(row)) {
      return MATCHING_UNAVAILABLE_WARNING;
    }
    return "We could not match this holding to a listed instrument.";
  }

  const warnings = [
    ...(row.extractionWarnings ?? []),
    ...(row.matchWarnings ?? []),
  ].filter(Boolean);

  if (tier === "blocked") {
    return (
      warnings[0] ??
      "This match is uncertain. Pick the correct instrument or confirm the details."
    );
  }

  if (row.requiresConfirmation) {
    return warnings[0] ?? "Please confirm this instrument match.";
  }

  return warnings[0] ?? "Please review this holding before import.";
}

export function classifyImportRow(row: ImportRow): ImportReviewTier {
  if (row.assetType === "cash") return "auto";
  if (row.userConfirmed) return "auto";

  const confidence = effectiveImportConfidence(row);

  if (!row.providerSymbol || row.matchMethod === "unresolved") {
    return confidence >= REVIEW_THRESHOLD ? "review" : "blocked";
  }

  if (confidence >= AUTO_IMPORT_THRESHOLD && !row.requiresConfirmation) {
    return "auto";
  }

  if (confidence >= REVIEW_THRESHOLD) {
    return "review";
  }

  return "blocked";
}

export function annotateImportRow(row: ImportRow): ImportRow {
  const reviewTier = classifyImportRow(row);
  return {
    ...row,
    reviewTier,
    reviewReason: buildReviewReason(row, reviewTier),
  };
}

export function buildImportReviewPlan(rows: ImportRow[]): ImportReviewPlan {
  const annotated = rows.map(annotateImportRow);
  const autoRows = annotated.filter((row) => row.reviewTier === "auto");
  const reviewRows = annotated.filter((row) => row.reviewTier === "review");
  const blockedRows = annotated.filter((row) => row.reviewTier === "blocked");
  const cashCount = annotated.filter((row) => row.assetType === "cash").length;

  return {
    total: annotated.length,
    autoCount: autoRows.length,
    reviewCount: reviewRows.length,
    blockedCount: blockedRows.length,
    cashCount,
    autoRows,
    reviewRows,
    blockedRows,
    readyToImport:
      annotated.length > 0 &&
      annotated.every(
        (row) => row.reviewTier === "auto" || row.userConfirmed === true,
      ),
  };
}

export function importTierLabel(tier: ImportReviewTier): string {
  switch (tier) {
    case "auto":
      return "Ready";
    case "review":
      return "Confirm";
    case "blocked":
      return "Needs attention";
    default:
      return "Review";
  }
}
