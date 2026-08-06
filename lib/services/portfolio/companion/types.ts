/**
 * Investment Companion — shared model for Daily / Weekly / Monthly reviews.
 * Presentation-ready, deterministic, reusable by UI and future delivery channels.
 */

export type CompanionPeriod = "daily" | "weekly" | "monthly";

export type CompanionPeriodKind =
  | "session"
  | "rolling_7d"
  | "calendar_month"
  | "month_to_date";

export type CompanionFactTone = "positive" | "negative" | "neutral" | "muted";

export type CompanionReviewFact = {
  id: string;
  label: string;
  value: string;
  tone: CompanionFactTone;
  /** Optional plain-language detail (not a second card). */
  detail?: string | null;
};

export type CompanionFocus = {
  label: string;
  href?: string | null;
};

export type CompanionMilestone = {
  id: string;
  label: string;
};

export type CompanionDeepLink = {
  href: string;
  label: string;
};

export type CompanionReview = {
  period: CompanionPeriod;
  ready: boolean;
  /** Why the review is not ready — null when ready. */
  readinessReason: string | null;
  periodKind: CompanionPeriodKind;
  /** Short tab/header label: Today / This week / This month / Month to date */
  periodLabel: string;
  /** Exact human date range for screen readers and body copy. */
  dateRangeLabel: string;
  startDate: string | null;
  endDate: string | null;
  /** One strong lead sentence. */
  lead: string;
  supportingFacts: CompanionReviewFact[];
  focus: CompanionFocus | null;
  milestone: CompanionMilestone | null;
  closingStatement: string | null;
  goalStatusLabel: string | null;
  freshnessNote: string | null;
  links: CompanionDeepLink[];
  /** True when the review uses Demo Portfolio example data. */
  isDemo: boolean;
};

export type CompanionBundle = {
  daily: CompanionReview;
  weekly: CompanionReview;
  monthly: CompanionReview;
  /** Preferred default tab when opening /review. */
  defaultPeriod: CompanionPeriod;
};
