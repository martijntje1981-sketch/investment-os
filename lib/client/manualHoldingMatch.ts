/**
 * Client-side instrument lookup for manual portfolio entry.
 */

import {
  applyMatchResultToImportRow,
  importRowToMatchInput,
  selectImportCandidate,
} from "@/lib/services/import/finalizeImport";
import { annotateImportRow } from "@/lib/services/import/confidencePolicy";
import type { ImportRow } from "@/lib/services/import/types";
import {
  applySelectedListing,
  draftToImportRow,
  importRowToStoredHolding,
} from "@/lib/services/instruments/listingConfirmation";
import {
  looksLikeProviderSymbolInput,
  parseProviderSymbolInput,
} from "@/lib/services/instruments/providerSymbolInput";
import type { ResolvedInstrument } from "@/lib/types/instrument";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

import { MATCHING_UNAVAILABLE_WARNING } from "@/lib/services/marketData/providerErrors";

type MatchApiResult = {
  input: ReturnType<typeof importRowToMatchInput>;
  resolved: ResolvedInstrument;
};

type MatchApiResponse = {
  success: boolean;
  results?: MatchApiResult[];
  message?: string;
};

export type ManualListingLookupResult = {
  holding: StoredPortfolioHolding;
  candidates: ResolvedInstrument[];
  warnings: string[];
  quotaUnavailable: boolean;
};

function isMatchProviderFailure(message: string | undefined): boolean {
  if (!message) return false;
  return /402|429|quota|rate.?limit|payment required|temporarily unavailable/i.test(
    message,
  );
}

function warningsIndicateLookupUnavailable(warnings: string[]): boolean {
  return warnings.some((warning) => warning.includes(MATCHING_UNAVAILABLE_WARNING));
}

function mergeLookupResult(
  draft: StoredPortfolioHolding,
  row: ImportRow,
): ManualListingLookupResult {
  const holding = importRowToStoredHolding(row);
  const warnings = row.matchWarnings ?? [];
  return {
    holding,
    candidates: row.candidates ?? [],
    warnings,
    quotaUnavailable: warningsIndicateLookupUnavailable(warnings),
  };
}

export async function lookupManualHoldingListing(
  draft: StoredPortfolioHolding,
): Promise<ManualListingLookupResult> {
  if (draft.assetType === "cash") {
    return {
      holding: draft,
      candidates: [],
      warnings: [],
      quotaUnavailable: false,
    };
  }

  const symbol = draft.symbol.trim();
  if (!symbol && !draft.isin && !draft.name.trim()) {
    return {
      holding: draft,
      candidates: [],
      warnings: ["Enter a ticker, ISIN, or instrument name to find listings."],
      quotaUnavailable: false,
    };
  }

  if (looksLikeProviderSymbolInput(symbol)) {
    const parsed = parseProviderSymbolInput(symbol);
    if (!parsed.ok) {
      return {
        holding: draft,
        candidates: [],
        warnings: [parsed.message],
        quotaUnavailable: false,
      };
    }

    const holding = {
      ...applySelectedListing(
        {
          ...draft,
          symbol: parsed.ticker,
          exchange: parsed.exchange,
          matchMethod: draft.matchMethod as ResolvedInstrument["matchMethod"] | undefined,
        },
        parsed.resolved,
      ),
      confirmationSource: parsed.confirmationSource,
    } as StoredPortfolioHolding;

    return {
      holding,
      candidates: [parsed.resolved],
      warnings: [],
      quotaUnavailable: false,
    };
  }

  const seedRow = annotateImportRow(draftToImportRow(draft));
  const response = await fetch("/api/instruments/match", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ holdings: [importRowToMatchInput(seedRow)] }),
  });

  const data = (await response.json()) as MatchApiResponse;

  if (!response.ok || !data.success || !data.results?.[0]) {
    const unavailable = isMatchProviderFailure(data.message);
    return {
      holding: draft,
      candidates: [],
      warnings: [
        unavailable
          ? "Instrument lookup is temporarily unavailable. You can continue manually and save your holding."
          : "We couldn't find a listing right now. You can continue manually and save your holding.",
      ],
      quotaUnavailable: unavailable,
    };
  }

  const matched = applyMatchResultToImportRow(seedRow, data.results[0].resolved);
  const annotated = annotateImportRow(matched);

  if (annotated.providerSymbol) {
    return mergeLookupResult(draft, annotated);
  }

  const warnings = annotated.matchWarnings ?? [];
  const lookupUnavailable = warningsIndicateLookupUnavailable(warnings);

  return {
    holding: draft,
    candidates: annotated.candidates ?? [],
    warnings: lookupUnavailable
      ? [
          "Instrument lookup is temporarily unavailable. You can continue manually and save your holding.",
        ]
      : warnings.length > 0
        ? warnings
        : ["No listing matched this holding. You can continue manually and save your holding."],
    quotaUnavailable: lookupUnavailable,
  };
}

export function applyManualListingSelection(
  draft: StoredPortfolioHolding,
  candidate: ResolvedInstrument,
): StoredPortfolioHolding {
  const row = selectImportCandidate(draftToImportRow(draft), candidate);
  return importRowToStoredHolding(row);
}

export { parseProviderSymbolInput, looksLikeProviderSymbolInput };
