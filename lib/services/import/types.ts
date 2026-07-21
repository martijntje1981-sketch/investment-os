/**
 * Import pipeline types — shared by screenshot, spreadsheet, and future broker feeds.
 */

import type { ListingConfirmationSource } from "@/lib/services/instruments/listingConfirmationSource";
import type { ResolvedInstrument } from "@/lib/types/instrument";
import type { ExtractionFieldConfidence } from "@/lib/services/extraction/types";

export type ImportSource = "screenshot" | "spreadsheet" | "broker";

/** How much user attention a row needs before save. */
export type ImportReviewTier = "auto" | "review" | "blocked";

export type ImportRow = {
  id: string;
  symbol: string;
  name: string;
  quantity: number;
  purchasePrice: number;
  currentPrice: number;
  purchaseDate?: string | null;
  assetType: "investment" | "cash";
  currency?: string;
  /** OCR / extraction confidence (0–1). */
  extractionConfidence?: number;
  extractionFieldConfidence?: ExtractionFieldConfidence;
  extractionWarnings?: string[];
  isin?: string | null;
  exchange?: string | null;
  providerSymbol?: string | null;
  instrumentName?: string | null;
  matchMethod?: ResolvedInstrument["matchMethod"];
  confirmationSource?: ListingConfirmationSource;
  matchConfidence?: number;
  requiresConfirmation?: boolean;
  matchWarnings?: string[];
  candidates?: ResolvedInstrument[];
  /** Set when the user explicitly confirms or picks an alternative. */
  userConfirmed?: boolean;
  /** Derived review tier after matching + policy. */
  reviewTier?: ImportReviewTier;
  /** Human-readable reason when review is required. */
  reviewReason?: string | null;
  /** True when a saved user mapping was applied. */
  fromSavedMapping?: boolean;
};

export type ImportSession = {
  source: ImportSource;
  broker: string | null;
  rows: ImportRow[];
  createdAt: string;
};

export type ImportReviewPlan = {
  total: number;
  autoCount: number;
  reviewCount: number;
  blockedCount: number;
  cashCount: number;
  autoRows: ImportRow[];
  reviewRows: ImportRow[];
  blockedRows: ImportRow[];
  readyToImport: boolean;
};

export type ScreenshotRecognizedHolding = {
  name: string;
  ticker: string;
  quantity: number;
  purchasePrice?: number | null;
  currentPrice?: number | null;
  marketValue?: number | null;
  /** @deprecated Use currentPrice */
  price?: number | null;
  /** @deprecated Use marketValue */
  value?: number | null;
  purchaseDate?: string | null;
  currency?: string;
  confidence?: number;
  extractionConfidence?: number;
  fieldConfidence?: ExtractionFieldConfidence;
  extractionFieldConfidence?: ExtractionFieldConfidence;
  isin?: string | null;
  exchange?: string | null;
  assetType?: "investment" | "cash";
  warnings?: string[];
  normalizationNotes?: string[];
  providerSymbol?: string | null;
  instrumentName?: string | null;
  matchMethod?: ResolvedInstrument["matchMethod"];
  matchConfidence?: number;
  requiresConfirmation?: boolean;
  matchWarnings?: string[];
  candidates?: ResolvedInstrument[];
};

export type AnalyzePortfolioResponse = {
  success: boolean;
  broker?: string;
  holdings?: ScreenshotRecognizedHolding[];
  message?: string;
};
