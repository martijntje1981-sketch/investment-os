import type {
  CashProviderFetchResult,
  CashRatePoint,
} from "@/lib/services/cashIntelligence/types";

const BOE_CSV_BASE =
  "https://www.bankofengland.co.uk/boeapps/database/_iadb-fromshowcolumns.asp";

function formatBoeDate(date: Date): string {
  const day = String(date.getUTCDate()).padStart(2, "0");
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const month = months[date.getUTCMonth()]!;
  const year = date.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

function parseBoeTabularCsv(
  csv: string,
  seriesCode: string,
): { date: string | null; value: number | null } {
  const lines = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return { date: null, value: null };
  }

  const header = lines[0]!.split(",");
  const seriesIndex = header.findIndex((col) =>
    col.replace(/"/g, "").includes(seriesCode),
  );
  if (seriesIndex < 0) {
    return { date: null, value: null };
  }

  for (let i = lines.length - 1; i >= 1; i -= 1) {
    const cols = lines[i]!.split(",");
    const rawDate = cols[0]?.replace(/"/g, "").trim() ?? null;
    const rawValue = cols[seriesIndex]?.replace(/"/g, "").trim();
    if (!rawValue || rawValue === "n/a" || rawValue === "NA") continue;
    const value = Number(rawValue);
    if (Number.isFinite(value)) {
      return { date: rawDate, value };
    }
  }

  return { date: null, value: null };
}

async function fetchBoeSeries(
  seriesCode: string,
  meta: Pick<CashRatePoint, "sourceName" | "sourceUrl" | "seriesId">,
  fetchImpl: typeof fetch,
): Promise<CashRatePoint | null> {
  const from = new Date();
  from.setUTCFullYear(from.getUTCFullYear() - 1);

  const params = new URLSearchParams({
    "csv.x": "yes",
    Datefrom: formatBoeDate(from),
    Dateto: "now",
    SeriesCodes: seriesCode,
    UsingCodes: "Y",
    CSVF: "TN",
  });

  const response = await fetchImpl(`${BOE_CSV_BASE}?${params.toString()}`, {
    headers: { Accept: "text/csv" },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`BoE ${seriesCode} HTTP ${response.status}`);
  }

  const csv = await response.text();
  const { date, value } = parseBoeTabularCsv(csv, seriesCode);
  if (value == null) {
    return null;
  }

  return {
    ratePercent: value,
    effectiveDate: date,
    ...meta,
  };
}

export async function fetchBoeCashRates(
  fetchImpl: typeof fetch = fetch,
): Promise<CashProviderFetchResult> {
  const errors: string[] = [];
  let overnight: CashRatePoint | null = null;
  let policy: CashRatePoint | null = null;

  try {
    overnight = await fetchBoeSeries(
      "IUDSOIA",
      {
        sourceName: "Bank of England",
        sourceUrl: "https://www.bankofengland.co.uk/boeapps/database/",
        seriesId: "IUDSOIA",
      },
      fetchImpl,
    );
  } catch (error) {
    errors.push(
      error instanceof Error ? error.message : "BoE SONIA fetch failed",
    );
  }

  try {
    policy = await fetchBoeSeries(
      "IUDBEDR",
      {
        sourceName: "Bank of England",
        sourceUrl:
          "https://www.bankofengland.co.uk/boeapps/database/Bank-Rate.asp",
        seriesId: "IUDBEDR",
      },
      fetchImpl,
    );
  } catch (error) {
    errors.push(
      error instanceof Error ? error.message : "BoE Bank Rate fetch failed",
    );
  }

  return { overnight, policy, errors };
}
