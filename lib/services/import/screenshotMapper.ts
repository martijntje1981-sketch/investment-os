/**
 * Maps screenshot analysis output into normalized import rows.
 */

import { aggregateFieldExtractionConfidence } from "@/lib/services/extraction/fieldConfidence";
import { isValidIsin } from "@/lib/services/instruments/validation";
import { annotateImportRow } from "@/lib/services/import/confidencePolicy";
import type {
  ImportRow,
  ScreenshotRecognizedHolding,
} from "@/lib/services/import/types";

export function mapScreenshotHoldingToImportRow(
  holding: ScreenshotRecognizedHolding,
): ImportRow {
  const isCash = holding.assetType === "cash";
  const fieldConfidence =
    holding.fieldConfidence ?? holding.extractionFieldConfidence;

  const currentPrice =
    holding.currentPrice ??
    holding.price ??
    (holding.quantity > 0 && (holding.marketValue ?? holding.value)
      ? (holding.marketValue ?? holding.value)! / holding.quantity
      : 0);

  const purchasePrice =
    holding.purchasePrice ?? (isCash ? 1 : 0);

  const ticker = holding.ticker.trim().toUpperCase();
  const isinFromTicker = isValidIsin(ticker) ? ticker : null;
  const symbol = isCash
    ? ticker || holding.currency || "EUR"
    : isinFromTicker
      ? ""
      : ticker;

  const extractionConfidence =
    holding.extractionConfidence ??
    holding.confidence ??
    aggregateFieldExtractionConfidence(fieldConfidence);

  const row: ImportRow = {
    id: crypto.randomUUID(),
    symbol,
    name: isCash
      ? holding.name || `${holding.currency || "EUR"} Cash`
      : holding.name,
    quantity: holding.quantity,
    purchasePrice,
    currentPrice: isCash ? 1 : currentPrice,
    purchaseDate: holding.purchaseDate ?? null,
    assetType: isCash ? "cash" : "investment",
    currency: (holding.currency || "EUR").toUpperCase(),
    extractionConfidence,
    extractionFieldConfidence: fieldConfidence,
    extractionWarnings: [
      ...(holding.warnings ?? []),
      ...(holding.normalizationNotes ?? []),
    ].filter(Boolean),
    isin: holding.isin ?? isinFromTicker,
    exchange: holding.exchange,
    providerSymbol: holding.providerSymbol ?? null,
    instrumentName: holding.instrumentName ?? null,
    matchMethod: holding.matchMethod,
    matchConfidence: holding.matchConfidence,
    requiresConfirmation: holding.requiresConfirmation,
    matchWarnings: holding.matchWarnings,
    candidates: holding.candidates,
    userConfirmed: !holding.requiresConfirmation && Boolean(holding.providerSymbol),
  };

  return annotateImportRow(row);
}

export function mapScreenshotHoldingsToImportRows(
  holdings: ScreenshotRecognizedHolding[],
): ImportRow[] {
  return holdings.map(mapScreenshotHoldingToImportRow);
}
