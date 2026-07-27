import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("contributions ledger UI", () => {
  const dashboardSource = readFileSync(
    path.resolve(process.cwd(), "app/dashboard/page.tsx"),
    "utf8",
  );
  const cardSource = readFileSync(
    path.resolve(
      process.cwd(),
      "components/contributions/DashboardContributionsCard.tsx",
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

  it("places the contributions card near goal progress on the dashboard", () => {
    expect(dashboardSource).toContain("DashboardContributionsCard");
    expect(dashboardSource).toContain("DashboardGoalProgressCard");
    expect(dashboardSource).toMatch(
      /DashboardGoalProgressCard[\s\S]*DashboardContributionsCard/,
    );
  });

  it("shows onboarding when no entries exist", () => {
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

  it("displays totals and unavailable percentage behavior", () => {
    expect(cardSource).toContain("Net contributed");
    expect(cardSource).toContain("Value above contributions");
    expect(cardSource).toContain("valueAboveContributionsPercent");
    expect(cardSource).toContain("Portfolio value is unavailable");
    expect(copySource).toContain(CONTRIBUTIONS_EXPLANATORY_COPY);
  });

  it("reduces net contributed when withdrawals are saved", () => {
    expect(dialogSource).toContain('<option value="withdrawal">Withdrawal</option>');
    expect(cardSource).toContain("summary.totalWithdrawn");
    expect(cardSource).toContain("summary.netContributed");
  });
});

const CONTRIBUTIONS_EXPLANATORY_COPY =
  "Compares current portfolio value with deposits minus withdrawals. It does not account for the timing of cash flows.";
