/**
 * Client-side Match Engine API wrapper for the import pipeline.
 */

import {
  applyMatchResultToImportRow,
  importRowToMatchInput,
} from "@/lib/services/import/finalizeImport";
import { annotateImportRow } from "@/lib/services/import/confidencePolicy";
import { mapScreenshotHoldingsToImportRows } from "@/lib/services/import/screenshotMapper";
import type { AnalyzePortfolioResponse, ImportRow } from "@/lib/services/import/types";
import type { ResolvedInstrument } from "@/lib/types/instrument";

type MatchApiResult = {
  input: ReturnType<typeof importRowToMatchInput>;
  resolved: ResolvedInstrument;
};

type MatchApiResponse = {
  success: boolean;
  results?: MatchApiResult[];
  message?: string;
};

function rowNeedsRemoteMatch(row: ImportRow): boolean {
  if (row.assetType === "cash") return false;
  if (row.fromSavedMapping) return false;
  if (
    row.providerSymbol &&
    row.matchMethod &&
    row.matchMethod !== "unresolved"
  ) {
    return false;
  }
  return true;
}

export async function matchImportRowsViaApi(rows: ImportRow[]): Promise<ImportRow[]> {
  const targets = rows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => rowNeedsRemoteMatch(row));

  if (targets.length === 0) {
    return rows.map(annotateImportRow);
  }

  const response = await fetch("/api/instruments/match", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      holdings: targets.map(({ row }) => importRowToMatchInput(row)),
    }),
  });

  const data = (await response.json()) as MatchApiResponse;
  if (!response.ok || !data.success || !data.results) {
    throw new Error(data.message ?? "Instrument matching failed.");
  }

  const next = [...rows];
  targets.forEach(({ index }, resultIndex) => {
    const result = data.results?.[resultIndex];
    if (!result) return;
    next[index] = applyMatchResultToImportRow(rows[index], result.resolved);
  });

  return next.map(annotateImportRow);
}

export async function matchSingleImportRow(row: ImportRow): Promise<ImportRow> {
  if (row.assetType === "cash") return annotateImportRow(row);

  const response = await fetch("/api/instruments/match", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ holdings: [importRowToMatchInput(row)] }),
  });

  const data = (await response.json()) as MatchApiResponse;
  if (!response.ok || !data.success || !data.results?.[0]) {
    throw new Error(data.message ?? "Instrument matching failed.");
  }

  return annotateImportRow(
    applyMatchResultToImportRow(row, data.results[0].resolved),
  );
}

export async function analyzePortfolioScreenshot(file: File): Promise<{
  broker: string;
  rows: ImportRow[];
}> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/analyze-portfolio", {
    method: "POST",
    body: formData,
  });

  const data = (await response.json()) as AnalyzePortfolioResponse;
  if (!response.ok || !data.success) {
    throw new Error(data.message ?? "The screenshot could not be analysed.");
  }

  const rows = mapScreenshotHoldingsToImportRows(data.holdings ?? []);
  if (!rows.length) {
    throw new Error("No holdings were recognised. Try a clearer screenshot.");
  }

  return {
    broker: data.broker ?? "Unknown broker",
    rows,
  };
}

export async function runImportPipeline(input: {
  source: "screenshot" | "spreadsheet" | "broker";
  file: File;
  userSub: string | null;
  parseSpreadsheet: (buffer: ArrayBuffer) => ImportRow[];
  applySavedMappings: (rows: ImportRow[]) => ImportRow[];
}): Promise<{ broker: string | null; rows: ImportRow[] }> {
  if (input.source === "broker") {
    throw new Error("Broker connections are not available yet.");
  }

  if (input.source === "screenshot") {
    const result = await analyzePortfolioScreenshot(input.file);
    const withMemory = input.applySavedMappings(result.rows);
    const matched = await matchImportRowsViaApi(withMemory);
    return { broker: result.broker, rows: matched };
  }

  const parsed = input.parseSpreadsheet(await input.file.arrayBuffer());
  if (!parsed.length) {
    throw new Error("No valid holdings were found. Check the column headings and values.");
  }

  const withMemory = input.applySavedMappings(parsed);
  const matched = await matchImportRowsViaApi(withMemory);
  return { broker: null, rows: matched };
}
