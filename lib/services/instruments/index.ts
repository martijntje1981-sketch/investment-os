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

export {
  exchangesMatch,
  exchangeResolutionMessage,
  isKnownProviderExchange,
  isRecognizedExchange,
  normalizeExchange,
  normalizeProviderExchangeCode,
  providerExchangesMatch,
  resolveExchangeForMatching,
} from "./exchangeNormalizer";
export {
  EXCHANGE_REGISTRY,
  formatRegistryExchangeLabel,
  getExchangeRegistryEntry,
  isProviderPricingExchange,
  isValidPurchaseVenue,
  listUserSelectableExchanges,
  normalizePurchaseExchangeCode,
  resolveProviderPricingExchange,
  type ExchangeMarketGroup,
  type ExchangeRegistryEntry,
} from "./exchangeRegistry";
export {
  findExchangeOption,
  formatExchangeInputValue,
  resolveExchangeInput,
  searchExchanges,
  type ExchangeOption,
} from "./exchangeSearch";
export { isValidIsin, normalizeIsin, splitIsinFromTicker } from "./validation";

export type {
  InstrumentMatchInput,
  InstrumentMatchResult,
  ResolvedInstrument,
  StoredInstrumentFields,
} from "@/lib/types/instrument";

export {
  applySelectedListing,
  buildListingCandidates,
  draftToImportRow,
  formatListingDetails,
  formatListingLine,
  holdingToMatchInput,
  importRowToStoredHolding,
  investmentNeedsListingConfirmation,
} from "./listingConfirmation";
export type { ListingCandidateSource, ListingDisplay } from "./listingConfirmation";
export {
  looksLikeProviderSymbolInput,
  parseProviderSymbolInput,
} from "./providerSymbolInput";
export type { ParsedProviderSymbol } from "./providerSymbolInput";
