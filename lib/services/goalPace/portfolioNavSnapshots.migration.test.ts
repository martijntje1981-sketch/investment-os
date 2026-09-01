import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "../../..");
const migrationsDir = path.join(repoRoot, "supabase/migrations");
const navMigrationFile = "20260901120000_portfolio_nav_snapshots.sql";

function read(rel: string): string {
  return readFileSync(path.join(repoRoot, rel), "utf8");
}

const liveCaptureSurfaces = [
  "app/api/portfolio/route.ts",
  "app/api/prices/route.ts",
  "app/api/portfolio/performance/route.ts",
  "app/api/intelligence/snapshots/route.ts",
  "app/api/cron/market-snapshot/route.ts",
  "app/api/cron/monthly-review/route.ts",
  "app/api/cron/weekly-review-email/route.ts",
  "lib/client/useUserPortfolio.ts",
  "lib/client/goalProgressPeriods.ts",
  "components/dashboard/DashboardGoalProgressStrip.tsx",
  "vercel.json",
];

const trustedCaptureRoute = "app/api/portfolio/nav-snapshot/route.ts";

describe("portfolio_nav_snapshots migration", () => {
  const sql = read(`supabase/migrations/${navMigrationFile}`);

  it("creates the purpose-built table with canonical EUR identity", () => {
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS public\.portfolio_nav_snapshots/);
    expect(sql).toMatch(/user_id uuid NOT NULL/);
    expect(sql).toMatch(/portfolio_id uuid NOT NULL/);
    expect(sql).toMatch(/snapshot_date date NOT NULL/);
    expect(sql).toMatch(/captured_at timestamptz NOT NULL/);
    expect(sql).toMatch(/nav_eur numeric/);
    expect(sql).toMatch(/nav_currency text NOT NULL DEFAULT 'EUR'/);
    expect(sql).toMatch(/portfolio_nav_snapshots_currency_eur/);
    expect(sql).not.toMatch(/presentation_currency/);
    expect(sql).toMatch(
      /portfolio_nav_snapshots_user_portfolio_date_uidx[\s\S]*\(user_id, portfolio_id, snapshot_date\)/,
    );
  });

  it("stores valuation coverage and frozen Goal-plan evidence", () => {
    expect(sql).toMatch(/usability text NOT NULL/);
    expect(sql).toMatch(/holding_count integer NOT NULL/);
    expect(sql).toMatch(/valued_holding_count integer NOT NULL/);
    expect(sql).toMatch(/excluded_holding_count integer NOT NULL/);
    expect(sql).toMatch(/valued_at timestamptz/);
    expect(sql).toMatch(/goal_id uuid/);
    expect(sql).toMatch(/goal_target_value/);
    expect(sql).toMatch(/goal_target_year/);
    expect(sql).toMatch(/goal_target_date date/);
    expect(sql).toMatch(/goal_monthly_contribution/);
    expect(sql).toMatch(/goal_expected_annual_return/);
    expect(sql).toMatch(/goal_updated_at timestamptz/);
    expect(sql).toMatch(/goal_plan_captured_at timestamptz/);
  });

  it("does not FK goal_id so deletes cannot rewrite historical identity", () => {
    expect(sql).not.toMatch(
      /goal_id uuid REFERENCES public\.financial_goals/,
    );
  });

  it("enables RLS with authenticated SELECT only and no client-write policies", () => {
    expect(sql).toMatch(
      /ALTER TABLE public\.portfolio_nav_snapshots ENABLE ROW LEVEL SECURITY/,
    );
    expect(sql).toMatch(/user_id = auth\.uid\(\)/);
    expect(sql).toMatch(
      /p\.id = portfolio_nav_snapshots\.portfolio_id[\s\S]*p\.user_id = auth\.uid\(\)/,
    );
    expect(sql).toMatch(/FOR SELECT/);
    expect(sql).not.toMatch(/FOR INSERT/);
    expect(sql).not.toMatch(/FOR UPDATE/);
    expect(sql).not.toMatch(/FOR DELETE/);
    expect(sql).toMatch(/REVOKE ALL ON public\.portfolio_nav_snapshots FROM anon/);
    expect(sql).toMatch(
      /REVOKE ALL ON public\.portfolio_nav_snapshots FROM authenticated/,
    );
    expect(sql).toMatch(
      /GRANT SELECT ON public\.portfolio_nav_snapshots TO authenticated/,
    );
    expect(sql).not.toMatch(
      /GRANT SELECT, INSERT, UPDATE ON public\.portfolio_nav_snapshots TO authenticated/,
    );
  });

  it("rejects contradictory coverage rows at the database", () => {
    expect(sql).toMatch(/valued_holding_count <= holding_count/);
    expect(sql).toMatch(/excluded_holding_count <= holding_count/);
    expect(sql).toMatch(
      /valued_holding_count \+ excluded_holding_count <= holding_count/,
    );
    expect(sql).toMatch(/usability <> 'usable' OR excluded_holding_count = 0/);
    expect(sql).toMatch(/usability <> 'partial' OR excluded_holding_count > 0/);
  });

  it("freezes identity and Goal columns on UPDATE and rejects worse coverage", () => {
    expect(sql).toMatch(/NEW\.goal_id := OLD\.goal_id/);
    expect(sql).toMatch(/NEW\.goal_target_value := OLD\.goal_target_value/);
    expect(sql).toMatch(/NEW\.goal_plan_captured_at := OLD\.goal_plan_captured_at/);
    expect(sql).toMatch(/NEW\.user_id := OLD\.user_id/);
    expect(sql).toMatch(/NEW\.snapshot_date := OLD\.snapshot_date/);
    expect(sql).toMatch(/validate_portfolio_ownership/);
  });

  it("does not backfill history or convert reconstructed EOD / review snapshots", () => {
    expect(sql).not.toMatch(/INSERT INTO public\.portfolio_nav_snapshots/i);
    expect(sql).not.toMatch(/buildHistoricalPortfolioSeries/);
    expect(sql).not.toMatch(
      /FROM public\.(intelligence_state_snapshots|briefing_snapshots|monthly_review_snapshots)/i,
    );
  });

  it("is the only migration that mentions the new table", () => {
    const files = readdirSync(migrationsDir).filter((file) =>
      file.endsWith(".sql"),
    );
    const mentions = files.filter((file) =>
      readFileSync(path.join(migrationsDir, file), "utf8").includes(
        "portfolio_nav_snapshots",
      ),
    );
    expect(mentions).toEqual([navMigrationFile]);
  });
});

