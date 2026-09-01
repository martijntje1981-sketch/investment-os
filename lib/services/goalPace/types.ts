/**
 * Prospective canonical EUR NAV snapshots for future Goal Pace.
 * Capture is trusted-server only. No Goal Pace UI or pace math in this phase.
 */

export const PORTFOLIO_NAV_SNAPSHOTS_TABLE = "portfolio_nav_snapshots";

export type NavSnapshotUsability = "usable" | "partial";

export type NavSnapshotCaptureStatus =
  | "disabled"
  | "created"
  | "improved"
  | "already_captured"
  | "skipped_unavailable"
  | "skipped_demo"
  | "skipped_unresolved_access"
  | "forbidden"
  | "error";

export type FrozenGoalPlan = {
  goalId: string | null;
  targetValue: number;
  targetYear: number;
  targetDateIso: string;
  monthlyContribution: number;
  expectedAnnualReturn: number;
  goalUpdatedAt: string | null;
  planCapturedAt: string;
};

export type CanonicalNavValuation = {
  navEur: number;
  portfolioValueAvailable: boolean;
  isPartial: boolean;
  holdingCount: number;
  valuedHoldingCount: number;
  excludedHoldingCount: number;
  valuedAt: string | null;
};

export type PortfolioNavSnapshot = {
  id: string;
  userId: string;
  portfolioId: string;
  snapshotDateIso: string;
  capturedAt: string;
  navEur: number;
  usability: NavSnapshotUsability;
  holdingCount: number;
  valuedHoldingCount: number;
  excludedHoldingCount: number;
  valuedAt: string | null;
  goalId: string | null;
  goalTargetValue: number | null;
  goalTargetYear: number | null;
  goalTargetDateIso: string | null;
  goalMonthlyContribution: number | null;
  goalExpectedAnnualReturn: number | null;
  goalUpdatedAt: string | null;
  goalPlanCapturedAt: string | null;
};

export type NavSnapshotWriteDecision =
  | { action: "skip_unavailable" }
  | {
      action: "create";
      usability: NavSnapshotUsability;
      navEur: number;
    }
  | {
      action: "improve";
      usability: NavSnapshotUsability;
      navEur: number;
    }
  | { action: "keep" };

export type CapturePortfolioNavSnapshotResult = {
  status: NavSnapshotCaptureStatus;
  snapshot: PortfolioNavSnapshot | null;
  message: string;
};
