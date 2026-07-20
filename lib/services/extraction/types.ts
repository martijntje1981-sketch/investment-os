/**
 * Screenshot extraction types — structured output before the Match Engine.
 */

export type ExtractionAssetType = "investment" | "cash" | "crypto";

/** Per-field OCR confidence from the vision model (0–1). */
export type ExtractionFieldConfidence = {
  name: number;
  isin: number;
  ticker: number;
  exchange: number;
  quantity: number;
  purchasePrice: number;
  currentPrice: number;
  marketValue: number;
  purchaseDate: number;
  currency: number;
};

/** Raw holding returned by the vision model before normalization. */
export type RawExtractedHolding = {
  name: string;
  ticker: string;
  isin: string | null;
  exchange: string | null;
  assetType: ExtractionAssetType;
  quantity: number | string;
  purchasePrice: number | string | null;
  currentPrice: number | string | null;
  marketValue: number | string | null;
  purchaseDate: string | null;
  currency: string;
  fieldConfidence: ExtractionFieldConfidence;
  warnings: string[];
};

export type RawPortfolioExtraction = {
  broker: string;
  holdings: RawExtractedHolding[];
};

/** Normalized holding ready for Match Engine input. */
export type NormalizedExtractedHolding = {
  name: string;
  ticker: string;
  isin: string | null;
  exchange: string | null;
  assetType: "investment" | "cash";
  quantity: number;
  purchasePrice: number | null;
  currentPrice: number | null;
  marketValue: number | null;
  purchaseDate: string | null;
  currency: string;
  fieldConfidence: ExtractionFieldConfidence;
  extractionConfidence: number;
  warnings: string[];
  normalizationNotes: string[];
};

export type NormalizedPortfolioExtraction = {
  broker: string;
  holdings: NormalizedExtractedHolding[];
};
