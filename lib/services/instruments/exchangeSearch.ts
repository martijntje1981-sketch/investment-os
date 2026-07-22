import { resolveExchangeForMatching } from "@/lib/services/instruments/exchangeNormalizer";

export type ExchangeOption = {
  code: string;
  label: string;
};

type ExchangeCatalogEntry = ExchangeOption & {
  searchTerms: string[];
};

const EXCHANGE_CATALOG: ExchangeCatalogEntry[] = [
  {
    code: "XETRA",
    label: "Xetra",
    searchTerms: ["xetra", "xetr", "xfra", "frankfurt", "germany", "de", "xet"],
  },
  {
    code: "TDG",
    label: "Tradegate",
    searchTerms: ["tradegate", "tdg", "tg", "trade gate", "tradegate bsx"],
  },
  {
    code: "AS",
    label: "Euronext Amsterdam",
    searchTerms: ["amsterdam", "ams", "xams", "euronext amsterdam"],
  },
  {
    code: "PA",
    label: "Euronext Paris",
    searchTerms: ["paris", "pa", "epa", "xpar", "xepa", "euronext paris"],
  },
  {
    code: "BR",
    label: "Euronext Brussels",
    searchTerms: ["brussels", "br", "xbru", "euronext brussels"],
  },
  {
    code: "LSE",
    label: "London Stock Exchange",
    searchTerms: ["lse", "lon", "london", "xlon"],
  },
  {
    code: "US",
    label: "US markets",
    searchTerms: ["us", "nasdaq", "nyse", "arca", "xnas", "xnys", "united states"],
  },
  {
    code: "SW",
    label: "SIX Swiss Exchange",
    searchTerms: ["sw", "six", "swiss", "zurich", "xswx"],
  },
  {
    code: "MI",
    label: "Borsa Italiana",
    searchTerms: ["mi", "milan", "italy", "xmil"],
  },
  {
    code: "MC",
    label: "Bolsa de Madrid",
    searchTerms: ["mc", "madrid", "spain", "xmad"],
  },
  {
    code: "ST",
    label: "Nasdaq Stockholm",
    searchTerms: ["st", "stockholm", "sweden", "xsto"],
  },
  {
    code: "HE",
    label: "Nasdaq Helsinki",
    searchTerms: ["he", "helsinki", "finland", "xhel"],
  },
  {
    code: "IR",
    label: "Euronext Dublin",
    searchTerms: ["ir", "dublin", "ireland", "xdub"],
  },
  {
    code: "VI",
    label: "Vienna Stock Exchange",
    searchTerms: ["vi", "vienna", "austria", "xvie"],
  },
];

/** Minimum score for an unambiguous exact catalog or alias match. */
const EXACT_MATCH_SCORE = 90;

type RankedExchangeMatch = {
  option: ExchangeOption;
  score: number;
};

function scoreExchangeMatch(entry: ExchangeCatalogEntry, query: string): number {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return 0;

  if (entry.code.toLowerCase() === normalized) return 100;
  if (entry.label.toLowerCase() === normalized) return 95;
  if (entry.label.toLowerCase().startsWith(normalized)) return 85;
  if (entry.code.toLowerCase().startsWith(normalized)) return 80;

  for (const term of entry.searchTerms) {
    if (term === normalized) return 90;
    if (term.startsWith(normalized)) return 70;
    if (term.includes(normalized)) return 55;
  }

  if (entry.label.toLowerCase().includes(normalized)) return 50;
  return 0;
}

/**
 * Single exchange lookup: ranks catalog entries for any user input.
 * Combines catalog label/term scoring with provider alias normalization.
 */
function rankExchangeMatches(query: string): RankedExchangeMatch[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const providerCode = resolveExchangeForMatching(trimmed);

  return EXCHANGE_CATALOG.map((entry) => {
    let score = scoreExchangeMatch(entry, trimmed);
    if (providerCode === entry.code) {
      score = Math.max(score, 100);
    }

    return {
      option: { code: entry.code, label: entry.label },
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

  if (topScore >= 95) {
    return ranked[0].option;
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
  return resolveExchangeInput(value).exact;
}

export function formatExchangeInputValue(
  exchange: string | null | undefined,
): string {
  const option = findExchangeOption(exchange);
  return option?.label ?? exchange?.trim() ?? "";
}

export function getCommonExchangeOptions(limit = 8): ExchangeOption[] {
  return EXCHANGE_CATALOG.slice(0, limit).map((entry) => ({
    code: entry.code,
    label: entry.label,
  }));
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
