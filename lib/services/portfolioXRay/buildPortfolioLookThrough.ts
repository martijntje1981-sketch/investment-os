/**
 * Portfolio look-through engine.
 *
 * LOOK-THROUGH VIEW only — when an ETF is expanded, the ETF instrument weight
 * is replaced by constituent weights (no double counting).
 *
 * Without connected constituent data, returns an honest unavailable / sleeve
 * coverage result. Never invents weights from ETF names.
 */

import { getHoldingMarketValue } from "@/lib/client/portfolioAnalysis";
import {
  XRAY_HIDDEN_DISPLAY_MIN_WEIGHT,
  XRAY_MAX_CONCLUSIONS,
  XRAY_OVERLAP_MIN_COMBINED_WEIGHT,
  XRAY_OVERLAP_MIN_HOLDINGS,
  XRAY_TOP_EXPOSURES_LIMIT,
} from "@/lib/services/portfolioXRay/materiality";
import {
  UnavailableLookThroughProvider,
  type LookThroughHoldingsProvider,
} from "@/lib/services/portfolioXRay/provider";
import { resolveLookThroughEligibility } from "@/lib/services/portfolioXRay/resolveLookThroughEligibility";
import type {
  FundLookThrough,
  LookThroughConclusion,
  LookThroughCountryRow,
  LookThroughExposureRow,
  LookThroughOverlapRow,
  LookThroughSectorRow,
  PortfolioLookThrough,
} from "@/lib/services/portfolioXRay/types";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

export type BuildPortfolioLookThroughInput = {
  holdings: StoredPortfolioHolding[];
  /**
   * Optional pre-fetched fund look-throughs keyed by holding id.
   * When omitted, uses provider (default: unavailable).
   */
  fundLookThroughByHoldingId?: Map<string, FundLookThrough> | null;
  provider?: LookThroughHoldingsProvider;
  now?: Date;
};

function exposureKey(input: {
  isin: string | null;
  symbol: string | null;
  name: string;
}): string {
  if (input.isin) return `isin:${input.isin.trim().toUpperCase()}`;
  if (input.symbol) return `sym:${input.symbol.trim().toUpperCase()}`;
  return `name:${input.name.trim().toUpperCase()}`;
}

function buildConclusions(input: {
  providerConnected: boolean;
  topExposures: LookThroughExposureRow[];
  overlaps: LookThroughOverlapRow[];
  coveragePercent: number | null;
  economicSleeveCount: number;
}): LookThroughConclusion[] {
  const conclusions: LookThroughConclusion[] = [];

  if (!input.providerConnected) {
    conclusions.push({
      id: "provider-unavailable",
      kind: "provider_unavailable",
      text: "Look-through is not available yet — ETF/fund constituent holdings are not connected.",
    });
  }

  const top = input.topExposures[0];
  if (
    input.providerConnected &&
    top &&
    top.indirectWeightPercent >= XRAY_HIDDEN_DISPLAY_MIN_WEIGHT
  ) {
    conclusions.push({
      id: "top-hidden",
      kind: "top_hidden_exposure",
      text: `Your largest hidden company exposure is ${top.name} at approximately ${top.combinedWeightPercent.toFixed(1)}%.`,
    });
  }

  const materialOverlaps = input.overlaps.filter(
    (row) =>
      row.sourceHoldingCount >= XRAY_OVERLAP_MIN_HOLDINGS &&
      row.combinedWeightPercent >= XRAY_OVERLAP_MIN_COMBINED_WEIGHT,
  );
  if (input.providerConnected && materialOverlaps.length > 0) {
    const first = materialOverlaps[0]!;
    conclusions.push({
      id: "overlap",
      kind: "multi_holding_overlap",
      text: `${first.sourceHoldingCount} holdings share material exposure to ${first.name} (about ${first.combinedWeightPercent.toFixed(1)}% combined).`,
    });
  }

  if (
    input.providerConnected &&
    input.coveragePercent != null &&
    input.coveragePercent < 95
  ) {
    conclusions.push({
      id: "coverage",
      kind: "coverage",
      text: `Look-through analysis covers ${Math.round(input.coveragePercent)}% of your portfolio.`,
    });
  }

  if (!input.providerConnected && input.economicSleeveCount > 0) {
    conclusions.push({
      id: "sleeves",
      kind: "intentional_sleeves",
      text: "Bitcoin ETPs, crypto, cash, and commodity products stay as economic sleeves — they are not expanded into fake equity constituents.",
    });
  }

  return conclusions.slice(0, XRAY_MAX_CONCLUSIONS);
}

/**
 * Build look-through / overlap view from holdings + optional constituent data.
 */
