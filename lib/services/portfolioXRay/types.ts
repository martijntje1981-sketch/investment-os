/**
 * Phase 3B — Portfolio X-Ray / look-through types.
 * Pure contracts. No invented constituents.
 *
 * Compatible with Phase 3A AttributionLevel "future_underlying".
 */

export type LookThroughInstrumentKind =
  | "direct_equity"
  | "equity_etf_or_fund"
  | "thematic_etf"
  | "bitcoin_etp"
  | "digital_asset"
  | "commodity_etc"
  | "gold_etc"
  | "income_etp"
  | "cash"
  | "structured_or_other"
  | "unknown";

/**
 * How an instrument participates in look-through.
 * economic_sleeve = keep whole-instrument exposure (do not invent constituents).
 */
export type LookThroughParticipation =
  | "expand_when_constituents_available"
  | "economic_sleeve"
  | "direct_underlying"
  | "excluded";

export type LookThroughEligibility = {
  kind: LookThroughInstrumentKind;
  participation: LookThroughParticipation;
  reason: string;
};

export type LookThroughDataQuality =
  | "full"
  | "partial"
  | "unavailable"
  | "not_applicable"
  | "provider_not_connected";

export type FundConstituent = {
  /** Prefer ISIN when present — never fuzzy-match alone. */
  isin: string | null;
  symbol: string | null;
  name: string;
  weightPercent: number;
  sector: string | null;
  country: string | null;
  currency: string | null;
};

export type FundLookThrough = {
  instrumentId: string;
  instrumentSymbol: string;
  instrumentName: string;
  providerSymbol: string | null;
  asOfDate: string | null;
  dataQuality: LookThroughDataQuality;
  coveragePercent: number | null;
  holdingsCount: number | null;
  constituents: FundConstituent[];
  unavailableReason: string | null;
};

export type LookThroughExposureRow = {
  /** Stable key: ISIN preferred, else normalized symbol, else name. */
  key: string;
  isin: string | null;
  symbol: string | null;
  name: string;
  directWeightPercent: number;
  indirectWeightPercent: number;
  combinedWeightPercent: number;
  sourceHoldingCount: number;
  sourceHoldingSymbols: string[];
  sector: string | null;
  country: string | null;
};

export type LookThroughSectorRow = {
  sector: string;
  weightPercent: number;
};

export type LookThroughCountryRow = {
  country: string;
  weightPercent: number;
};

export type LookThroughOverlapRow = {
  key: string;
  name: string;
  symbol: string | null;
  combinedWeightPercent: number;
  directWeightPercent: number;
  indirectWeightPercent: number;
  sourceHoldingCount: number;
  sourceHoldingSymbols: string[];
};

export type LookThroughConclusionKind =
  | "top_hidden_exposure"
  | "multi_holding_overlap"
  | "coverage"
  | "provider_unavailable"
  | "intentional_sleeves";

export type LookThroughConclusion = {
  id: string;
  kind: LookThroughConclusionKind;
  text: string;
};

export type PortfolioLookThroughCoverage = {
  portfolioValueEur: number | null;
  lookThroughEligibleValuePercent: number | null;
  expandedValuePercent: number | null;
  economicSleeveValuePercent: number | null;
  unavailableValuePercent: number | null;
  excludedValuePercent: number | null;
  includedHoldingCount: number;
  economicSleeveHoldingCount: number;
  unavailableHoldingCount: number;
  excludedHoldingCount: number;
  warnings: string[];
};

export type PortfolioLookThrough = {
  version: "xray-v1";
  asOf: string;
  status: LookThroughDataQuality;
  view: "look_through";
  /** Instrument view remains separate — never mix into these totals. */
  instrumentViewNote: string;
  fundLookThroughs: FundLookThrough[];
  topExposures: LookThroughExposureRow[];
  overlaps: LookThroughOverlapRow[];
  sectors: LookThroughSectorRow[];
  countries: LookThroughCountryRow[];
  /** Currency look-through omitted until economic currency data is reliable. */
  currencies: [];
  conclusions: LookThroughConclusion[];
  coverage: PortfolioLookThroughCoverage;
  providerStatus: {
    connected: boolean;
    id: string;
    detail: string;
  };
};
