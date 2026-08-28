/**
 * Live EODHD listing-discovery coverage.
 *
 * Skipped unless RUN_LISTING_DISCOVERY_LIVE=1 and EODHD_API_KEY is set.
 * Read-only: matchInstrument only. Does not save holdings.
 * Unsets the Supabase service role so lookup cache is not written.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { matchInstrument } from "@/lib/services/instruments/instrumentMatchEngine";
import { lookupVerifiedByTickerExchange } from "@/lib/services/instruments/verifiedInstrumentRegistry";
import type { InstrumentMatchInput, ResolvedInstrument } from "@/lib/types/instrument";

function loadEnvLocal(): void {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key === "EODHD_API_KEY" && !process.env.EODHD_API_KEY) {
      process.env.EODHD_API_KEY = value;
    }
  }
}

loadEnvLocal();
delete process.env.SUPABASE_SERVICE_ROLE_KEY;

const LIVE = process.env.RUN_LISTING_DISCOVERY_LIVE === "1";

export type CoverageCase = {
  market: string;
  search: string;
  mode: "ticker" | "name" | "isin" | "ticker+isin";
  input: InstrumentMatchInput;
  notes?: string;
};

export const LISTING_DISCOVERY_COVERAGE_CASES: CoverageCase[] = [
  {
    market: "US NASDAQ",
    search: "MSFT",
    mode: "ticker",
    input: { ticker: "MSFT", assetType: "investment" },
  },
  {
    market: "US NYSE",
    search: "JNJ",
    mode: "ticker",
    input: { ticker: "JNJ", assetType: "investment" },
  },
  {
    market: "Netherlands / Euronext Amsterdam",
    search: "ASML",
    mode: "ticker",
    input: { ticker: "ASML", assetType: "investment" },
  },
  {
    market: "France / Euronext Paris",
    search: "AIR",
    mode: "ticker",
    input: { ticker: "AIR", assetType: "investment" },
  },
  {
    market: "Germany / Xetra",
    search: "SAP",
    mode: "ticker",
    input: { ticker: "SAP", assetType: "investment" },
  },
  {
    market: "United Kingdom / LSE",
    search: "HSBA",
    mode: "ticker",
    input: { ticker: "HSBA", assetType: "investment" },
  },
  {
    market: "Switzerland / SIX",
    search: "NESN",
    mode: "ticker",
    input: { ticker: "NESN", assetType: "investment" },
  },
  {
    market: "Italy / Borsa Italiana",
    search: "ENEL",
    mode: "ticker",
    input: { ticker: "ENEL", assetType: "investment" },
  },
  {
    market: "Nordics / Helsinki",
    search: "NOKIA",
    mode: "ticker",
    input: { ticker: "NOKIA", assetType: "investment" },
  },
  {
    market: "ETF / ETP (not owner book)",
    search: "CSPX",
    mode: "ticker",
    input: { ticker: "CSPX", assetType: "investment" },
  },
  {
    market: "Ticker collision",
    search: "SAN",
    mode: "ticker",
    input: { ticker: "SAN", assetType: "investment" },
    notes: "Santander vs Sanofi must not merge",
  },
  {
    market: "Multi-venue same ISIN",
    search: "NL0010273215",
    mode: "isin",
    input: { isin: "NL0010273215", assetType: "investment" },
    notes: "ASML venues",
  },
  {
    market: "Unknown-to-registry ticker",
    search: "ORSTED",
    mode: "ticker",
    input: { ticker: "ORSTED", assetType: "investment" },
  },
  {
    market: "ISIN-first (Nestle)",
    search: "CH0038863350",
    mode: "isin",
    input: { isin: "CH0038863350", assetType: "investment" },
  },
  {
    market: "ISIN-first (Airbus)",
    search: "NL0000235190",
    mode: "isin",
    input: { isin: "NL0000235190", assetType: "investment" },
  },
  {
    market: "Name (well-known)",
    search: "Microsoft Corporation",
    mode: "name",
    input: { instrumentName: "Microsoft Corporation", assetType: "investment" },
  },
  {
    market: "Name (less obvious)",
    search: "Orsted A/S",
    mode: "name",
    input: { instrumentName: "Orsted A/S", assetType: "investment" },
  },
  {
    market: "Ticker-only LSE",
    search: "ULVR",
    mode: "ticker",
    input: { ticker: "ULVR", assetType: "investment" },
  },
];

export function summarizeCoverageResult(resolved: ResolvedInstrument): {
  providerSymbol: string | null;
  venue: string | null;
  currency: string | null;
  isin: string | null;
  name: string | null;
  candidateCount: number;
  outcome: string;
} {
  const candidates = resolved.candidates ?? [];
  const candidateCount = candidates.length;
  let outcome = "FAIL — unresolved";
  if (resolved.providerSymbol && candidateCount <= 1) {
    outcome = "PASS — confident";
  } else if (!resolved.providerSymbol && candidateCount >= 1) {
    outcome = "PASS — correctly ambiguous";
  } else if (resolved.providerSymbol && candidateCount > 1) {
    outcome = "PASS — ISIN resolved";
  } else if (
    resolved.warnings.some((warning) =>
      /unavailable|quota|rate.?limit|402|429/i.test(warning),
    )
  ) {
    outcome = "PROVIDER LIMITATION";
  }

  return {
    providerSymbol: resolved.providerSymbol,
    venue: resolved.exchange ?? candidates[0]?.exchange ?? null,
    currency:
      resolved.quoteCurrency ?? candidates[0]?.quoteCurrency ?? null,
    isin: resolved.isin ?? candidates[0]?.isin ?? null,
    name: resolved.instrumentName ?? candidates[0]?.instrumentName ?? null,
    candidateCount,
    outcome,
  };
}

describe.skipIf(!LIVE || !process.env.EODHD_API_KEY)(
  "live listing discovery coverage (read-only)",
  () => {
    it("does not require registry entries for the audit instruments", () => {
      expect(lookupVerifiedByTickerExchange("MSFT", "US")).toBeNull();
      expect(lookupVerifiedByTickerExchange("NESN", "SW")).toBeNull();
      expect(lookupVerifiedByTickerExchange("ORSTED", "CO")).toBeNull();
      expect(lookupVerifiedByTickerExchange("CSPX", "LSE")).toBeNull();
    });

    it(
      "runs the non-portfolio discovery matrix against EODHD",
      async () => {
        const matrix: Array<Record<string, unknown>> = [];
        const rows: string[] = [];
        rows.push(
          "Market | Search | Mode | Provider result | Tobailey result | Venue | Currency | ISIN | Outcome",
        );

        for (const testCase of LISTING_DISCOVERY_COVERAGE_CASES) {
          const resolved = await matchInstrument(testCase.input);
          const summary = summarizeCoverageResult(resolved);
          const providerPreview =
            resolved.candidates
              ?.map((row) => row.providerSymbol)
              .filter(Boolean)
              .slice(0, 6)
              .join(", ") ||
            resolved.providerSymbol ||
            "(none)";
          rows.push(
            [
              testCase.market,
              testCase.search,
              testCase.mode,
              providerPreview,
              summary.providerSymbol ?? `(${summary.candidateCount} candidates)`,
              summary.venue ?? "—",
              summary.currency ?? "—",
              summary.isin ?? "—",
              summary.outcome,
            ].join(" | "),
          );
          matrix.push({
            ...testCase,
            warnings: resolved.warnings,
            matchMethod: resolved.matchMethod,
            confirmationSource: resolved.confirmationSource ?? null,
            confidence: resolved.confidence,
            candidates: (resolved.candidates ?? []).map((row) => ({
              providerSymbol: row.providerSymbol,
              exchange: row.exchange,
              quoteCurrency: row.quoteCurrency ?? null,
              isin: row.isin,
              name: row.instrumentName,
            })),
            summary,
          });
        }

        const reportPath = path.resolve(
          process.cwd(),
          "listing-discovery-coverage-matrix.json",
        );
        writeFileSync(
          reportPath,
          JSON.stringify(
            { generatedAt: new Date().toISOString(), rows, matrix },
            null,
            2,
          ),
        );
        process.stdout.write(`\n${rows.join("\n")}\n`);
        expect(LISTING_DISCOVERY_COVERAGE_CASES.length).toBeGreaterThanOrEqual(12);
      },
      180_000,
    );
  },
);
