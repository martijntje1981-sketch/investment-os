export {
  classifyHoldingExposure,
  resolveGroupFromVerifiedExposureText,
  type ExposureClassificationHolding,
} from "@/lib/services/classification/classifyHoldingExposure";
export {
  classifyFixedIncomeHolding,
  isFixedIncomeHolding,
  formatFixedIncomeSubtypeLabel,
  FIXED_INCOME_CREDIT_LABELS,
  FIXED_INCOME_DURATION_LABELS,
  FIXED_INCOME_TYPE_LABELS,
  NOT_FIXED_INCOME,
  type FixedIncomeClassification,
  type FixedIncomeCreditQuality,
  type FixedIncomeDurationBucket,
  type FixedIncomeFieldConfidence,
  type FixedIncomeHoldingInput,
  type FixedIncomeType,
} from "@/lib/services/classification/classifyFixedIncome";
export {
  buildFixedIncomeRateEducation,
  FIXED_INCOME_RATE_EDUCATION_BODY,
  FIXED_INCOME_DURATION_UNAVAILABLE_NOTE,
} from "@/lib/services/classification/fixedIncomeEducation";
export {
  allocateDisplayPercents,
  buildPortfolioExposureAllocation,
} from "@/lib/services/classification/buildPortfolioExposureAllocation";
export {
  isBitcoinHolding,
  isEthereumHolding,
  isCryptoIntelligenceHolding,
  type CryptoIdentityHolding,
} from "@/lib/services/classification/cryptoInstrumentIdentity";
export {
  EXPOSURE_GROUP_BAR_CLASS,
  EXPOSURE_GROUP_DOT_CLASS,
} from "@/lib/services/classification/exposureGroupColors";
export {
  EQUITY_EXPOSURE_GROUP_IDS,
  EQUITY_EXPOSURE_GROUP_ID_SET,
  EXPOSURE_GROUP_IDS,
  EXPOSURE_GROUP_LABELS,
  FIXED_INCOME_EXPOSURE_GROUP_ID,
  MAIN_EXPOSURE_GROUP_IDS,
  type ExposureClassificationConfidence,
  type ExposureClassificationSource,
  type ExposureGroupId,
  type HoldingExposureClassification,
  type PortfolioExposureAllocation,
  type PortfolioExposureGroupSlice,
  type PortfolioExposureHoldingContribution,
  type PortfolioExposureSubgroupSlice,
  type PortfolioFixedIncomeSleeve,
} from "@/lib/services/classification/types";
