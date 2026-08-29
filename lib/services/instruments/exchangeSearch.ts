import {
  getExchangeRegistryEntry,
  listUserSelectableExchanges,
  type ExchangeRegistryEntry,
} from "@/lib/services/instruments/exchangeRegistry";
import {
  normalizeExchange,
  resolveExchangeForMatching,
} from "@/lib/services/instruments/exchangeNormalizer";

export type ExchangeOption = {
  code: string;
  label: string;
  marketGroup?: string;
};

type RankedExchangeMatch = {
  option: ExchangeOption;
  score: number;
};

/** Minimum score for an unambiguous exact catalog or alias match. */
const EXACT_MATCH_SCORE = 90;

function toOption(entry: ExchangeRegistryEntry): ExchangeOption {
  return {
    code: entry.purchaseCode,
    label: entry.displayLabel,
    marketGroup: entry.marketGroup,
  };
}

function scoreExchangeMatch(
  entry: ExchangeRegistryEntry,
  query: string,
): number {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return 0;

  if (entry.purchaseCode.toLowerCase() === normalized) return 100;
  if (entry.displayLabel.toLowerCase() === normalized) return 95;
  if (entry.displayLabel.toLowerCase().startsWith(normalized)) return 85;
  if (entry.purchaseCode.toLowerCase().startsWith(normalized)) return 80;

  for (const alias of entry.aliases) {
    const term = alias.toLowerCase();
    if (term === normalized) return 90;
    if (term.startsWith(normalized)) return 70;
    if (term.includes(normalized)) return 55;
  }

  // Allow spaced labels such as "trade gate" / "euronext amsterdam".
  const compactLabel = entry.displayLabel.toLowerCase().replace(/[^a-z0-9]/g, "");
  const compactQuery = normalized.replace(/[^a-z0-9]/g, "");
  if (compactLabel === compactQuery) return 95;
  if (compactLabel.startsWith(compactQuery) && compactQuery.length >= 2) {
    return 80;
  }

  if (entry.displayLabel.toLowerCase().includes(normalized)) return 50;
  if (entry.marketGroup?.toLowerCase().includes(normalized)) return 40;
  return 0;
}

/**
 * Ranks selectable registry entries for any user input.
 * Combines label/alias scoring with purchase and provider normalization.
 */
function rankExchangeMatches(query: string): RankedExchangeMatch[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const purchaseCode = normalizeExchange(trimmed);
  const providerCode = resolveExchangeForMatching(trimmed);

  return listUserSelectableExchanges()
    .map((entry) => {
      let score = scoreExchangeMatch(entry, trimmed);
      if (purchaseCode === entry.purchaseCode) {
        score = Math.max(score, 100);
      }
      // Provider path match (e.g. NASDAQ → US) must not collapse distinct
      // US purchase venues into a single exact pick when the query is US.
      if (
        providerCode &&
        entry.providerPricingCode === providerCode &&
        purchaseCode === entry.purchaseCode
      ) {
        score = Math.max(score, 100);
      }

      return {
        option: toOption(entry),
        score,
      };
    })
    .filter((item) => item.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.option.label.localeCompare(b.option.label),
    );
}

/** Picks one exchange when the ranked lookup is exact and unambiguous. */
function pickExactExchangeMatch(
  ranked: RankedExchangeMatch[],
): ExchangeOption | null {
  if (ranked.length === 0) return null;

  const topScore = ranked[0].score;
  const topMatches = ranked.filter((item) => item.score === topScore);

  if (topScore >= 95 && topMatches.length === 1) {
    return ranked[0].option;
  }

  if (topScore >= 95) {
    // Prefer the registry entry whose purchase code equals the normalized query.
    return topMatches[0]?.option ?? null;
  }

  if (topScore >= EXACT_MATCH_SCORE && topMatches.length === 1) {
    return topMatches[0].option;
  }

  return null;
}

/** Resolves user input to ranked catalog matches and an optional exact match. */
export function resolveExchangeInput(query: string): {
  exact: ExchangeOption | null;
  matches: ExchangeOption[];
} {
  const ranked = rankExchangeMatches(query);
  return {
    exact: pickExactExchangeMatch(ranked),
    matches: ranked.map((item) => item.option),
  };
}

export function findExchangeOption(
  value: string | null | undefined,
): ExchangeOption | null {
  if (!value?.trim()) return null;

  const exact = resolveExchangeInput(value).exact;
  if (exact) return exact;

  const entry = getExchangeRegistryEntry(value);
  if (entry?.userSelectable) {
    return toOption(entry);
  }

  return null;
}

export function formatExchangeInputValue(
  exchange: string | null | undefined,
): string {
  const option = findExchangeOption(exchange);
  return option?.label ?? exchange?.trim() ?? "";
}

export function getCommonExchangeOptions(limit = 8): ExchangeOption[] {
  return listUserSelectableExchanges()
    .slice(0, limit)
    .map((entry) => toOption(entry));
}

export function searchExchanges(
  query: string,
  options: { signal?: AbortSignal; limit?: number } = {},
): Promise<ExchangeOption[]> {
  if (options.signal?.aborted) {
    return Promise.reject(createAbortError());
  }

  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return Promise.resolve([]);
  }

  return new Promise((resolve, reject) => {
    if (options.signal?.aborted) {
      reject(createAbortError());
      return;
    }

    const { matches } = resolveExchangeInput(trimmed);
    resolve(matches.slice(0, options.limit ?? 8));
  });
}

export function isRecognizedExchangeInput(
  value: string | null | undefined,
): boolean {
  return findExchangeOption(value) !== null;
}

function createAbortError(): Error {
  const error = new Error("Aborted");
  error.name = "AbortError";
  return error;
}

export { normalizeExchange } from "@/lib/services/instruments/exchangeNormalizer";
