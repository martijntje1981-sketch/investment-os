/**
 * Hash-target Analysis detail catalog.
 * Primary /analysis stays glance-only; known hashes open one preserved engine.
 */

import {
  ANALYSIS_PATH,
  GOALS_PATH,
  HELP_CENTRE_PATH,
  ON_TRACK_HUB_PATH,
  PORTFOLIO_HISTORY_PATH,
  REVIEW_PATH,
  WHAT_HAPPENED_HUB_PATH,
  WHAT_MATTERS_HUB_PATH,
  WHATS_AHEAD_HUB_PATH,
} from "@/lib/navigation/appRoutes";
import { DASHBOARD_DEEP_LINKS, SECTION_IDS } from "@/lib/navigation/deepLinks";

export type AnalysisDetailId =
  | "portfolio-allocation"
  | "portfolio-exposure"
  | "portfolio-concentration"
  | "portfolio-xray"
  | "portfolio-performance"
  | "crypto-intelligence"
  | "bonds-rates"
  | "cash-intelligence"
  | "dividend-intelligence"
  | "scenario-stress"
  | "market-consensus"
  | "on-track";

export type AnalysisDetailDefinition = {
  id: AnalysisDetailId;
  title: string;
  hashes: readonly string[];
};

export const ANALYSIS_DETAIL_MODULES: readonly AnalysisDetailDefinition[] = [
  {
    id: "portfolio-allocation",
    title: "Allocation",
    hashes: [SECTION_IDS.portfolioAllocation],
  },
  {
    id: "portfolio-exposure",
    title: "Exposure",
    hashes: [SECTION_IDS.portfolioExposure, SECTION_IDS.whatMatters],
  },
  {
    id: "portfolio-concentration",
    title: "Concentration & diversification",
    hashes: ["portfolio-concentration"],
  },
  {
    id: "portfolio-xray",
    title: "Portfolio X-Ray",
    hashes: [SECTION_IDS.portfolioXray],
  },
  {
    id: "portfolio-performance",
    title: "Performance",
    hashes: [
      SECTION_IDS.portfolioPerformance,
      "performance-attribution",
      SECTION_IDS.whatHappened,
    ],
  },
  {
    id: "crypto-intelligence",
    title: "Crypto intelligence",
    hashes: ["crypto-intelligence"],
  },
  {
    id: "bonds-rates",
    title: "Bonds & Rates",
    hashes: [SECTION_IDS.bondsRates],
  },
  {
    id: "cash-intelligence",
    title: "Cash intelligence",
    hashes: [SECTION_IDS.cashIntelligence],
  },
  {
    id: "dividend-intelligence",
    title: "Dividend intelligence",
    hashes: [SECTION_IDS.dividendIntelligence],
  },
  {
    id: "scenario-stress",
    title: "Scenarios",
    hashes: [
      SECTION_IDS.scenarioStress,
      SECTION_IDS.resilienceSleep,
      SECTION_IDS.whatsAhead,
    ],
  },
  {
    id: "market-consensus",
    title: "Market consensus",
    hashes: [SECTION_IDS.marketConsensus],
  },
  {
    id: "on-track",
    title: "On track",
    hashes: [SECTION_IDS.onTrack],
  },
] as const;

const HASH_TO_DETAIL = new Map<string, AnalysisDetailId>();
for (const definition of ANALYSIS_DETAIL_MODULES) {
  for (const hash of definition.hashes) {
    HASH_TO_DETAIL.set(hash, definition.id);
  }
}

export function resolveAnalysisDetailId(
  hash: string | null | undefined,
): AnalysisDetailId | null {
  if (!hash) return null;
  return HASH_TO_DETAIL.get(hash) ?? null;
}

export function analysisDetailHref(id: AnalysisDetailId): string {
  const definition = ANALYSIS_DETAIL_MODULES.find((row) => row.id === id);
  const hash = definition?.hashes[0] ?? id;
  return `${ANALYSIS_PATH}#${hash}`;
}

export function analysisDetailTitle(id: AnalysisDetailId): string {
  return (
    ANALYSIS_DETAIL_MODULES.find((row) => row.id === id)?.title ?? "Analysis"
  );
}

/** Destinations used by Explore Analysis — existing routes or hash details. */
export const ANALYSIS_EXPLORE_DESTINATIONS = {
  allocation: analysisDetailHref("portfolio-allocation"),
  exposure: analysisDetailHref("portfolio-exposure"),
  concentration: analysisDetailHref("portfolio-concentration"),
  xray: analysisDetailHref("portfolio-xray"),
  performance: analysisDetailHref("portfolio-performance"),
  attribution: `${ANALYSIS_PATH}#performance-attribution`,
  history: PORTFOLIO_HISTORY_PATH,
  crypto: analysisDetailHref("crypto-intelligence"),
  bonds: analysisDetailHref("bonds-rates"),
  cash: analysisDetailHref("cash-intelligence"),
  dividends: analysisDetailHref("dividend-intelligence"),
  scenarios: analysisDetailHref("scenario-stress"),
  consensus: analysisDetailHref("market-consensus"),
  scorecard: DASHBOARD_DEEP_LINKS.scorecard,
  goals: GOALS_PATH,
  whatIf: DASHBOARD_DEEP_LINKS.whatIf,
  whatHappened: WHAT_HAPPENED_HUB_PATH,
  whatMatters: WHAT_MATTERS_HUB_PATH,
  onTrack: ON_TRACK_HUB_PATH,
  whatsAhead: WHATS_AHEAD_HUB_PATH,
  reports: REVIEW_PATH,
  methodology: HELP_CENTRE_PATH,
} as const;
