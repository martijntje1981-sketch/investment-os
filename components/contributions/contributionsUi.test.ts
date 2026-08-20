import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("contributions ledger UI", () => {
  const dashboardSource = readFileSync(
    path.resolve(process.cwd(), "app/dashboard/page.tsx"),
    "utf8",
  );
  const portfolioSource = readFileSync(
    path.resolve(process.cwd(), "app/portfolio/page.tsx"),
    "utf8",
  );
  const cardSource = readFileSync(
    path.resolve(
      process.cwd(),
      "components/contributions/DashboardContributionsCard.tsx",
    ),
    "utf8",
  );
  const fundingSource = readFileSync(
    path.resolve(
      process.cwd(),
      "components/contributions/PortfolioFundingSection.tsx",
    ),
    "utf8",
  );
  const dialogSource = readFileSync(
    path.resolve(
      process.cwd(),
      "components/contributions/ManageContributionsDialog.tsx",
    ),
    "utf8",
  );
  const copySource = readFileSync(
    path.resolve(process.cwd(), "lib/client/contributionsCopy.ts"),
    "utf8",
  );

  it("places recorded contributions on Portfolio and Evolution, not a duplicate Dashboard ledger card", () => {
    expect(dashboardSource).toContain("usePortfolioContributions");
    expect(dashboardSource).toContain("DashboardPortfolioEvolutionCard");
    expect(dashboardSource).not.toContain("DashboardPortfolioHistorySection");
    expect(dashboardSource).not.toContain("DashboardContributionsCard");
    expect(dashboardSource).not.toContain("DashboardGoalProgressCard");
    expect(dashboardSource).toContain("pulse={portfolioPulse}");
    expect(dashboardSource).not.toContain("DashboardDividendCard");
  });

  it("renders portfolio funding before the holdings list", () => {
    expect(portfolioSource).toContain("PortfolioFundingSection");
    expect(portfolioSource).toMatch(
      /PortfolioFundingSection[\s\S]*<section className="overflow-hidden rounded-\[28px\] border border-slate-200 bg-white shadow-sm">[\s\S]*<h2 className=\{appSectionTitleClass\}>Holdings<\/h2>/,
    );
  });

  it("shows portfolio empty state and opening contribution action", () => {
    expect(fundingSource).toContain("PORTFOLIO_FUNDING_EMPTY_COPY");
    expect(fundingSource).toContain("PORTFOLIO_FUNDING_OPENING_ACTION");
    expect(copySource).toContain(
      "Track how much money you have added to or withdrawn from this portfolio.",
    );
  });

  it("shows populated summary values on the portfolio page", () => {
    expect(fundingSource).toContain("Total contributed");
    expect(fundingSource).toContain("Total withdrawn");
    expect(fundingSource).toContain("Net contributed");
    expect(fundingSource).toContain("Current portfolio value");
    expect(fundingSource).toContain("Value above contributions");
    expect(fundingSource).toContain("summary.netContributed");
    expect(fundingSource).toContain("summary.totalWithdrawn");
  });

  it("shows the latest three entries and more-than-three copy", () => {
    expect(fundingSource).toContain("RECENT_ENTRY_LIMIT = 3");
    expect(fundingSource).toContain("entries.slice(0, RECENT_ENTRY_LIMIT)");
    expect(fundingSource).toContain(
      "Showing {RECENT_ENTRY_LIMIT} of {entries.length} entries",
    );
    expect(fundingSource).toContain("Recent activity");
  });

  it("reuses ManageContributionsDialog instead of duplicating CRUD", () => {
    expect(fundingSource).toContain(
      'from "@/components/contributions/ManageContributionsDialog"',
    );
    expect(fundingSource).toContain("<ManageContributionsDialog");
    expect(fundingSource).not.toContain("createPortfolioContribution");
    expect(cardSource).toContain("<ManageContributionsDialog");
    expect(dialogSource).toContain('<option value="withdrawal">Withdrawal</option>');
  });

  it("handles current value unavailable on portfolio funding", () => {
    expect(fundingSource).toContain("Current portfolio value is unavailable");
    expect(fundingSource).toContain("portfolioValueAvailable");
  });

  it("supports loading and fetch error states on portfolio funding", () => {
    expect(fundingSource).toContain('status === "loading"');
    expect(fundingSource).toContain("FundingSkeleton");
    expect(fundingSource).toContain('status === "error"');
    expect(fundingSource).toContain("Retry");
  });

  it("keeps the dashboard card compact with recent activity only when expanded", () => {
    expect(cardSource).toContain("Net contributed");
    expect(cardSource).toContain("Current value");
    expect(cardSource).toContain("Value above contributions");
    expect(cardSource).toContain("contributionBasisReliable");
    expect(cardSource).toContain("CONTRIBUTIONS_INCOMPLETE_BASIS_COPY");
    expect(cardSource).toContain("CONTRIBUTIONS_ADD_LABEL");
    expect(cardSource).toContain("CONTRIBUTIONS_MANAGE_LABEL");
    expect(cardSource).toContain("Recent activity");
    expect(cardSource).toContain("ExpandableDashboardSection");
    expect(cardSource).not.toContain("summary.totalContributed");
    expect(cardSource).not.toContain("summary.totalWithdrawn");
  });

  it("shows dashboard onboarding when no entries exist", () => {
    expect(cardSource).toContain("!hasEntries");
    expect(cardSource).toContain("CONTRIBUTIONS_ONBOARDING_COPY");
    expect(copySource).toContain(
      "Add the total amount you have contributed to establish your starting point.",
    );
  });

  it("supports opening contribution creation and management controls", () => {
    expect(dialogSource).toContain("opening_balance");
    expect(dialogSource).toContain("CONTRIBUTIONS_OPENING_LABEL");
    expect(dialogSource).toContain('aria-label={`Edit');
    expect(dialogSource).toContain('aria-label={`Delete');
    expect(dialogSource).toContain("Delete this entry permanently?");
  });

  it("displays unavailable percentage behavior on the dashboard", () => {
    expect(cardSource).toContain("valueAboveContributionsPercent");
    expect(cardSource).toContain("Portfolio value is unavailable");
  });
});
