/**
 * Contribution semantics + microcopy contracts.
 * Funding is not cash. Allocation coincidence is not causation.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  CONTRIBUTION_ADDED_TO_PORTFOLIO_COPY,
  CONTRIBUTION_DEFAULT_DESTINATION_ACTION,
  CONTRIBUTION_FUNDING_ONLY_NOTE,
  WITHDRAWAL_REMOVED_FROM_PORTFOLIO_COPY,
} from "@/lib/client/contributionsCopy";
import { activityTypeLabel } from "@/lib/services/contributions/activityLabels";
import {
  contributionDestinationKindLabel,
  contributionDestinationLabel,
} from "@/lib/services/contributions/destination";
import type { PortfolioContributionEntry } from "@/lib/services/contributions/types";
import { LOOKING_AHEAD_MODELED_BADGE } from "@/lib/services/lookingAhead";
import { holdingPriceStatusUserLabel } from "@/lib/client/holdingDisplayPrice";
import { buildPortfolioEvolutionTimeline } from "@/lib/services/portfolioEvolution/buildPortfolioEvolutionTimeline";
import type { EvolutionNowState } from "@/lib/services/portfolioEvolution/types";
import { WHAT_IF_DISCLAIMER, WHAT_IF_SHARED_ASSUMPTIONS } from "@/lib/services/whatIf/wording";

function read(relativePath: string): string {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

function entry(
  overrides: Partial<PortfolioContributionEntry> = {},
): PortfolioContributionEntry {
  return {
    id: "1",
    portfolioId: "p1",
    userId: "u1",
    entryType: "contribution",
    amount: 400,
    currency: "EUR",
    baseCurrency: "EUR",
    baseAmount: 400,
    fxRateUsed: 1,
    entryDate: "2026-07-15",
    note: null,
    source: "manual",
    destinationType: "cash",
    destinationHoldingId: null,
    destinationHoldingSymbol: null,
    destinationQuantity: null,
    destinationPricePerUnit: null,
    destinationFee: null,
    createdAt: "2026-07-15T10:00:00.000Z",
    updatedAt: "2026-07-15T10:00:00.000Z",
    ...overrides,
  };
}

function nowState(): EvolutionNowState {
  return {
    asOfDate: "2026-08-20",
    portfolioValue: 126_706,
    portfolioValueAvailable: true,
    exposure: [
      { groupId: "diversified_equity", displayLabel: "Diversified equity", weightPercent: 92 },
      { groupId: "cash", displayLabel: "Cash", weightPercent: 8 },
    ],
    largestHoldingSymbol: "VWCE",
    largestHoldingName: "FTSE All-World",
    largestHoldingWeightPercent: 18,
    bitcoinDependent: false,
    scenarioId: null,
    scenarioName: null,
    scenarioImpactPercent: null,
    resilienceScore: 60,
    goalProgressPercent: 16,
  };
}

describe("contribution semantics copy", () => {
  it("A. recorded contribution does not imply cash", () => {
    expect(contributionDestinationLabel(entry())).toBe("Portfolio");
    expect(contributionDestinationKindLabel(entry())).toBe("Portfolio");
    expect(contributionDestinationLabel(entry())).not.toBe("Cash");
    expect(activityTypeLabel(entry())).toBe("Recorded contribution");
    expect(CONTRIBUTION_ADDED_TO_PORTFOLIO_COPY).toBe("Added to your portfolio.");
    expect(CONTRIBUTION_DEFAULT_DESTINATION_ACTION).toBe("Added to portfolio");
    expect(CONTRIBUTION_FUNDING_ONLY_NOTE).not.toMatch(/cash inflow/i);

    const timeline = buildPortfolioEvolutionTimeline({
      now: nowState(),
      entries: [entry()],
      snapshots: [],
    });
    expect(timeline.fundingEvents[0]?.title).toBe("Recorded contribution");
    expect(timeline.fundingEvents[0]?.immediateEffectLabel).toBe(
      CONTRIBUTION_ADDED_TO_PORTFOLIO_COPY,
    );
    expect(timeline.fundingEvents[0]?.recordedDestinationLabel).toBeNull();
    expect(JSON.stringify(timeline.fundingEvents[0])).not.toMatch(/Recorded as cash/i);

    const dialog = read("components/contributions/ManageContributionsDialog.tsx");
    const dashboardCard = read(
      "components/contributions/DashboardContributionsCard.tsx",
    );
    expect(dialog).toContain("CONTRIBUTION_DEFAULT_DESTINATION_ACTION");
    expect(dialog).not.toContain("Add to cash");
    expect(dashboardCard).not.toContain(" · Cash");
  });

  it("B. recorded withdrawal does not imply sale of a specific holding", () => {
    const withdrawal = entry({
      id: "w1",
      entryType: "withdrawal",
      amount: 400,
      baseAmount: 400,
    });
    expect(activityTypeLabel(withdrawal)).toBe("Recorded withdrawal");
    expect(WITHDRAWAL_REMOVED_FROM_PORTFOLIO_COPY).toBe(
      "Removed from your portfolio.",
    );

    const timeline = buildPortfolioEvolutionTimeline({
      now: nowState(),
      entries: [withdrawal],
      snapshots: [],
    });
    expect(timeline.fundingEvents[0]?.title).toBe("Recorded withdrawal");
    expect(timeline.fundingEvents[0]?.immediateEffectLabel).toBe(
      WITHDRAWAL_REMOVED_FROM_PORTFOLIO_COPY,
    );
    expect(timeline.fundingEvents[0]?.recordedDestinationLabel).toBeNull();
    expect(timeline.fundingEvents[0]?.immediateEffectLabel).not.toMatch(
      /sold|sale|VWCE|Bitcoin/i,
    );
  });

  it("C. Evolution funding semantics are preserved", () => {
    const engine = read(
      "lib/services/portfolioEvolution/buildPortfolioEvolutionTimeline.ts",
    );
    expect(engine).toContain("Recorded contributions explain");
    expect(engine).not.toContain("went into cash");
    expect(engine).not.toContain("Recorded as cash");
  });

  it("D. contribution/allocation causality is not invented", () => {
    const engine = read(
      "lib/services/portfolioEvolution/buildPortfolioEvolutionTimeline.ts",
    );
    const section = read(
      "components/portfolioEvolution/PortfolioEvolutionSection.tsx",
    );
    const chart = read(
      "components/portfolioEvolution/PortfolioEvolutionChart.tsx",
    );
    expect(engine).toContain("allocationCoincidence");
    expect(section).toContain("Coincided with");
    expect(section).not.toMatch(/caused|because you contributed/i);
    expect(chart).toContain("Coincided with");
    expect(chart).toContain("is funding, not investment return");
  });

  it("E. modeled/not forecast wording is preserved", () => {
    expect(LOOKING_AHEAD_MODELED_BADGE).toMatch(/not forecast/i);
    expect(WHAT_IF_DISCLAIMER).toBe("Modeled scenario — not a forecast.");
    expect(WHAT_IF_SHARED_ASSUMPTIONS.join(" ")).toMatch(/modeled scenario/i);
  });

  it("F. canonical status terminology is preserved", () => {
    expect(holdingPriceStatusUserLabel("live")).toBe("Current");
    expect(holdingPriceStatusUserLabel("delayed")).toBe("Delayed");
    expect(holdingPriceStatusUserLabel("last_session")).toBe("Last session");
    expect(holdingPriceStatusUserLabel("estimated")).toBe("Estimated");
    expect(holdingPriceStatusUserLabel("unavailable")).toBe("Price unavailable");
  });

  it("G. major CTA labels remain valid", () => {
    expect(read("components/dashboard/DashboardExploreTools.tsx")).toContain(
      "Understand your portfolio",
    );
    expect(
      read("components/portfolioHistory/PortfolioHistoryNavCard.tsx"),
    ).toContain("View history");
    expect(
      read("components/dashboard/DashboardPortfolioExposureCard.tsx"),
    ).toContain("View allocation");
    expect(
      read("components/portfolioStance/DashboardPortfolioStance.tsx"),
    ).toContain("Explore stance");
  });

  it("H. does not change engines, APIs, or calculations", () => {
    expect(read("lib/services/contributions/destination.ts")).toContain(
      'return value === "holding" ? "holding" : "cash"',
    );
    expect(read("lib/services/contributions/destination.ts")).toContain(
      "never added to cash-flow totals",
    );
  });
});
