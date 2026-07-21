import { normalizeExchange } from "@/lib/services/instruments/exchangeNormalizer";

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
    searchTerms: ["xetra", "xetr", "xfra", "frankfurt", "germany", "de"],
  },
  {
    code: "AS",
    label: "Euronext Amsterdam",
    searchTerms: ["amsterdam", "ams", "euronext amsterdam", "euronext"],
  },
  {
    code: "PA",
    label: "Euronext Paris",
    searchTerms: ["paris", "pa", "euronext paris"],
  },
  {
    code: "BR",
    label: "Euronext Brussels",
    searchTerms: ["brussels", "br", "euronext brussels"],
  },
  {
    code: "LSE",
    label: "London Stock Exchange",
    searchTerms: ["lse", "lon", "london"],
  },
  {
    code: "US",
    label: "US markets",
    searchTerms: ["us", "nasdaq", "nyse", "arca", "united states"],
  },
  {
    code: "SW",
    label: "SIX Swiss Exchange",
    searchTerms: ["sw", "six", "swiss", "zurich"],
  },
  {
    code: "MI",
    label: "Borsa Italiana",
    searchTerms: ["mi", "milan", "italy"],
  },
  {
    code: "MC",
    label: "Bolsa de Madrid",
    searchTerms: ["mc", "madrid", "spain"],
  },
  {
    code: "ST",
    label: "Nasdaq Stockholm",
    searchTerms: ["st", "stockholm", "sweden"],
  },
  {
    code: "HE",
    label: "Nasdaq Helsinki",
    searchTerms: ["he", "helsinki", "finland"],
  },
  {
    code: "IR",
    label: "Euronext Dublin",
    searchTerms: ["ir", "dublin", "ireland"],
  },
  {
    code: "VI",
    label: "Vienna Stock Exchange",
    searchTerms: ["vi", "vienna", "austria"],
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

export function findExchangeOption(
  value: string | null | undefined,
): ExchangeOption | null {
  if (!value?.trim()) return null;

  const normalizedCode = normalizeExchange(value);
  if (normalizedCode) {
    const byCode = EXCHANGE_CATALOG.find((entry) => entry.code === normalizedCode);
    if (byCode) {
      return { code: byCode.code, label: byCode.label };
    }
    return { code: normalizedCode, label: normalizedCode };
  }

  const lowered = value.trim().toLowerCase();
  const byLabel = EXCHANGE_CATALOG.find(
    (entry) =>
      entry.label.toLowerCase() === lowered ||
      entry.searchTerms.includes(lowered),
  );
  if (byLabel) {
    return { code: byLabel.code, label: byLabel.label };
  }

  return null;
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

    const ranked = EXCHANGE_CATALOG.map((entry) => ({
      entry,
      score: scoreExchangeMatch(entry, trimmed),
    }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(({ entry }) => ({ code: entry.code, label: entry.label }));

    const normalized = normalizeExchange(trimmed);
    if (
      normalized &&
      !ranked.some((item) => item.code === normalized) &&
      normalized.includes(trimmed.toUpperCase().replace(/[^A-Z0-9]/g, ""))
    ) {
      ranked.unshift({ code: normalized, label: normalized });
    }

    resolve(ranked.slice(0, 8));
  });
}

function createAbortError(): Error {
  const error = new Error("Aborted");
  error.name = "AbortError";
  return error;
}
