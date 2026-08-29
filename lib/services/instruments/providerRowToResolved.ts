/**
 * Converts a provider listing row into a resolved instrument.
 */

import { buildProviderSymbol } from "@/lib/services/instruments/eodhdClient";
import { normalizeProviderExchangeCode } from "@/lib/services/instruments/exchangeNormalizer";
import {
  QUOTE_CURRENCY_REVIEW_WARNING,
  resolveMatchQuoteCurrency,
} from "@/lib/services/instruments/quoteCurrency";
import { normalizeIsin } from "@/lib/services/instruments/validation";
import type { EodhdIdMappingRow, EodhdSearchRow } from "@/lib/services/instruments/eodhdClient";
import type { ResolvedInstrument } from "@/lib/types/instrument";

const CONFIRMATION_THRESHOLD = 0.85;

export function providerRowToResolved(
  row: EodhdIdMappingRow | EodhdSearchRow,
  matchMethod: ResolvedInstrument["matchMethod"],
  confidence: number,
  inputIsin: string | null,
  warnings: string[] = [],
): ResolvedInstrument {
  const code = row.Code?.trim().toUpperCase() ?? "";
  const exchange = normalizeProviderExchangeCode(row.Exchange) ?? null;
  const providerSymbol =
    code && exchange ? buildProviderSymbol(code, exchange) : null;
  const quoteCurrency = resolveMatchQuoteCurrency({
    providerCurrency: row.Currency,
    providerSymbol,
  });
  const nextWarnings = [...warnings];
  if (providerSymbol && !quoteCurrency) {
    nextWarnings.push(QUOTE_CURRENCY_REVIEW_WARNING);
  }

  const resolvedConfidence =
    providerSymbol && !quoteCurrency
      ? Math.min(confidence, CONFIRMATION_THRESHOLD - 0.01)
      : confidence;

  return {
    providerSymbol,
    instrumentName: row.Name?.trim() ?? null,
    exchange,
    isin: normalizeIsin(row.ISIN) ?? inputIsin,
    quoteCurrency,
    providerInstrumentType: row.Type?.trim() || null,
    matchMethod,
    confidence: resolvedConfidence,
    requiresConfirmation: resolvedConfidence < CONFIRMATION_THRESHOLD,
    warnings: nextWarnings,
  };
}
