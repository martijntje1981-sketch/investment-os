/**
 * Listing metadata helpers — extract quote currency from EODHD rows and provider symbols.
 */

import {
  providerExchangesMatch,
} from "@/lib/services/instruments/exchangeNormalizer";
import { normalizeProviderQuoteCurrency } from "@/lib/services/instruments/quoteCurrency";
import { normalizeIsin } from "@/lib/services/instruments/validation";
import { writeListingMetadata } from "@/lib/services/marketData/persistentMappingCache";
import type {
  EodhdIdMappingRow,
  EodhdSearchRow,
} from "@/lib/services/instruments/eodhdClient";
import type { PriceCurrency } from "@/lib/services/prices/types";

export type ListingMetadataRecord = {
  providerSymbol: string;
  quoteCurrency: PriceCurrency;
  exchange?: string | null;
  isin?: string | null;
  source: "id_mapping" | "search" | "live_quote" | "exchange_fallback";
  resolvedAt: string;
};

export function parseProviderSymbolParts(
  providerSymbol: string | null | undefined,
): { ticker: string; exchange: string } | null {
  const trimmed = providerSymbol?.trim().toUpperCase();
  if (!trimmed) {
    return null;
  }
  const dotIndex = trimmed.lastIndexOf(".");
  if (dotIndex <= 0 || dotIndex >= trimmed.length - 1) {
    return null;
  }
  return {
    ticker: trimmed.slice(0, dotIndex),
    exchange: trimmed.slice(dotIndex + 1),
  };
}

function rowMatchesProviderSymbol(
  row: EodhdIdMappingRow | EodhdSearchRow,
  parts: { ticker: string; exchange: string },
): boolean {
  const code = row.Code?.trim().toUpperCase() ?? "";
  if (code !== parts.ticker) {
    return false;
  }
  return providerExchangesMatch(row.Exchange, parts.exchange);
}

export function extractQuoteCurrencyFromProviderRows(
  rows: Array<EodhdIdMappingRow | EodhdSearchRow>,
  providerSymbol: string,
): PriceCurrency | null {
  const parts = parseProviderSymbolParts(providerSymbol);
  if (!parts) {
    return null;
  }

  const matching = rows.filter((row) => rowMatchesProviderSymbol(row, parts));
  if (matching.length === 0) {
    return null;
  }

  const currencies = new Set<PriceCurrency>();
  for (const row of matching) {
    const currency = normalizeProviderQuoteCurrency(row.Currency);
    if (currency) {
      currencies.add(currency);
    }
  }

  if (currencies.size === 1) {
    return [...currencies][0]!;
  }

  return null;
}

/** Populates listing_metadata cache entries from id-mapping or search rows. */
export async function persistListingMetadataFromProviderRows(
  rows: Array<EodhdIdMappingRow | EodhdSearchRow>,
): Promise<void> {
  const resolvedAt = new Date().toISOString();

  for (const row of rows) {
    const code = row.Code?.trim().toUpperCase();
    const exchange = row.Exchange?.trim().toUpperCase();
    const currency = normalizeProviderQuoteCurrency(row.Currency);
    if (!code || !exchange || !currency) {
      continue;
    }
    const providerSymbol = `${code}.${exchange}`;
    await writeListingMetadata({
      providerSymbol,
      quoteCurrency: currency,
      exchange,
      isin: normalizeIsin(row.ISIN),
      source: "id_mapping",
      resolvedAt,
    });
  }
}
