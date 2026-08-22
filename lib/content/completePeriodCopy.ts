/**
 * Customer-facing 14-day Complete language.
 * Internal trial/entitlement keys stay unchanged.
 */

export const COMPLETE_PERIOD_COPY = {
  primaryCta: "Start with 14 days of Complete",
  compactCta: "Try Complete for 14 days",
  headerCta: "Start with Complete",
  supporting:
    "Experience everything Tobailey can do. After 14 days, choose Complete or continue with Free.",
  welcomeTitle: "Welcome to Tobailey Complete",
  welcomeBody:
    "You have 14 days to experience the full Tobailey intelligence. After that, choose Complete or simply continue with Free.",
  welcomeValue:
    "Add your investments and Tobailey will explain what happened, what matters now, whether you're on track, and what's ahead.",
  addPortfolioCta: "Add my portfolio",
  firstValueTitle: "Your portfolio in four questions",
  firstValueBody:
    "This is Tobailey reading your real holdings. If history, prices or a goal are still thin, that question stays honest instead of invented.",
  emptyHoldingsTitle: "Add your first investment",
  emptyHoldingsBody:
    "Add your first investment to start your personal Tobailey briefing.",
} as const;

export const MANDATORY_PAYMENT_COPY_PATTERNS = [
  /\bfree trial\b/i,
  /\bstart free trial\b/i,
  /\btrial expires\b/i,
  /\btrial expired\b/i,
  /\btrial ends\b/i,
  /\bupgrade before your trial ends\b/i,
  /\bsubscribe to keep using tobailey\b/i,
] as const;
