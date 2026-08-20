import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  buildFixedIncomeHoldingProfile,
  classifyHoldingExposure,
  describeHoldingKindLabel,
} from "@/lib/services/classification";
import {
  buildHoldingIntelligenceCandidates,
  findHoldingIntelligenceCandidate,
} from "@/lib/services/holdingIntelligence";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function holding(
  overrides: Partial<StoredPortfolioHolding> &
    Pick<StoredPortfolioHolding, "symbol">,
): StoredPortfolioHolding {
  return {
    id: `${overrides.symbol}-id`,
    name: overrides.symbol,
    quantity: 10,
    purchasePrice: 100,
    currentPrice: 100,
    currency: "EUR",
    assetType: "investment",
    ...overrides,
  };
}

function read(relativePath: string) {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

const CATEGORIES = {
  usEquityLike: holding({
    symbol: "AIFS",
    name: "AI Infrastructure ETF",
    providerSymbol: "AIFS.XETRA",
  }),
  europeanEquityLike: holding({
    symbol: "ASML",
    name: "ASML Holding NV",
  }),
  diversifiedEtf: holding({
    symbol: "VWCE",
    name: "Vanguard FTSE All-World UCITS ETF",
    providerSymbol: "VWCE.XETRA",
    providerInstrumentType: "ETF",
  }),
  thematicEtf: holding({
    symbol: "NUKL",
    name: "VanEck Uranium and Nuclear Technologies UCITS ETF",
    providerSymbol: "NUKL.XETRA",
    providerInstrumentType: "ETF",
  }),
  bondEtf: holding({
    symbol: "EUNA",
    name: "iShares Core Global Aggregate Bond UCITS ETF EUR Hedged (Acc)",
    providerInstrumentType: "ETF",
  }),
  commodityEtc: holding({
    symbol: "IGLN",
    name: "iShares Physical Gold ETC",
    providerInstrumentType: "ETC",
  }),
  bitcoin: holding({
    symbol: "BTC",
    name: "Bitcoin",
    assetType: "crypto",
    providerSymbol: "BTC-EUR.CC",
  }),
  unknown: holding({
    symbol: "ZZZX",
    name: "ZZZX",
  }),
} as const;

describe("dynamic holding page quality gate", () => {
  it("keeps the live holding page generic and data-driven", () => {
    const page = read("app/holding/[ticker]/page.tsx");
    expect(page).toContain("useParams");
    expect(page).toContain("HoldingFixedIncomeCard");
    expect(page).toContain("HoldingMoveContextCard");
    expect(page).not.toMatch(/switch\s*\(/);
    expect(page).not.toMatch(/case\s+["']EUNA["']/);
    expect(page).not.toMatch(/symbol\s*===\s*["']EUNA["']/);
    expect(page).not.toMatch(/symbol\s*===\s*["']NUKL["']/);
    expect(page).not.toMatch(/symbol\s*===\s*["']BTC["']/);
    expect(page).not.toMatch(/openai/i);
    expect(page).not.toMatch(/setInterval\s*\(/);
    expect(page).not.toMatch(/executeEodhdApiCall/);
  });

  it("classifies representative holdings without ticker-specific UI", () => {
    expect(classifyHoldingExposure(CATEGORIES.usEquityLike).normalizedGroupId).toBe(
      "technology_communication",
    );
    expect(
      classifyHoldingExposure(CATEGORIES.europeanEquityLike).normalizedGroupId,
    ).toBe("other_unclassified");
    expect(
      classifyHoldingExposure(CATEGORIES.diversifiedEtf).normalizedGroupId,
    ).toBe("diversified_equity");
    expect(classifyHoldingExposure(CATEGORIES.thematicEtf).normalizedGroupId).toBe(
      "industrials_resources",
    );
    expect(classifyHoldingExposure(CATEGORIES.bondEtf).normalizedGroupId).toBe(
      "fixed_income",
    );
    expect(describeHoldingKindLabel(CATEGORIES.bondEtf)).toBe("Bond ETF");
    expect(classifyHoldingExposure(CATEGORIES.commodityEtc).fixedIncome).toBeFalsy();
    expect(classifyHoldingExposure(CATEGORIES.bitcoin).normalizedGroupId).toBe(
      "crypto",
    );
    expect(classifyHoldingExposure(CATEGORIES.unknown).normalizedGroupId).toBe(
      "other_unclassified",
    );
    expect(describeHoldingKindLabel(CATEGORIES.unknown)).toBeNull();
  });

  it("builds holding intelligence for every category and omits bond profile when not Fixed Income", () => {
    const holdings = Object.values(CATEGORIES);
    const candidates = buildHoldingIntelligenceCandidates({ holdings, newsItems: [] });
    expect(candidates.map((row) => row.symbol).sort()).toEqual(
      holdings.map((row) => row.symbol).sort(),
    );
    expect(findHoldingIntelligenceCandidate(candidates, "ZZZX")?.symbol).toBe("ZZZX");
    expect(
      buildFixedIncomeHoldingProfile(
        classifyHoldingExposure(CATEGORIES.bondEtf).fixedIncome,
        CATEGORIES.bondEtf,
      )?.typeLabel,
    ).toMatch(/aggregate/i);
    expect(
      buildFixedIncomeHoldingProfile(
        classifyHoldingExposure(CATEGORIES.diversifiedEtf).fixedIncome,
        CATEGORIES.diversifiedEtf,
      ),
    ).toBeNull();
    expect(
      buildFixedIncomeHoldingProfile(
        classifyHoldingExposure(CATEGORIES.unknown).fixedIncome,
        CATEGORIES.unknown,
      ),
    ).toBeNull();
  });

  it("omits unknown Fixed Income fields instead of inventing them", () => {
    const profile = buildFixedIncomeHoldingProfile(
      classifyHoldingExposure(CATEGORIES.bondEtf).fixedIncome,
      CATEGORIES.bondEtf,
    );
    expect(profile?.durationUnknown).toBe(true);
    expect(profile?.durationLabel).toBeNull();
  });
});
