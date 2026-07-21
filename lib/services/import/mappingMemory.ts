/**
 * User-scoped confirmed instrument mappings for faster repeat imports.
 * Stored in localStorage alongside portfolio data (no DB migration required).
 */

import type { ListingConfirmationSource } from "@/lib/services/instruments/listingConfirmationSource";
import type { ImportRow } from "@/lib/services/import/types";
import type { ResolvedInstrument } from "@/lib/types/instrument";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";
import { importMappingStorageKey } from "@/lib/client/importMappingStorageKeys";

export type SavedImportMapping = {
  id: string;
  lookupKey: string;
  isin: string | null;
  symbol: string;
  exchange: string | null;
  instrumentName: string | null;
  providerSymbol: string;
  matchMethod: ResolvedInstrument["matchMethod"];
  confirmationSource?: ListingConfirmationSource;
  confirmedAt: string;
};

const MAX_MAPPINGS = 500;

function normalizeKeyPart(value: string | null | undefined): string {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

/** Stable lookup key — ISIN first, then ticker + exchange, then normalized name. */
export function buildImportMappingKey(row: Pick<ImportRow, "isin" | "symbol" | "exchange" | "name">): string | null {
  const isin = normalizeKeyPart(row.isin);
  if (isin) return `isin:${isin}`;

  const symbol = normalizeKeyPart(row.symbol);
  const exchange = normalizeKeyPart(row.exchange);
  if (symbol && exchange) return `ticker:${symbol}@${exchange}`;
  if (symbol) return `ticker:${symbol}`;

  const name = String(row.name ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
  if (name.length >= 4) return `name:${name}`;

  return null;
}

function readMappings(userSub: string): SavedImportMapping[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(importMappingStorageKey(userSub));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedImportMapping[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeMappings(userSub: string, mappings: SavedImportMapping[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    importMappingStorageKey(userSub),
    JSON.stringify(mappings.slice(0, MAX_MAPPINGS)),
  );
}

export function readImportMappingsFromCache(
  userSub: string,
): SavedImportMapping[] {
  return readMappings(userSub);
}

export function writeImportMappingsToCache(
  userSub: string,
  mappings: SavedImportMapping[],
): void {
  writeMappings(userSub, mappings);
}

export function findSavedImportMapping(
  userSub: string,
  row: ImportRow,
): SavedImportMapping | null {
  const key = buildImportMappingKey(row);
  if (!key) return null;
  return readMappings(userSub).find((item) => item.lookupKey === key) ?? null;
}

/** Resolves a confirmed import mapping for a saved portfolio holding. */
export function findSavedMappingForHolding(
  userSub: string,
  holding: Pick<
    StoredPortfolioHoldingLike,
    "symbol" | "isin" | "exchange" | "name"
  >,
): SavedImportMapping | null {
  const mappings = readMappings(userSub);
  if (mappings.length === 0) return null;

  const byKey = new Map(mappings.map((item) => [item.lookupKey, item]));
  const isin = normalizeKeyPart(holding.isin);
  if (isin) {
    const match = byKey.get(`isin:${isin}`);
    if (match) return match;
  }

  const symbol = normalizeKeyPart(holding.symbol);
  const exchange = normalizeKeyPart(holding.exchange);
  if (symbol && exchange) {
    const match = byKey.get(`ticker:${symbol}@${exchange}`);
    if (match) return match;
  }
  if (symbol) {
    const match = byKey.get(`ticker:${symbol}`);
    if (match) return match;
  }

  const name = String(holding.name ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
  if (name.length >= 4) {
    return byKey.get(`name:${name}`) ?? null;
  }

  return null;
}

type StoredPortfolioHoldingLike = {
  symbol: string;
  isin?: string | null;
  exchange?: string | null;
  name?: string;
};

export function applySavedMappingToRow(
  row: ImportRow,
  mapping: SavedImportMapping,
): ImportRow {
  const providerCode = mapping.providerSymbol.split(".")[0] ?? mapping.symbol;

  return {
    ...row,
    symbol: row.symbol.trim() || providerCode || row.symbol,
    isin: mapping.isin ?? row.isin ?? null,
    exchange: mapping.exchange ?? row.exchange ?? null,
    providerSymbol: mapping.providerSymbol,
    instrumentName: mapping.instrumentName ?? row.instrumentName ?? null,
    matchMethod: mapping.matchMethod,
    confirmationSource: mapping.confirmationSource,
    matchConfidence: 1,
    requiresConfirmation: false,
    matchWarnings: [],
    fromSavedMapping: true,
    userConfirmed: true,
    reviewTier: "auto",
    reviewReason: null,
  };
}

export function applySavedMappingsToRows(
  userSub: string | null,
  rows: ImportRow[],
): ImportRow[] {
  if (!userSub) return rows;
  return rows.map((row) => {
    if (row.assetType === "cash") return row;
    const saved = findSavedImportMapping(userSub, row);
    return saved ? applySavedMappingToRow(row, saved) : row;
  });
}

export function rememberConfirmedImportMappings(
  userSub: string,
  rows: ImportRow[],
): void {
  const existing = readMappings(userSub);
  const byKey = new Map(existing.map((item) => [item.lookupKey, item]));

  for (const row of rows) {
    if (row.assetType === "cash") continue;
    if (!row.providerSymbol) continue;
    if (row.reviewTier !== "auto" && !row.userConfirmed) continue;

    const lookupKey = buildImportMappingKey(row);
    if (!lookupKey) continue;

    byKey.set(lookupKey, {
      id: crypto.randomUUID(),
      lookupKey,
      isin: row.isin ?? null,
      symbol: row.symbol.trim().toUpperCase(),
      exchange: row.exchange ?? null,
      instrumentName: row.instrumentName ?? null,
      providerSymbol: row.providerSymbol,
      matchMethod: row.matchMethod ?? "ticker_exchange",
      confirmationSource: row.confirmationSource,
      confirmedAt: new Date().toISOString(),
    });
  }

  writeMappings(userSub, Array.from(byKey.values()));
}

export function rememberConfirmedHolding(
  userSub: string,
  holding: Pick<
    StoredPortfolioHolding,
    | "symbol"
    | "isin"
    | "exchange"
    | "name"
    | "providerSymbol"
    | "instrumentName"
    | "matchMethod"
  >,
): void {
  if (!holding.providerSymbol) return;

  rememberConfirmedImportMappings(userSub, [
    {
      id: crypto.randomUUID(),
      symbol: holding.symbol,
      name: holding.name,
      quantity: 0,
      purchasePrice: 0,
      currentPrice: 0,
      purchaseDate: null,
      assetType: "investment",
      currency: "EUR",
      isin: holding.isin ?? null,
      exchange: holding.exchange ?? null,
      providerSymbol: holding.providerSymbol,
      instrumentName: holding.instrumentName ?? null,
      matchMethod: holding.matchMethod as ResolvedInstrument["matchMethod"] | undefined,
      userConfirmed: true,
    },
  ]);
}

export function mappingToResolved(mapping: SavedImportMapping): ResolvedInstrument {
  return {
    providerSymbol: mapping.providerSymbol,
    instrumentName: mapping.instrumentName,
    exchange: mapping.exchange,
    isin: mapping.isin,
    matchMethod: mapping.matchMethod,
    confidence: 1,
    requiresConfirmation: false,
    warnings: [],
  };
}
