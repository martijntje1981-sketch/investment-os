/**
 * Finalize import rows for portfolio storage.
 */

import { normalizeHoldingForSave } from "@/lib/client/portfolioPricing";
import { annotateImportRow } from "@/lib/services/import/confidencePolicy";
import type { ImportRow } from "@/lib/services/import/types";
import { normalizeImportPurchaseDate } from "@/lib/services/import/purchaseDate";
import { applyResolvedToHolding } from "@/lib/services/instruments/applyResolved";
import type { ResolvedInstrument } from "@/lib/types/instrument";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

export function applyMatchResultToImportRow(
  row: ImportRow,
  resolved: ResolvedInstrument,
): ImportRow {
  const mergedWarnings = [
    ...(row.extractionWarnings ?? []),
    ...resolved.warnings,
  ].filter(Boolean);

  const merged = applyResolvedToHolding(
    {
      ...row,
      matchWarnings: row.matchWarnings,
    },
    resolved,
  );

  const next: ImportRow = {
    ...merged,
    extractionWarnings:
      mergedWarnings.length > 0 ? mergedWarnings : row.extractionWarnings,
    candidates: resolved.candidates ?? row.candidates,
    userConfirmed: resolved.requiresConfirmation ? row.userConfirmed ?? false : true,
  };

  return annotateImportRow(next);
}

export function confirmImportRow(row: ImportRow): ImportRow {
  return annotateImportRow({
    ...row,
    purchaseDate: normalizeImportPurchaseDate(row.purchaseDate),
    userConfirmed: true,
    requiresConfirmation: false,
  });
}

export function selectImportCandidate(
  row: ImportRow,
  candidate: ResolvedInstrument,
): ImportRow {
  const applied = applyMatchResultToImportRow(row, {
    ...candidate,
    requiresConfirmation: false,
    confidence: Math.max(candidate.confidence, 0.95),
    warnings: [],
  });

  return confirmImportRow(applied);
}

export function importRowToMatchInput(row: ImportRow) {
  return {
    ticker: row.symbol.trim() || null,
    isin: row.isin ?? null,
    exchange: row.exchange ?? null,
    instrumentName: row.name.trim() || null,
    assetType: row.assetType,
  };
}

export function finalizeImportRowForSave(row: ImportRow): StoredPortfolioHolding {
  const ready =
    row.reviewTier === "auto" || row.userConfirmed || row.assetType === "cash";

  return normalizeHoldingForSave({
    id: row.id,
    symbol: row.symbol,
    name: row.name,
    quantity: row.quantity,
    purchasePrice: row.purchasePrice,
    currentPrice: row.currentPrice,
    currency: "EUR",
    assetType: row.assetType,
    isin: row.isin ?? null,
    exchange: row.exchange ?? null,
    providerSymbol: row.providerSymbol ?? null,
    instrumentName: row.instrumentName ?? null,
    matchMethod: row.matchMethod,
    matchConfidence: row.matchConfidence,
    requiresConfirmation: ready ? false : row.requiresConfirmation ?? true,
    matchWarnings: row.matchWarnings,
  });
}

export function finalizeImportRowsForSave(
  rows: ImportRow[],
): StoredPortfolioHolding[] {
  return rows.map(finalizeImportRowForSave);
}

export function canImportRows(rows: ImportRow[]): {
  ok: boolean;
  message?: string;
} {
  if (rows.length === 0) {
    return { ok: false, message: "No holdings to import." };
  }

  for (const row of rows) {
    if (!row.name.trim() || row.quantity < 0) {
      return { ok: false, message: "Some holdings are incomplete." };
    }

    if (row.assetType === "cash") continue;

    if (!row.symbol.trim() && !row.isin) {
      return {
        ok: false,
        message: "Each investment needs a ticker or ISIN before import.",
      };
    }

    if (row.reviewTier === "blocked" && !row.userConfirmed) {
      return {
        ok: false,
        message: "Resolve uncertain matches before importing your portfolio.",
      };
    }

    if (row.reviewTier === "review" && !row.userConfirmed) {
      return {
        ok: false,
        message: "Confirm the holdings flagged for review before importing.",
      };
    }

    if (!row.providerSymbol && !row.userConfirmed) {
      return {
        ok: false,
        message: "Match every investment to a listed instrument before import.",
      };
    }
  }

  return { ok: true };
}
