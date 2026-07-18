/**
 * Instrument services — public entry point.
 */

export {
  matchInstrument,
  matchInstruments,
} from "./instrumentMatchEngine";

export { applyResolvedToHolding } from "./applyResolved";

export {
  buildProviderSymbol,
  fetchIdMapping,
  fetchSearch,
  getEodhdApiKey,
} from "./eodhdClient";

export { exchangesMatch, normalizeExchange } from "./exchangeNormalizer";
export { isValidIsin, normalizeIsin, splitIsinFromTicker } from "./validation";

export type {
  InstrumentMatchInput,
  InstrumentMatchResult,
  ResolvedInstrument,
  StoredInstrumentFields,
} from "@/lib/types/instrument";

export type { EodhdIdMappingRow, EodhdSearchRow } from "./eodhdClient";
