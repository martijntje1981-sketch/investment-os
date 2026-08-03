export {
  resolveExampleStatus,
  resolveExampleStatusForUser,
  shouldShowExampleBanner,
  type ExampleStatusKind,
  type ResolvedExampleStatus,
} from "@/lib/services/examplePortfolio/resolveExampleStatus";
export {
  EXAMPLE_START_MESSAGES,
  mapExampleOtpError,
  type ExampleStartErrorStatus,
} from "@/lib/services/examplePortfolio/otpErrors";
export {
  hasExampleActivationIntent,
  hasNonExampleMarketHoldings,
  isFalseExampleActivation,
  mayStartExampleClock,
  repairFalseExampleActivation,
} from "@/lib/services/examplePortfolio/repairFalseExample";
export * from "@/lib/services/examplePortfolio/types";
export * from "@/lib/services/examplePortfolio/templates";
export * from "@/lib/services/examplePortfolio/entitlements";
export {
  activateExamplePortfolioForUser,
  type ActivateExampleResult,
} from "@/lib/services/examplePortfolio/activate";
export {
  startExamplePortfolio,
  type StartExamplePortfolioResult,
} from "@/lib/services/examplePortfolio/startExamplePortfolio";
export {
  assertExamplePortfolioApiAccess,
  EXAMPLE_EXPIRED_API_CODE,
} from "@/lib/services/examplePortfolio/accessGuard";
export {
  convertExampleEntitlementForUser,
  EXAMPLE_CONVERSION_STATUS,
  type ConvertExampleResult,
} from "@/lib/services/examplePortfolio/conversion";
