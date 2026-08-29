/**
 * End-to-end extraction pipeline: normalize → post-process.
 */

import { normalizePortfolioExtraction } from "@/lib/services/extraction/normalizeExtracted";
import {
  normalizeBrokerName,
  postProcessExtractedHoldings,
} from "@/lib/services/extraction/postProcessHoldings";
import type {
  NormalizedPortfolioExtraction,
  RawPortfolioExtraction,
} from "@/lib/services/extraction/types";

export function processRawPortfolioExtraction(
  raw: RawPortfolioExtraction,
): NormalizedPortfolioExtraction {
  const normalized = normalizePortfolioExtraction(raw);
  return {
    broker: normalizeBrokerName(normalized.broker),
    holdings: postProcessExtractedHoldings(normalized.holdings),
  };
}

export * from "@/lib/services/extraction/types";
export * from "@/lib/services/extraction/parseLocaleNumber";
export * from "@/lib/services/extraction/repairIdentifiers";
export * from "@/lib/services/extraction/normalizeExtracted";
export * from "@/lib/services/extraction/postProcessHoldings";
export * from "@/lib/services/extraction/fieldConfidence";
export * from "@/lib/services/extraction/extractPrompt";