describe("Phase A1 isolation from live Goal Pace consumers", () => {
  it("is not imported by Goal-period math or reconstructed EOD history", () => {
    const forbidden = [
      "components/dashboard/DashboardGoalProgressStrip.tsx",
      "components/dashboard/dashboardGoalProgressStrip.test.ts",
      "lib/client/goalProgressPeriods.ts",
      "lib/client/goalProgressPeriods.test.ts",
      "lib/services/performance/buildHistoricalPortfolioSeries.ts",
      "lib/services/goals/goalProgressEngine.ts",
    ];

    for (const rel of forbidden) {
      const source = read(rel);
      expect(source).not.toContain("portfolio_nav_snapshots");
      expect(source).not.toContain("goalPace");
      expect(source).not.toContain("capturePortfolioNavSnapshot");
    }
  });

  it("Dashboard and Portfolio trigger capture without Goal Pace math or table writes", () => {
    for (const rel of ["app/dashboard/page.tsx", "app/portfolio/page.tsx"]) {
      const source = read(rel);
      expect(source).toContain("usePortfolioNavSnapshotCapture");
      expect(source).not.toContain("capturePortfolioNavSnapshot");
      expect(source).not.toContain("portfolio_nav_snapshots");
      expect(source).not.toContain("goalProgressEngine");
    }
  });

  it("is not invoked from prices, cron, reconstructed history, or vercel crons", () => {
    for (const rel of liveCaptureSurfaces) {
      const source = read(rel);
      expect(source, rel).not.toContain("capturePortfolioNavSnapshot");
      expect(source, rel).not.toContain("portfolio_nav_snapshots");
      expect(source, rel).not.toContain("@/lib/services/goalPace");
    }
  });

  it("A2 trusted route is the only live writer seam", () => {
    const source = read(trustedCaptureRoute);
    expect(source).toContain("runTrustedNavSnapshotCapture");
    expect(source).toContain("assertExamplePortfolioApiAccess");
    expect(source).toContain("auth.getUser");
    expect(source).not.toContain("NEXT_PUBLIC_PORTFOLIO_NAV_SNAPSHOT");
  });
});
