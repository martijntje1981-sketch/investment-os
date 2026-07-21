import {
  isKnownProviderExchange,
  normalizeExchange,
  resolveExchangeForMatching,
} from "@/lib/services/instruments/exchangeNormalizer";

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

function catalogEntryForCode(code: string): ExchangeCatalogEntry | undefined {
  return EXCHANGE_CATALOG.find((entry) => entry.code === code);
}

export function findExchangeOption(
  value: string | null | undefined,
): ExchangeOption | null {
  if (!value?.trim()) return null;

  const providerCode = resolveExchangeForMatching(value);
  if (!providerCode) return null;

  const entry = catalogEntryForCode(providerCode);
  if (entry) {
    return { code: entry.code, label: entry.label };
  }

  return { code: providerCode, label: providerCode };
}

export function formatExchangeInputValue(
  exchange: string | null | undefined,
): string {
  const option = findExchangeOption(exchange);
  return option?.label ?? exchange?.trim() ?? "";
}

export function searchExchanges(
  query: string,
  options: { signal?: AbortSignal } = {},
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

    const direct = findExchangeOption(trimmed);
    const ranked = EXCHANGE_CATALOG.map((entry) => ({
      entry,
      score: scoreExchangeMatch(entry, trimmed),
    }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(({ entry }) => ({ code: entry.code, label: entry.label }));

    if (direct && !ranked.some((item) => item.code === direct.code)) {
      ranked.unshift(direct);
    }

    resolve(ranked.slice(0, 8));
  });
}

export function isRecognizedExchangeInput(
  value: string | null | undefined,
): boolean {
  return isKnownProviderExchange(value);
}

function createAbortError(): Error {
  const error = new Error("Aborted");
  error.name = "AbortError";
  return error;
}

// Re-export for callers that need raw normalization checks in tests.
export { normalizeExchange };
