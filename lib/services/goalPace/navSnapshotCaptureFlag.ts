/**
 * Server-only write gate for prospective NAV snapshot capture.
 * Absent or any value other than exactly "true" is disabled.
 * Never expose as NEXT_PUBLIC_*. Preview/default remain write-disabled.
 */

export const PORTFOLIO_NAV_SNAPSHOT_CAPTURE_ENABLED_ENV =
  "PORTFOLIO_NAV_SNAPSHOT_CAPTURE_ENABLED" as const;

export type NavSnapshotCaptureEnv = {
  PORTFOLIO_NAV_SNAPSHOT_CAPTURE_ENABLED?: string;
  VERCEL_ENV?: string;
  NODE_ENV?: string;
};

export function isPortfolioNavSnapshotCaptureEnabled(
  env: NavSnapshotCaptureEnv = process.env,
): boolean {
  return env.PORTFOLIO_NAV_SNAPSHOT_CAPTURE_ENABLED === "true";
}
