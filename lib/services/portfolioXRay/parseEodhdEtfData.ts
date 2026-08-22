/**
 * Pure parser for EODHD ETF_Data holdings payloads.
 * Used only when a verified raw payload is supplied — does not fetch.
 *
 * Mapping rules:
 * - Prefer ISIN when present
 * - Require Assets_% / weight that parses to a finite number > 0
 * - Reject empty / unusable rows
 * - Never invent missing weights
 */

import type {
  FundConstituent,
  FundLookThrough,
  LookThroughDataQuality,
} from "@/lib/services/portfolioXRay/types";

export type EodhdEtfHoldingRaw = {
  Code?: string | null;
  Name?: string | null;
  Country?: string | null;
  Sector?: string | null;
  Industry?: string | null;
  Exchange?: string | null;
  Currency?: string | null;
  Region?: string | null;
  /** EODHD commonly uses Assets_% */
  "Assets_%"?: string | number | null;
  Assets_Percent?: string | number | null;
  Weight?: string | number | null;
  ISIN?: string | null;
};

export type EodhdEtfDataRaw = {
  Holdings?: Record<string, EodhdEtfHoldingRaw> | EodhdEtfHoldingRaw[] | null;
  Top_10_Holdings?:
    | Record<string, EodhdEtfHoldingRaw>
    | EodhdEtfHoldingRaw[]
    | null;
  Holdings_Count?: number | string | null;
  Updated_At?: string | null;
  Holdings_Date?: string | null;
  ISIN?: string | null;
};

function parseWeight(raw: EodhdEtfHoldingRaw): number | null {
  const candidate =
    raw["Assets_%"] ?? raw.Assets_Percent ?? raw.Weight ?? null;
  if (candidate == null) return null;
  const value =
    typeof candidate === "number"
      ? candidate
      : Number.parseFloat(String(candidate).replace("%", "").trim());
  if (!Number.isFinite(value) || value <= 0) return null;
  return value;
}

function asArray(
  value:
    | Record<string, EodhdEtfHoldingRaw>
    | EodhdEtfHoldingRaw[]
    | null
    | undefined,
): Array<{ key: string; row: EodhdEtfHoldingRaw }> {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((row, index) => ({ key: String(index), row }));
  }
  return Object.entries(value).map(([key, row]) => ({ key, row }));
}

function normalizeConstituent(
  key: string,
  row: EodhdEtfHoldingRaw,
): FundConstituent | null {
  const weightPercent = parseWeight(row);
  if (weightPercent == null) return null;

  const isin = row.ISIN?.trim() || null;
  const symbol = (row.Code?.trim() || key.trim() || null) || null;
  const name = row.Name?.trim() || symbol || isin;
  if (!name) return null;

  // Reject ambiguous rows with neither ISIN nor code/symbol.
  if (!isin && !symbol) return null;

  return {
    isin,
    symbol,
    name,
    weightPercent,
    sector: row.Sector?.trim() || row.Industry?.trim() || null,
    country: row.Country?.trim() || row.Region?.trim() || null,
    currency: row.Currency?.trim() || null,
  };
}

/**
 * Parse an EODHD ETF_Data object into FundLookThrough.
 * Returns unavailable when holdings cannot be validated.
 */
export function parseEodhdEtfDataLookThrough(input: {
  instrumentId: string;
  instrumentSymbol: string;
  instrumentName: string;
  providerSymbol: string | null;
  etfData: EodhdEtfDataRaw | null | undefined;
}): FundLookThrough {
  const base = {
    instrumentId: input.instrumentId,
    instrumentSymbol: input.instrumentSymbol,
    instrumentName: input.instrumentName,
    providerSymbol: input.providerSymbol,
    asOfDate:
      input.etfData?.Holdings_Date?.trim() ||
      input.etfData?.Updated_At?.trim() ||
      null,
  };

  if (!input.etfData) {
    return {
      ...base,
      dataQuality: "unavailable",
      coveragePercent: null,
      holdingsCount: null,
      constituents: [],
      unavailableReason: "No ETF_Data payload was provided.",
    };
  }

  const rawHoldings = asArray(input.etfData.Holdings);
  const source =
    rawHoldings.length > 0
      ? rawHoldings
      : asArray(input.etfData.Top_10_Holdings);

  const constituents: FundConstituent[] = [];
  for (const entry of source) {
    const parsed = normalizeConstituent(entry.key, entry.row);
    if (parsed) constituents.push(parsed);
  }

  if (constituents.length === 0) {
    return {
      ...base,
      dataQuality: "unavailable",
      coveragePercent: null,
      holdingsCount: null,
      constituents: [],
      unavailableReason:
        "ETF_Data did not include usable constituent weights (ISIN/symbol + Assets_%).",
    };
  }

  const weightSum = constituents.reduce(
    (sum, row) => sum + row.weightPercent,
    0,
  );
  const coveragePercent = Math.min(100, weightSum);
  let dataQuality: LookThroughDataQuality = "partial";
  if (rawHoldings.length > 0 && weightSum >= 85) {
    dataQuality = "full";
  } else if (rawHoldings.length === 0) {
    // Top-10 only
    dataQuality = "partial";
  }

  const holdingsCountRaw = input.etfData.Holdings_Count;
  const holdingsCount =
    typeof holdingsCountRaw === "number"
      ? holdingsCountRaw
      : typeof holdingsCountRaw === "string"
        ? Number.parseInt(holdingsCountRaw, 10)
        : constituents.length;

  return {
    ...base,
    dataQuality,
    coveragePercent,
    holdingsCount: Number.isFinite(holdingsCount) ? holdingsCount : constituents.length,
    constituents,
    unavailableReason: null,
  };
}
