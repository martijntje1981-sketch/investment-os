/**
 * Phase 11B — portfolio-first holding intelligence candidates.
 *
 * Evaluates every eligible holding before ranking.
 * News volume never determines rank. Missing news is an explanation
 * state, not a reason to skip a material holding.
 *
 * Pure derivation — no EODHD, OpenAI, scheduled jobs, or storage.
 */

import type { NewsContentItem } from "@/lib/types/newsContent";
import type { ExposureGroupId } from "@/lib/services/classification/types";

export type HoldingExplanationStatus =
  | "supported"
  | "probable_contextual"
  | "insufficient_evidence"
  | "unavailable";

/**
 * How news/context is associated with the holding.
 * `component` is reserved for future ETF look-through and is never
 * assigned in Phase 11B (constituents are not connected).
 */
export type HoldingNewsMatchType =
  | "direct_instrument"
  | "instrument_alias"
  | "sector_theme"
  | "component"
  | "none";

export type HoldingIntelligenceCandidate = {
  holdingId: string;
  symbol: string;
  name: string;
  assetType: "investment" | "cash" | "crypto" | null;
  exposureGroupId: ExposureGroupId | null;
  isBitcoin: boolean;
  isCrypto: boolean;
  isEtfLike: boolean;
  changePercent: number | null;
  move: number | null;
  weightPercent: number | null;
  contributionPp: number | null;
  moveAvailable: boolean;
  valueAvailable: boolean;
  explanationStatus: HoldingExplanationStatus;
  matchType: HoldingNewsMatchType;
  /** Best single-article relevance — not article count. */
  relevanceScore: number | null;
  /** 0–1 from explanation status only — not news volume. */
  confidence: number;
  evidenceTimestamp: string | null;
  newsItem: NewsContentItem | null;
  /** Diagnostic only. Must never feed ranking. */
  newsItemCount: number;
  explanationNote: string;
};

export const HOLDING_EXPLANATION_NOTES: Record<
  HoldingExplanationStatus,
  string
> = {
  supported:
    "Relevant instrument-level context was found. This is not proof that the news caused the price move.",
  probable_contextual:
    "Related context was found, but it is not a confirmed explanation of the move.",
  insufficient_evidence: "No reliable explanation found.",
  unavailable:
    "No holding-matched news is available in the current feed.",
};

export const ETF_CONTEXTUAL_NOTE =
  "Thematic or sector context for this fund is not evidence that the news moved the ETF.";

export const BITCOIN_CRYPTO_CONTEXT_NOTE =
  "Broader crypto-market context, not a Bitcoin-specific catalyst.";

export const NEWS_HUB_NO_CATALYST =
  "No clear holding-specific catalyst found.";

export const CONFIDENCE_LABEL_BY_STATUS: Record<
  HoldingExplanationStatus,
  "High" | "Medium" | "Low" | null
> = {
  supported: "High",
  probable_contextual: "Medium",
  insufficient_evidence: "Low",
  unavailable: null,
};

export const CONFIDENCE_BY_STATUS: Record<HoldingExplanationStatus, number> = {
  supported: 0.85,
  probable_contextual: 0.55,
  insufficient_evidence: 0.25,
  unavailable: 0.1,
};
