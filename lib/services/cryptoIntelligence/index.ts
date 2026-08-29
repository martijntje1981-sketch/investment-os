export {
  buildCryptoIntelligenceProfile,
  selectDashboardCryptoConclusion,
  type CryptoIntelligenceConclusion,
  type CryptoIntelligenceProfile,
  type CryptoPeriodHistoryOptions,
  type CryptoPortfolioShape,
  type CryptoPulseBand,
  type CryptoPulsePeriod,
} from "@/lib/services/cryptoIntelligence/buildCryptoIntelligenceProfile";

export {
  buildCryptoMarketContext,
  cryptoMajorsFromMarketPulse,
  type BuildCryptoMarketContextInput,
  type CryptoAssetDirection,
  type CryptoBreadthLabel,
  type CryptoLeadershipKind,
  type CryptoMajorQuoteInput,
  type CryptoMarketContext,
  type CryptoMarketRegime,
  type CryptoMoveMagnitude,
  type CryptoPeriodReturnInput,
  type OptionalCryptoSignal,
} from "@/lib/services/cryptoIntelligence/buildCryptoMarketContext";

export {
  buildCoinIntelligence,
  buildOwnedCoinIntelligence,
  cryptoBenchmarksFromMajors,
  selectCoinsThatMatterToday,
  selectDashboardCoinConclusion,
  type BuildCoinIntelligenceInput,
  type BuildOwnedCoinIntelligenceInput,
  type CoinHoldingNews,
  type CoinIntelligence,
  type CoinNewsMatchBasis,
  type CoinNewsMatchConfidence,
  type CoinPeriodHistoryByHoldingId,
  type CoinPeriodReturn,
  type CoinRelativeVerdict,
  type CryptoBenchmarkMoves,
} from "@/lib/services/cryptoIntelligence/buildCoinIntelligence";

export {
  scoreCoinNewsAboutness,
  watchLabelForConfidence,
} from "@/lib/services/cryptoIntelligence/scoreCoinNewsAboutness";

export {
  personalizeCryptoMarketIntelligence,
  type PersonalizedCryptoIntelligence,
} from "@/lib/services/cryptoIntelligence/personalizeCryptoMarketIntelligence";

export {
  selectCryptoNewsMatters,
  type CryptoNewsMatter,
} from "@/lib/services/cryptoIntelligence/selectCryptoNewsMatters";
