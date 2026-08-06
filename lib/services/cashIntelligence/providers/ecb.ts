import type {
  CashProviderFetchResult,
  CashRatePoint,
} from "@/lib/services/cashIntelligence/types";

const ECB_DATA_API = "https://data-api.ecb.europa.eu/service/data";
const DFR_SERIES = "FM/D.U2.EUR.4F.KR.DFR.LEV";
const ESTR_SERIES = "EST/B.EU000A2X2A25.WT";

function parseEcbCsvLastObservation(csv: string): {
  date: string | null;
  value: number | null;
} {
  const lines = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return { date: null, value: null };
  }

  const header = lines[0]!.split(",");
  const timeIndex = header.findIndex((col) => /TIME_PERIOD|TIME/i.test(col));
  const obsIndex = header.findIndex((col) => /OBS_VALUE/i.test(col));

  if (timeIndex < 0 || obsIndex < 0) {
    return { date: null, value: null };
  }

  for (let i = lines.length - 1; i >= 1; i -= 1) {
    const cols = lines[i]!.split(",");
    const rawValue = cols[obsIndex]?.replace(/"/g, "").trim();
    const rawDate = cols[timeIndex]?.replace(/"/g, "").trim() ?? null;
    const value = rawValue ? Number(rawValue) : NaN;
    if (Number.isFinite(value)) {
      return { date: rawDate, value };
    }
  }

  return { date: null, value: null };
}

async function fetchEcbSeries(
  seriesPath: string,
  meta: Pick<CashRatePoint, "sourceName" | "sourceUrl" | "seriesId">,
  fetchImpl: typeof fetch,
): Promise<CashRatePoint | null> {
  const url = `${ECB_DATA_API}/${seriesPath}?lastNObservations=5&format=csvdata`;
  const response = await fetchImpl(url, {
    headers: { Accept: "text/csv" },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`ECB ${meta.seriesId} HTTP ${response.status}`);
  }

  const csv = await response.text();
  const { date, value } = parseEcbCsvLastObservation(csv);
  if (value == null) {
    return null;
  }

  return {
    ratePercent: value,
    effectiveDate: date,
    ...meta,
  };
}

export async function fetchEcbCashRates(
  fetchImpl: typeof fetch = fetch,
): Promise<CashProviderFetchResult> {
  const errors: string[] = [];
  let overnight: CashRatePoint | null = null;
  let policy: CashRatePoint | null = null;

  try {
    overnight = await fetchEcbSeries(
      ESTR_SERIES,
      {
        sourceName: "European Central Bank",
        sourceUrl: "https://data.ecb.europa.eu/data/datasets/EST",
        seriesId: "EST.B.EU000A2X2A25.WT",
      },
      fetchImpl,
    );
  } catch (error) {
    errors.push(
      error instanceof Error ? error.message : "ECB €STR fetch failed",
    );
  }

  try {
    policy = await fetchEcbSeries(
      DFR_SERIES,
      {
        sourceName: "European Central Bank",
        sourceUrl:
          "https://data.ecb.europa.eu/data/datasets/FM/FM.D.U2.EUR.4F.KR.DFR.LEV",
        seriesId: "FM.D.U2.EUR.4F.KR.DFR.LEV",
      },
      fetchImpl,
    );
  } catch (error) {
    errors.push(
      error instanceof Error
        ? error.message
        : "ECB Deposit Facility fetch failed",
    );
  }

  return { overnight, policy, errors };
}
