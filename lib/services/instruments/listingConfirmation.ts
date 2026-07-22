import { applyResolvedToHolding } from "@/lib/services/instruments/applyResolved";
import type { ImportRow } from "@/lib/services/import/types";
import { annotateImportRow } from "@/lib/services/import/confidencePolicy";
import type { ParsedProviderSymbol } from "@/lib/services/instruments/providerSymbolInput";
import type { InstrumentMatchInput, ResolvedInstrument } from "@/lib/types/instrument";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";
export type ListingCandidateSource = {
  providerSymbol?: string | null;
  instrumentName?: string | null;
  exchange?: string | null;
  isin?: string | null;
  matchMethod?: ResolvedInstrument["matchMethod"];
  matchConfidence?: number;
  candidates?: ResolvedInstrument[];
};

export type ListingDisplay = {
  instrumentName: string;
  ticker: string;
  exchange: string;
  currency: string;
  isin: string;
  providerSymbol: string;
  summaryLine: string;
};

function inferListingCurrency(providerSymbol: string | null | undefined): string {
  if (!providerSymbol) return "EUR";
  if (providerSymbol.endsWith(".US")) return "USD";
  if (providerSymbol.endsWith(".LSE")) return "GBP";
  if (providerSymbol.endsWith(".SW")) return "CHF";
  return "EUR";
}

export function formatListingLine(candidate: ResolvedInstrument): string {
  const details = formatListingDetails(candidate);
  return details.summaryLine;
}

export function formatListingDetails(
  candidate: ResolvedInstrument,
): ListingDisplay {
  const providerSymbol = candidate.providerSymbol ?? "—";
  const ticker =
    candidate.providerSymbol?.split(".")[0] ??
    candidate.instrumentName?.split(" ")[0] ??
    "—";

  return {
    instrumentName: candidate.instrumentName ?? "—",
    ticker,
    exchange: candidate.exchange ?? "—",
    currency: inferListingCurrency(candidate.providerSymbol),
    isin: candidate.isin ?? "—",
    providerSymbol,
    summaryLine: `${ticker} · ${candidate.exchange ?? "—"} · ${inferListingCurrency(candidate.providerSymbol)}`,
  };
}

/** Builds deduplicated listing options from a resolved match and its candidates. */
export function buildListingCandidates(
  source: ListingCandidateSource,
  limit = 6,
): ResolvedInstrument[] {
  const options: ResolvedInstrument[] = [];

  if (source.providerSymbol) {
    options.push({
      providerSymbol: source.providerSymbol,
      instrumentName: source.instrumentName ?? null,
      exchange: source.exchange ?? null,
      isin: source.isin ?? null,
      matchMethod: source.matchMethod ?? "unresolved",
      confidence: source.matchConfidence ?? 0.8,
      requiresConfirmation: false,
      warnings: [],
    });
  }

  for (const candidate of source.candidates ?? []) {
    if (!candidate.providerSymbol) continue;
    if (options.some((item) => item.providerSymbol === candidate.providerSymbol)) {
      continue;
    }
    options.push(candidate);
  }

  return options.slice(0, limit);
}

/** Applies a confirmed listing to any holding-like row (import or manual). */
export function applySelectedListing<
  T extends {
    symbol: string;
    name: string;
    isin?: string | null;
    exchange?: string | null;
    providerSymbol?: string | null;
    instrumentName?: string | null;
    matchMethod?: ResolvedInstrument["matchMethod"];
    matchConfidence?: number;
    requiresConfirmation?: boolean;
    matchWarnings?: string[];
  },
>(holding: T, candidate: ResolvedInstrument): T {
  if (!candidate.providerSymbol || candidate.matchMethod === "unresolved") {
    return applyResolvedToHolding(holding, candidate);
  }

  return applyResolvedToHolding(holding, {
    ...candidate,
    requiresConfirmation: false,
    confidence: Math.max(candidate.confidence, 0.95),
    warnings: [],
  });
}

export function holdingToMatchInput(
  holding: Pick<
    StoredPortfolioHolding,
    "symbol" | "name" | "isin" | "exchange" | "assetType"
  >,
): InstrumentMatchInput {
  return {
    ticker: holding.symbol.trim() || null,
    isin: holding.isin ?? null,
    exchange: holding.exchange ?? null,
    instrumentName: holding.name.trim() || null,
    assetType: holding.assetType === "cash" ? "cash" : "investment",
  };
}

export function draftToImportRow(
  draft: StoredPortfolioHolding,
  candidates?: ResolvedInstrument[],
): ImportRow {
  return {
    id: draft.id,
    symbol: draft.symbol,
    name: draft.name,
    quantity: draft.quantity,
    purchasePrice: draft.purchasePrice,
    currentPrice: draft.currentPrice,
    purchaseDate: null,
    assetType: draft.assetType ?? "investment",
    currency: draft.currency ?? "EUR",
    isin: draft.isin ?? null,
    exchange: draft.exchange ?? null,
    providerSymbol: draft.providerSymbol ?? null,
    instrumentName: draft.instrumentName ?? null,
    matchMethod: draft.matchMethod as ResolvedInstrument["matchMethod"] | undefined,
    matchConfidence: draft.matchConfidence,
    requiresConfirmation: draft.requiresConfirmation,
    matchWarnings: draft.matchWarnings,
    candidates,
    userConfirmed: Boolean(draft.providerSymbol),
  };
}

export function importRowToStoredHolding(
  row: ImportRow,
): StoredPortfolioHolding {
  return {
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
    requiresConfirmation: row.requiresConfirmation,
    matchWarnings: row.matchWarnings,
  };
}

export function investmentNeedsListingConfirmation(
  holding: Pick<StoredPortfolioHolding, "assetType" | "providerSymbol">,
): boolean {
  // Listing confirmation is optional; manual save validation lives in holdingValidation.ts.
  void holding;
  return false;
}

/** Applies a locally validated exact provider symbol without calling the provider API. */
export function applyManualExactListingToImportRow(
  row: ImportRow,
  parsed: Extract<ParsedProviderSymbol, { ok: true }>,
): ImportRow {
  if (row.providerSymbol?.trim()) {
    return row;
  }

  return annotateImportRow({
    ...row,
    symbol: parsed.ticker,
    exchange: parsed.exchange,
    providerSymbol: parsed.providerSymbol,
    matchMethod: "ticker_exchange",
    matchConfidence: 1,
    confirmationSource: "manual_exact_listing",
    requiresConfirmation: true,
    matchWarnings: [],
    userConfirmed: false,
  });
}