export function buildPortfolioLookThrough(
  input: BuildPortfolioLookThroughInput,
): PortfolioLookThrough {
  const provider = input.provider ?? new UnavailableLookThroughProvider();
  const providerStatus = provider.status();
  const now = input.now ?? new Date();

  const valued = input.holdings
    .map((holding) => {
      const value = getHoldingMarketValue(holding) ?? 0;
      return { holding, value };
    })
    .filter((row) => row.value > 0);

  const portfolioValueEur = valued.reduce((sum, row) => sum + row.value, 0);
  const weightOf = (value: number) =>
    portfolioValueEur > 0 ? (value / portfolioValueEur) * 100 : 0;

  const fundLookThroughs: FundLookThrough[] = [];
  const exposureMap = new Map<
    string,
    {
      isin: string | null;
      symbol: string | null;
      name: string;
      direct: number;
      indirect: number;
      sources: Set<string>;
      sector: string | null;
      country: string | null;
    }
  >();

  let eligibleValue = 0;
  let expandedValue = 0;
  let sleeveValue = 0;
  let unavailableValue = 0;
  let excludedValue = 0;
  let includedHoldingCount = 0;
  let economicSleeveHoldingCount = 0;
  let unavailableHoldingCount = 0;
  let excludedHoldingCount = 0;

  const sectorMap = new Map<string, number>();
  const countryMap = new Map<string, number>();

  for (const { holding, value } of valued) {
    const eligibility = resolveLookThroughEligibility(holding);
    const portfolioWeight = weightOf(value);

    if (eligibility.participation === "excluded") {
      excludedValue += value;
      excludedHoldingCount += 1;
      continue;
    }

    if (eligibility.participation === "economic_sleeve") {
      sleeveValue += value;
      economicSleeveHoldingCount += 1;
      // Economic sleeves are not expanded into fake equity names.
      continue;
    }

    if (eligibility.participation === "direct_underlying") {
      includedHoldingCount += 1;
      eligibleValue += value;
      expandedValue += value;
      const key = exposureKey({
        isin: holding.isin ?? null,
        symbol: holding.symbol,
        name: holding.name || holding.symbol,
      });
      const existing = exposureMap.get(key);
      if (!existing) {
        exposureMap.set(key, {
          isin: holding.isin ?? null,
          symbol: holding.symbol,
          name: holding.name || holding.symbol,
          direct: portfolioWeight,
          indirect: 0,
          sources: new Set([holding.symbol]),
          sector: null,
          country: null,
        });
      } else {
        existing.direct += portfolioWeight;
        existing.sources.add(holding.symbol);
      }
      continue;
    }

    // expand_when_constituents_available
    eligibleValue += value;
    includedHoldingCount += 1;

    const prefetched = input.fundLookThroughByHoldingId?.get(holding.id);
    const fund: FundLookThrough =
      prefetched ??
      ({
        instrumentId: holding.id,
        instrumentSymbol: holding.symbol,
        instrumentName: holding.name || holding.symbol,
        providerSymbol: holding.providerSymbol ?? null,
        asOfDate: null,
        dataQuality: "provider_not_connected",
        coveragePercent: null,
        holdingsCount: null,
        constituents: [],
        unavailableReason: providerStatus.connected
          ? "Constituent data missing for this holding."
          : "Look-through holdings provider is not connected.",
      } satisfies FundLookThrough);

    fundLookThroughs.push(fund);

    const usable =
      fund.constituents.length > 0 &&
      (fund.dataQuality === "full" || fund.dataQuality === "partial");

    if (!usable) {
      unavailableValue += value;
      unavailableHoldingCount += 1;
      continue;
    }

    // Expanded: do NOT also count the ETF instrument weight.
    expandedValue += value;
    for (const constituent of fund.constituents) {
      const indirect = (portfolioWeight * constituent.weightPercent) / 100;
      const key = exposureKey(constituent);
      const existing = exposureMap.get(key);
      if (!existing) {
        exposureMap.set(key, {
          isin: constituent.isin,
          symbol: constituent.symbol,
          name: constituent.name,
          direct: 0,
          indirect,
          sources: new Set([holding.symbol]),
          sector: constituent.sector,
          country: constituent.country,
        });
      } else {
        existing.indirect += indirect;
        existing.sources.add(holding.symbol);
        if (!existing.sector && constituent.sector) {
          existing.sector = constituent.sector;
        }
        if (!existing.country && constituent.country) {
          existing.country = constituent.country;
        }
      }

      if (constituent.sector) {
        sectorMap.set(
          constituent.sector,
          (sectorMap.get(constituent.sector) ?? 0) + indirect,
        );
      }
      if (constituent.country) {
        countryMap.set(
          constituent.country,
          (countryMap.get(constituent.country) ?? 0) + indirect,
        );
      }
    }
  }

  const topExposures: LookThroughExposureRow[] = [...exposureMap.values()]
    .map((row) => ({
      key: exposureKey(row),
      isin: row.isin,
      symbol: row.symbol,
      name: row.name,
      directWeightPercent: row.direct,
      indirectWeightPercent: row.indirect,
      combinedWeightPercent: row.direct + row.indirect,
      sourceHoldingCount: row.sources.size,
      sourceHoldingSymbols: [...row.sources].sort(),
      sector: row.sector,
      country: row.country,
    }))
    .filter(
      (row) => row.combinedWeightPercent >= XRAY_HIDDEN_DISPLAY_MIN_WEIGHT,
    )
    .sort((a, b) => b.combinedWeightPercent - a.combinedWeightPercent)
    .slice(0, XRAY_TOP_EXPOSURES_LIMIT);

  const overlaps: LookThroughOverlapRow[] = topExposures
    .filter(
      (row) =>
        row.sourceHoldingCount >= XRAY_OVERLAP_MIN_HOLDINGS &&
        row.combinedWeightPercent >= XRAY_OVERLAP_MIN_COMBINED_WEIGHT,
    )
    .map((row) => ({
      key: row.key,
      name: row.name,
      symbol: row.symbol,
      combinedWeightPercent: row.combinedWeightPercent,
      directWeightPercent: row.directWeightPercent,
      indirectWeightPercent: row.indirectWeightPercent,
      sourceHoldingCount: row.sourceHoldingCount,
      sourceHoldingSymbols: row.sourceHoldingSymbols,
    }));

  const sectors: LookThroughSectorRow[] = [...sectorMap.entries()]
    .map(([sector, weightPercent]) => ({ sector, weightPercent }))
    .filter((row) => row.weightPercent >= XRAY_HIDDEN_DISPLAY_MIN_WEIGHT)
    .sort((a, b) => b.weightPercent - a.weightPercent);

  const countries: LookThroughCountryRow[] = [...countryMap.entries()]
    .map(([country, weightPercent]) => ({ country, weightPercent }))
    .filter((row) => row.weightPercent >= XRAY_HIDDEN_DISPLAY_MIN_WEIGHT)
    .sort((a, b) => b.weightPercent - a.weightPercent);

  const pct = (part: number) =>
    portfolioValueEur > 0 ? (part / portfolioValueEur) * 100 : null;

  const status = providerStatus.connected
    ? expandedValue > 0 && unavailableValue === 0
      ? "full"
      : expandedValue > 0
        ? "partial"
        : "unavailable"
    : "provider_not_connected";

  const conclusions = buildConclusions({
    providerConnected: providerStatus.connected,
    topExposures,
    overlaps,
    coveragePercent: pct(expandedValue),
    economicSleeveCount: economicSleeveHoldingCount,
  });

  return {
    version: "xray-v1",
    asOf: now.toISOString(),
    status,
    view: "look_through",
    instrumentViewNote:
      "Instrument view shows what you bought. Look-through view shows economic exposure underneath — never both in the same total.",
    fundLookThroughs,
    topExposures,
    overlaps,
    sectors,
    countries,
    currencies: [],
    conclusions,
    coverage: {
      portfolioValueEur: portfolioValueEur > 0 ? portfolioValueEur : null,
      lookThroughEligibleValuePercent: pct(eligibleValue),
      expandedValuePercent: pct(expandedValue),
      economicSleeveValuePercent: pct(sleeveValue),
      unavailableValuePercent: pct(unavailableValue),
      excludedValuePercent: pct(excludedValue),
      includedHoldingCount,
      economicSleeveHoldingCount,
      unavailableHoldingCount,
      excludedHoldingCount,
      warnings: [
        ...(providerStatus.connected
          ? []
          : [
              "ETF/fund constituent holdings are not connected — look-through exposures are unavailable.",
            ]),
        "Currency look-through is omitted until underlying currency data is reliable.",
        "Listing exchange or listing currency is not treated as economic exposure.",
      ],
    },
    providerStatus: {
      connected: providerStatus.connected,
      id: providerStatus.id,
      detail: providerStatus.detail,
    },
  };
}

/**
 * Async helper when a live provider is connected later.
 * Default provider still returns unavailable per instrument.
 */
export async function loadFundLookThroughMap(
  holdings: StoredPortfolioHolding[],
  provider: LookThroughHoldingsProvider = new UnavailableLookThroughProvider(),
): Promise<Map<string, FundLookThrough>> {
  const map = new Map<string, FundLookThrough>();
  for (const holding of holdings) {
    const eligibility = resolveLookThroughEligibility(holding);
    if (eligibility.participation !== "expand_when_constituents_available") {
      continue;
    }
    const fund = await provider.fetchFundLookThrough({
      instrumentId: holding.id,
      symbol: holding.symbol,
      name: holding.name || holding.symbol,
      providerSymbol: holding.providerSymbol ?? null,
      isin: holding.isin ?? null,
    });
    map.set(holding.id, fund);
  }
  return map;
}
