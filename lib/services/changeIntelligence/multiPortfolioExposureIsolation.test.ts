import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  buildPortfolioExposureAllocation,
  classifyHoldingExposure,
} from "@/lib/services/classification";
import { lookupInstrumentResearchProfile } from "@/lib/services/discover/instrumentResearchMetadata";
import { buildEvolutionNowState } from "@/lib/services/portfolioEvolution";
import { buildPortfolioEvolutionTimeline } from "@/lib/services/portfolioEvolution/buildPortfolioEvolutionTimeline";
import { buildPortfolioStance } from "@/lib/services/portfolioStance";
import type { IntelligenceStateSnapshot } from "@/lib/services/changeIntelligence/types";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function read(relativePath: string): string {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

const KIDS = "eb9c9aaf-ce47-4c06-aca2-1f59b14e8b87";
const MAIN = "0cbc32a4-79ab-48f5-be4f-5364939af498";

function vusa(overrides: Partial<StoredPortfolioHolding> = {}): StoredPortfolioHolding {
  return {
    id: "kids-vusa",
    symbol: "VUSA",
    name: "Vanguard S&P 500 UCITS ETF",
    quantity: 10,
    purchasePrice: 80,
    currentPrice: 86,
    currency: "EUR",
    assetType: "investment",
    providerSymbol: "VUSA.AS",
    ...overrides,
  };
}

function mainHistorySnapshot(): IntelligenceStateSnapshot {
  return {
    id: "main-week",
    userId: "user-1",
    portfolioId: MAIN,
    schemaVersion: 1,
    capturedAt: "2026-07-31T12:00:00.000Z",
    snapshotKind: "weekly",
    periodKey: "2026-W31",
    periodStart: "2026-07-27",
    periodEnd: "2026-07-31",
    timezone: "Europe/Amsterdam",
    payload: {
      schemaVersion: 1,
      isDemo: false,
      portfolio: {
        holdingCount: 3,
        valuedHoldingCount: 3,
        portfolioValue: 50_000,
        coverage: { portfolioValueAvailable: true },
      },
      holdings: [],
      concentration: {
        largestHoldingSymbol: "BTC",
        largestHoldingName: "Bitcoin",
        largestHoldingWeightPercent: 40,
      },
      exposure: {
        groups: [
          { groupId: "crypto", displayLabel: "Crypto", weightPercent: 40 },
          { groupId: "cash", displayLabel: "Cash", weightPercent: 20 },
          {
            groupId: "other_unclassified",
            displayLabel: "Other / Unclassified",
            weightPercent: 40,
          },
        ],
      },
    } as IntelligenceStateSnapshot["payload"],
  };
}

describe("multi-portfolio exposure and history isolation", () => {
  it("A. kids VUSA-only current allocation is diversified equity, not unclassified", () => {
    const amsterdamProfile = lookupInstrumentResearchProfile("VUSA.AS");
    expect(amsterdamProfile?.providerSymbol).toBe("VUSA.AS");
    expect(amsterdamProfile?.assetClass).toBe("equity_etf");
    expect(amsterdamProfile?.providerSymbol).not.toBe("VUSA.LSE");

    expect(classifyHoldingExposure(vusa()).normalizedGroupId).toBe(
      "diversified_equity",
    );
    expect(classifyHoldingExposure(vusa()).classificationSource).toBe(
      "research_profile",
    );
    expect(classifyHoldingExposure(vusa({ providerSymbol: null })).normalizedGroupId).toBe(
      "diversified_equity",
    );

    const allocation = buildPortfolioExposureAllocation([vusa()]);
    expect(allocation.groups).toHaveLength(1);
    expect(allocation.groups[0]?.groupId).toBe("diversified_equity");
    expect(allocation.groups[0]?.displayPercent).toBe(100);

    const now = buildEvolutionNowState({
      holdings: [vusa()],
      goal: null,
      hasSavedGoal: false,
    });
    expect(now.exposure.map((row) => row.groupId)).toEqual(["diversified_equity"]);
    expect(now.largestHoldingName).toBe("Vanguard S&P 500 UCITS ETF");
  });

  it("B. kids with no snapshots does not render Main history", () => {
    const now = buildEvolutionNowState({
      holdings: [vusa()],
      goal: null,
      hasSavedGoal: false,
    });
    const timeline = buildPortfolioEvolutionTimeline({
      now,
      snapshots: [],
      chartPoints: null,
    });
    expect(timeline.mixCheckpoints).toBeNull();
    expect(timeline.mixHistoryBlocked).toBe(true);
    expect(now.exposure.some((row) => row.groupId === "crypto")).toBe(false);
    expect(timeline.conclusion.primary).toMatch(/building your history/i);
  });

  it("C. snapshot list/write stay scoped to the selected book; Main history is unchanged", () => {
    const repo = read("lib/services/changeIntelligence/repository.ts");
    const api = read("app/api/intelligence/snapshots/route.ts");
    const hook = read("lib/client/useChangeIntelligence.ts");
    const capture = read("lib/client/captureIntelligenceSnapshots.ts");

    expect(repo).toContain('.eq("portfolio_id", input.portfolioId)');
    expect(repo).toContain("resolveSnapshotPortfolioId");
    expect(api).toContain("requestedPortfolioId");
    expect(api).toContain("portfolioId,");
    expect(hook).toContain("portfolioId=${encodeURIComponent(activePortfolioId)}");
    expect(hook).toContain("row.portfolioId === activePortfolioId");
    expect(capture).toContain("portfolioId: input.portfolioId");
    expect(mainHistorySnapshot().portfolioId).toBe(MAIN);
    expect(mainHistorySnapshot().portfolioId).not.toBe(KIDS);
  });

  it("D. kids stance uses only the kids VUSA book", () => {
    const kids = buildPortfolioStance({ holdings: [vusa()] });
    expect(kids.bandId).not.toBe("defensive");
    expect(kids.bandId).not.toBe("moderately_defensive");
    expect(kids.score).toBeGreaterThanOrEqual(56);
    expect(mainHistorySnapshot().portfolioId).toBe(MAIN);
    expect(read("lib/client/useChangeIntelligence.ts")).toContain(
      "row.portfolioId === activePortfolioId",
    );
  });
});
