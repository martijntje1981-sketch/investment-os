import type {
  CashProviderFetchResult,
  CashRatePoint,
} from "@/lib/services/cashIntelligence/types";

const NY_FED_LATEST =
  "https://markets.newyorkfed.org/api/rates/all/latest.json";

type NyFedRateRow = {
  type?: string;
  percentRate?: number;
  effectiveDate?: string;
};

type NyFedLatestResponse = {
  refRates?: NyFedRateRow[];
};

function findRate(
  rows: NyFedRateRow[],
  type: string,
  meta: Pick<CashRatePoint, "sourceName" | "sourceUrl" | "seriesId">,
): CashRatePoint | null {
  const match = rows.find(
    (row) => String(row.type ?? "").toUpperCase() === type.toUpperCase(),
  );
  if (
    !match ||
    typeof match.percentRate !== "number" ||
    !Number.isFinite(match.percentRate)
  ) {
    return null;
  }

  return {
    ratePercent: match.percentRate,
    effectiveDate: match.effectiveDate ?? null,
    ...meta,
  };
}

export async function fetchNyFedCashRates(
  fetchImpl: typeof fetch = fetch,
): Promise<CashProviderFetchResult> {
  const errors: string[] = [];

  try {
    const response = await fetchImpl(NY_FED_LATEST, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`NY Fed HTTP ${response.status}`);
    }

    const payload = (await response.json()) as NyFedLatestResponse;
    const rows = Array.isArray(payload.refRates) ? payload.refRates : [];

    const overnight = findRate(rows, "SOFR", {
      sourceName: "Federal Reserve Bank of New York",
      sourceUrl: "https://markets.newyorkfed.org/markets/reference-rates",
      seriesId: "SOFR",
    });

    const policy = findRate(rows, "EFFR", {
      sourceName: "Federal Reserve Bank of New York",
      sourceUrl: "https://markets.newyorkfed.org/markets/reference-rates",
      seriesId: "EFFR",
    });

    if (!overnight && !policy) {
      errors.push("NY Fed returned no SOFR or EFFR observations");
    }

    return { overnight, policy, errors };
  } catch (error) {
    return {
      overnight: null,
      policy: null,
      errors: [
        error instanceof Error ? error.message : "NY Fed rates fetch failed",
      ],
    };
  }
}
