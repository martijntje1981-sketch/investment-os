/**
 * Normalizes EODHD id-mapping / search rows into Code + Exchange listings.
 *
 * Live id-mapping returns `{ symbol: "VUSA.XETRA", isin: "IE00B3XXRP09" }`.
 * Search and older mocks use `{ Code, Exchange, ISIN, ... }`.
 * Unknown provider suffixes are dropped rather than invented.
 */

import {
  isKnownProviderExchange,
  normalizeProviderExchangeCode,
} from "@/lib/services/instruments/exchangeNormalizer";
import { normalizeIsin } from "@/lib/services/instruments/validation";
import type { EodhdIdMappingRow, EodhdSearchRow } from "@/lib/services/instruments/eodhdClient";

export type ProviderListingRow = EodhdIdMappingRow & EodhdSearchRow;

export function parseCompositeListingSymbol(
  symbol: string | null | undefined,
): { code: string; exchange: string } | null {
  const trimmed = symbol?.trim().toUpperCase();
  if (!trimmed) return null;
  const dotIndex = trimmed.lastIndexOf(".");
  if (dotIndex <= 0 || dotIndex >= trimmed.length - 1) {
    return null;
  }
  const code = trimmed.slice(0, dotIndex).trim();
  const exchange = trimmed.slice(dotIndex + 1).trim();
  if (!code || !exchange) return null;
  return { code, exchange };
}

function rowIsin(row: ProviderListingRow): string | null {
  return normalizeIsin(row.ISIN) ?? normalizeIsin(row.isin);
}

export function listingRowConflictsIsin(
  row: ProviderListingRow,
  userIsin: string | null | undefined,
): boolean {
  const expected = normalizeIsin(userIsin);
  const actual = rowIsin(row);
  return Boolean(expected && actual && expected !== actual);
}

export function listingRowMatchesIsin(
  row: ProviderListingRow,
  userIsin: string | null | undefined,
): boolean {
  return !listingRowConflictsIsin(row, userIsin);
}

/** Maps a provider row onto Code/Exchange/ISIN when the venue is supported. */
export function normalizeProviderListingRow(
  row: ProviderListingRow,
): EodhdIdMappingRow | null {
  const fromComposite = parseCompositeListingSymbol(row.symbol);
  const code = (row.Code?.trim() || fromComposite?.code || "").toUpperCase();
  const rawExchange = row.Exchange?.trim() || fromComposite?.exchange || "";
  const exchange = normalizeProviderExchangeCode(rawExchange);

  if (!code || !exchange || !isKnownProviderExchange(exchange)) {
    return null;
  }

  return {
    ...row,
    Code: code,
    Exchange: exchange,
    ISIN: rowIsin(row) ?? undefined,
    Name: row.Name?.trim() || undefined,
    Currency: row.Currency,
    Type: row.Type,
    Country: row.Country,
    symbol: `${code}.${exchange}`,
    isin: rowIsin(row),
  };
}

export function normalizeProviderListingRows(
  rows: ProviderListingRow[] | null | undefined,
  userIsin?: string | null,
): EodhdIdMappingRow[] {
  if (!rows?.length) return [];

  const normalized: EodhdIdMappingRow[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    if (listingRowConflictsIsin(row, userIsin)) {
      continue;
    }
    const next = normalizeProviderListingRow(row);
    if (!next?.Code || !next.Exchange) continue;
    const providerSymbol = `${next.Code}.${next.Exchange}`;
    if (seen.has(providerSymbol)) continue;
    seen.add(providerSymbol);
    normalized.push({ ...next, symbol: providerSymbol });
  }

  return normalized;
}
