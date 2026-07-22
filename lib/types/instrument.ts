/**
 * Shared instrument identifier types used across import flows,
 * the match engine, pricing, and future broker integrations.
 */

import type { ListingConfirmationSource } from "@/lib/services/instruments/listingConfirmationSource";

/** Raw identifiers supplied by OCR, CSV, manual entry, or broker feeds. */
export type InstrumentMatchInput = {
  /** Broker or product ticker — never inferred when missing. */
  ticker?: string | null;
  /** Primary identifier when available (12-character ISIN). */
  isin?: string | null;
  /** Exchange or MIC code as provided by the source. */
  exchange?: string | null;
  /** Human-readable instrument name from the source. */
  instrumentName?: string | null;
  assetType?: "investment" | "cash";
};

/** Canonical instrument fields returned by the Match Engine. */
export type ResolvedInstrument = {
  /** EODHD tradable symbol, e.g. "VWCE.XETRA". Null when unresolved. */
  providerSymbol: string | null;
  /** Canonical name from EODHD when matched. */
  instrumentName: string | null;
  /** Normalized EODHD exchange code. */
  exchange: string | null;
  /** ISIN from EODHD or the input when validated. */
  isin: string | null;
  /** How the instrument was matched. */
  matchMethod: "isin" | "ticker_exchange" | "name_exchange" | "unresolved";
  /** How the listing was confirmed when not from automatic provider match. */
  confirmationSource?: ListingConfirmationSource;
  /** Match confidence from 0 (none) to 1 (high). */
  confidence: number;
  /** True when the user must confirm before relying on this match. */
  requiresConfirmation: boolean;
  /** Human-readable warnings about ambiguity or missing data. */
  warnings: string[];
  /** EODHD exchange used for live quotes when the purchase venue differs. */
  pricingExchange?: string | null;
  /** Alternative listings when multiple matches exist. */
  candidates?: ResolvedInstrument[];
};

/** Fields persisted on a portfolio holding after instrument resolution. */
export type StoredInstrumentFields = {
  /** User-facing ticker (broker code). May be empty when only ISIN is known. */
  symbol: string;
  isin: string | null;
  exchange: string | null;
  providerSymbol: string | null;
  instrumentName: string | null;
  matchMethod?: ResolvedInstrument["matchMethod"];
  matchConfidence?: number;
  requiresConfirmation?: boolean;
  matchWarnings?: string[];
};

export type InstrumentMatchResult = {
  input: InstrumentMatchInput;
  resolved: ResolvedInstrument;
};
