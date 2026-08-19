import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  buildPortfolioExposureAllocation,
  buildBondsRatesView,
  classifyHoldingExposure,
} from "@/lib/services/classification";
import {
  buildWhyRatesMatterCopy,
  changeFromPrevious,
  displayRateValue,
  fetchOfficialRates,
  formatChangeBp,
  formatRatePercent,
  parseEcbCsvObservations,
  parseFiniteRate,
  parseNyFedEffrRows,
  previousAdjacentLevel,
  previousDistinctLevel,
  resetOfficialRatesCacheForTests,
  resolveFreshness,
  seedOfficialRatesCacheForTests,
  selectVisibleOfficialRates,
} from "@/lib/services/officialRates";
import type {
  OfficialRatesSnapshot,
  RateObservation,
} from "@/lib/services/officialRates";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function read(relativePath: string) {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

function holding(
  overrides: Partial<StoredPortfolioHolding> &
    Pick<StoredPortfolioHolding, "symbol">,
): StoredPortfolioHolding {
  return {
    id: `${overrides.symbol}-id`,
    name: overrides.symbol,
    quantity: 10,
    purchasePrice: 100,
    currentPrice: 100,
    currency: "EUR",
    assetType: "investment",
    ...overrides,
  };
}

const ECB_CSV = `KEY,TIME_PERIOD,OBS_VALUE
S,2024-06-11,3.75
S,2024-06-12,3.75
S,2025-06-11,2.50
S,2026-08-18,2.25
S,2026-08-19,2.25`;

function rate(overrides: Partial<RateObservation> & Pick<RateObservation, "id">): RateObservation {
  return {
    label: overrides.label ?? overrides.id,
    region: overrides.region ?? "euro_area",
    category: overrides.category ?? "policy_rate",
    value: overrides.value ?? 2.25,
    rangeLower: overrides.rangeLower ?? null,
    rangeUpper: overrides.rangeUpper ?? null,
    previousValue: overrides.previousValue ?? 2.5,
    previousRangeLower: overrides.previousRangeLower ?? null,
    previousRangeUpper: overrides.previousRangeUpper ?? null,
    changeBp: overrides.changeBp ?? -25,
    direction: overrides.direction ?? "down",
    observedAt: overrides.observedAt ?? "2026-08-19T00:00:00.000Z",
    effectiveAt: overrides.effectiveAt ?? "2026-08-19T00:00:00.000Z",
    source: overrides.source ?? "European Central Bank",
    sourceUrl: overrides.sourceUrl ?? "https://data.ecb.europa.eu",
    freshness: overrides.freshness ?? "current",
    freshnessLabel: overrides.freshnessLabel ?? "Current policy rate",
    confidence: overrides.confidence ?? "official",
    ...overrides,
  };
}

describe("official rates normalization", () => {
  it("normalizes ECB policy-rate observations and previous distinct change", () => {
    const points = parseEcbCsvObservations(ECB_CSV);
    const { current, previous, currentSince } = previousDistinctLevel(points);
    expect(current?.value).toBe(2.25);
    expect(current?.date).toBe("2026-08-19");
    expect(currentSince?.date).toBe("2026-08-18");
    expect(previous?.value).toBe(2.5);
    expect(changeFromPrevious(current?.value ?? null, previous?.value ?? null)).toEqual({
      changeBp: -25,
      direction: "down",
    });
  });

  it("does not treat a same-level policy reprint as a policy change", () => {
    const points = parseEcbCsvObservations(ECB_CSV).slice(-2);
    const { current, previous } = previousDistinctLevel(points);
    expect(current?.value).toBe(2.25);
    expect(previous).toBeNull();
    expect(changeFromPrevious(current?.value ?? null, previous?.value ?? null)).toEqual({
      changeBp: null,
      direction: "unknown",
    });
  });

  it("normalizes an unchanged rate against the previous observation", () => {
    const points = parseEcbCsvObservations(ECB_CSV).slice(-2);
    const { current, previous } = previousAdjacentLevel(points);
    expect(changeFromPrevious(current?.value ?? null, previous?.value ?? null)).toEqual({
      changeBp: 0,
      direction: "unchanged",
    });
    expect(formatChangeBp(0)).toBe("unchanged");
  });

  it("normalizes Fed target range and overnight EFFR from NY Fed rows", () => {
    const parsed = parseNyFedEffrRows([
      {
        type: "EFFR",
        percentRate: 3.63,
        effectiveDate: "2026-08-18",
        targetRateFrom: 3.5,
        targetRateTo: 3.75,
      },
      {
        type: "EFFR",
        percentRate: 3.64,
        effectiveDate: "2026-08-17",
        targetRateFrom: 3.75,
        targetRateTo: 4.0,
      },
    ]);
    expect(parsed.effr.map((row) => row.value)).toEqual([3.64, 3.63]);
    expect(parsed.target[0]).toMatchObject({ lower: 3.75, upper: 4 });
    expect(parsed.target[1]).toMatchObject({ lower: 3.5, upper: 3.75 });
    const change = changeFromPrevious(3.625, 3.875);
    expect(change.direction).toBe("down");
    expect(change.changeBp).toBe(-25);
  });

  it("never turns a missing rate into 0%", () => {
    expect(parseFiniteRate(null)).toBeNull();
    expect(parseFiniteRate(undefined)).toBeNull();
    expect(parseFiniteRate("")).toBeNull();
    expect(displayRateValue(rate({ id: "missing", value: null, rangeLower: null, rangeUpper: null }))).toBeNull();
    expect(formatChangeBp(null)).toBeNull();
    expect(formatRatePercent(2.25)).toBe("2.25%");
    expect(formatRatePercent(2.188)).toBe("2.188%");
  });

  it("labels stale overnight observations without hiding policy rates", () => {
    const stale = resolveFreshness({
      category: "overnight_rate",
      observedAt: "2026-07-01T00:00:00.000Z",
      now: Date.parse("2026-08-19T12:00:00.000Z"),
    });
    expect(stale.freshness).toBe("stale");
    expect(stale.freshnessLabel).toMatch(/Last observation/i);

    const policy = resolveFreshness({
      category: "policy_rate",
      observedAt: "2026-06-17T00:00:00.000Z",
      now: Date.parse("2026-08-19T12:00:00.000Z"),
    });
    expect(policy.freshness).toBe("current");
    expect(policy.freshnessLabel).toBe("Current policy rate");
  });
});

describe("official rates fetch cache and fallback", () => {
  it("keeps the last successful snapshot when the provider fails", async () => {
    resetOfficialRatesCacheForTests();
    seedOfficialRatesCacheForTests(
      {
        fetchedAt: "2026-08-19T08:00:00.000Z",
        cacheExpiresAt: "2026-08-19T16:00:00.000Z",
        isStale: false,
        groups: [
          {
            id: "euro_area",
            label: "Euro area",
            rates: [rate({ id: "ecb_dfr", label: "ECB Deposit Rate" })],
          },
        ],
        providerErrors: [],
      },
      Date.parse("2026-08-19T08:00:00.000Z"),
    );

    const snapshot = await fetchOfficialRates({
      forceRefresh: true,
      now: Date.parse("2026-08-19T12:00:00.000Z"),
      fetchImpl: async () => {
        throw new Error("upstream unavailable");
      },
    });

    expect(snapshot.isStale).toBe(true);
    expect(snapshot.groups[0]?.rates[0]?.value).toBe(2.25);
    expect(snapshot.groups[0]?.rates[0]?.value).not.toBe(0);
    resetOfficialRatesCacheForTests();
  });

  it("does not hide policy rates behind market-hours logic", () => {
    const fetchSource = read("lib/services/officialRates/fetchOfficialRates.ts");
    const nyFed = read("lib/services/officialRates/providers/nyFedOfficialRates.ts");
    const ecb = read("lib/services/officialRates/providers/ecbOfficialRates.ts");
    for (const source of [fetchSource, nyFed, ecb]) {
      expect(source).not.toMatch(/market (?:is )?closed|trading hours|session open/i);
      expect(source).not.toMatch(/openai/i);
      expect(source).not.toMatch(/setInterval\s*\(/);
    }
  });
});

describe("Bonds & Rates personal rate context", () => {
  const euna = holding({
    symbol: "EUNA",
    name: "iShares Core Global Aggregate Bond UCITS ETF EUR Hedged (Acc)",
    quantity: 2,
    purchasePrice: 10,
    currentPrice: 10,
  });
  const equity = holding({
    symbol: "VWCE",
    providerSymbol: "VWCE.XETRA",
    quantity: 40,
  });

  const snapshot: OfficialRatesSnapshot = {
    fetchedAt: "2026-08-19T12:00:00.000Z",
    cacheExpiresAt: "2026-08-19T20:00:00.000Z",
    isStale: false,
    groups: [
      {
        id: "euro_area",
        label: "Euro area",
        rates: [
          rate({ id: "ecb_dfr", label: "ECB Deposit Rate", category: "policy_rate" }),
          rate({
            id: "ecb_estr",
            label: "€STR",
            category: "overnight_rate",
            value: 2.17,
            previousValue: 2.16,
            changeBp: 1,
            direction: "up",
          }),
        ],
      },
      {
        id: "united_states",
        label: "United States",
        rates: [
          rate({
            id: "fed_funds_target",
            label: "Fed Funds Target",
            region: "united_states",
            category: "policy_rate",
            value: 3.625,
            rangeLower: 3.5,
            rangeUpper: 3.75,
            previousValue: 3.875,
            changeBp: -25,
            direction: "down",
          }),
        ],
      },
    ],
    providerErrors: [],
  };

  it("gives EUNA relevant rate context without inventing duration sensitivity", () => {
    expect(classifyHoldingExposure(euna).fixedIncome?.type).toBe("mixed_aggregate");
    const view = buildBondsRatesView({
      allocation: buildPortfolioExposureAllocation([euna]),
      holdings: [euna],
      officialRates: snapshot,
      intelligenceDepth: "complete",
    });
    expect(view.hasFixedIncome).toBe(true);
    expect(view.rateGroups.flatMap((group) => group.rates).map((row) => row.id)).toEqual(
      expect.arrayContaining(["ecb_dfr", "ecb_estr", "fed_funds_target"]),
    );
    expect(view.whyRatesMatter).toMatch(/global aggregate bond ETF/i);
    expect(view.whyRatesMatter).toMatch(/EUR hedged/i);
    expect(view.whyRatesMatter).toMatch(/duration data is unavailable/i);
    expect(view.whyRatesMatter).not.toMatch(/price impact of|duration of \d|yield of \d/i);
    expect(view.showRateChanges).toBe(true);
  });

  it("does not attach fake bond intelligence to an equity-only portfolio", () => {
    const view = buildBondsRatesView({
      allocation: buildPortfolioExposureAllocation([equity]),
      holdings: [equity],
      officialRates: snapshot,
      intelligenceDepth: "complete",
    });
    expect(view.hasFixedIncome).toBe(false);
    expect(view.whyRatesMatter).toBeNull();
    expect(view.rateGroups.length).toBeGreaterThan(0);
  });

  it("keeps core policy rates on Free and fuller evidence on Complete", () => {
    const free = selectVisibleOfficialRates(
      snapshot.groups.flatMap((group) => group.rates),
      "free",
    );
    const complete = selectVisibleOfficialRates(
      snapshot.groups.flatMap((group) => group.rates),
      "complete",
    );
    expect(free.every((row) => row.category === "policy_rate")).toBe(true);
    expect(complete.some((row) => row.category === "overnight_rate")).toBe(true);
    expect(
      buildBondsRatesView({
        allocation: buildPortfolioExposureAllocation([euna]),
        holdings: [euna],
        officialRates: snapshot,
        intelligenceDepth: "free",
      }).whyRatesMatter,
    ).toBeNull();
    expect(
      buildBondsRatesView({
        allocation: buildPortfolioExposureAllocation([euna]),
        holdings: [euna],
        officialRates: snapshot,
        intelligenceDepth: "complete",
      }).whyRatesMatter,
    ).toMatch(/global aggregate bond ETF/i);
  });

  it("renders current-rate tiles with source dates and no OpenAI or polling", () => {
    const ui = read("components/analysis/BondsRatesSection.tsx");
    const board = read("components/analysis/OfficialRatesBoard.tsx");
    expect(ui).toContain("OfficialRatesBoard");
    expect(ui).toContain("Why this matters to your bonds");
    expect(ui).toContain("useOfficialRates");
    expect(ui).not.toContain("useCashIntelligence");
    expect(ui).not.toContain("/api/cash-intelligence");
    expect(board).toContain("Current rates");
    expect(board).toContain("min-h-11");
    expect(board).toContain("sm:grid-cols-2");
    expect(board).toContain("rate.source");
    expect(board).toContain("effective ${observed}");
    expect(board).not.toMatch(/3\.50–3\.75%|2\.25%/);
    expect(read("app/api/official-rates/route.ts")).not.toMatch(/openai|setInterval|node-cron/i);
    expect(read("lib/client/useOfficialRates.ts")).not.toMatch(/setInterval\s*\(/);
    expect(read("lib/services/officialRates/providers/nyFedOfficialRates.ts")).toContain(
      "effr/last/400.json",
    );
    expect(
      buildWhyRatesMatterCopy({
        hasFixedIncome: true,
        subtype: "mixed_aggregate",
        durationUnknown: true,
        currencyHedge: "EUR hedged",
        rates: snapshot.groups.flatMap((group) => group.rates),
      }),
    ).toMatch(/duration data is unavailable/i);
  });
});
