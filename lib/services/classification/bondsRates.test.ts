import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  applyFourQuestionsIntelligenceDepth,
  buildWhatHappenedQuestion,
  buildWhatsAheadQuestion,
} from "@/lib/services/fourQuestions";
import {
  BONDS_RATES_OFFICIAL_CONTEXT_LABEL,
  buildBondsRatesView,
  buildFixedIncomeHoldingProfile,
  buildFixedIncomePortfolioContextLine,
  buildFixedIncomeReportContext,
  buildPortfolioExposureAllocation,
  buildQualitativeRateOutlook,
  classifyHoldingExposure,
  formatFixedIncomeSubtypeLabel,
} from "@/lib/services/classification";
import { selectOfficialRatePolicyContext } from "@/lib/services/news/officialMacro";
import type { NewsContentItem } from "@/lib/types/newsContent";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function read(relativePath: string) {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

function holding(
  overrides: Partial<StoredPortfolioHolding> &
    Pick<StoredPortfolioHolding, "symbol">,
): StoredPortfolioHolding {
  return {
    id: overrides.id ?? `${overrides.symbol}-id`,
    symbol: overrides.symbol,
    name: overrides.name ?? overrides.symbol,
    quantity: overrides.quantity ?? 10,
    purchasePrice: overrides.purchasePrice ?? 100,
    currentPrice: overrides.currentPrice ?? 100,
    currency: "EUR",
    assetType: overrides.assetType ?? "investment",
    providerSymbol: overrides.providerSymbol,
    instrumentName: overrides.instrumentName,
    providerInstrumentType: overrides.providerInstrumentType,
    changePercent: overrides.changePercent,
    previousClose: overrides.previousClose,
  };
}

function officialItem(
  overrides: Partial<NewsContentItem> & Pick<NewsContentItem, "id" | "title">,
): NewsContentItem {
  return {
    sourceName: "European Central Bank",
    sourceType: "news",
    canonicalUrl: `https://www.ecb.europa.eu/${overrides.id}`,
    thumbnailUrl: null,
    publishedAt: "2026-08-18T10:00:00.000Z",
    description: overrides.title,
    summary: overrides.title,
    interpretation: "",
    impactLevel: "High Impact",
    matchedHoldingIds: [],
    matchedSymbols: [],
    matchedHoldings: [],
    relevanceLabel: null,
    category: "macro",
    marketCategory: "macro",
    contentTypeLabel: "News",
    fetchedAt: "2026-08-18T12:00:00.000Z",
    relevanceScore: 0,
    contextKind: "macro_official",
    officialInstitution: "ecb",
    officialFeedKind: "policy_decision",
    macroTopic: "interest_rates",
    ...overrides,
  };
}

const government = holding({
  symbol: "IBTM",
  name: "iShares USD Treasury Bond 7-10yr UCITS ETF",
  quantity: 24,
});
const corporate = holding({
  symbol: "IEAC",
  name: "iShares EUR Investment Grade Corporate Bond UCITS ETF",
  quantity: 16,
});
const equity = holding({
  symbol: "VWCE",
  providerSymbol: "VWCE.XETRA",
  quantity: 60,
});

const PHASE14_FILES = [
  "lib/services/classification/bondsRatesView.ts",
  "lib/services/classification/fixedIncomeEducation.ts",
  "components/analysis/BondsRatesSection.tsx",
  "components/analysis/BondsRatesRelationshipVisual.tsx",
  "components/analysis/OfficialRatesBoard.tsx",
  "components/holding/HoldingFixedIncomeCard.tsx",
  "lib/services/fourQuestions/buildWhatsAhead.ts",
  "lib/services/periodIntelligence/buildPeriodIntelligenceReview.ts",
  "lib/services/officialRates/fetchOfficialRates.ts",
  "lib/client/useOfficialRates.ts",
  "app/api/official-rates/route.ts",
];

describe("Phase 14 bonds and rates intelligence", () => {
  it("renders Fixed Income allocation from existing classification", () => {
    const allocation = buildPortfolioExposureAllocation([
      government,
      corporate,
      equity,
    ]);
    const view = buildBondsRatesView({
      allocation,
      intelligenceDepth: "complete",
    });
    expect(view.hasFixedIncome).toBe(true);
    expect(view.weightPercent).toBeGreaterThan(0);
    expect(view.allocationLine).toMatch(/Fixed income now represents \d+% of your portfolio/);
    expect(read("components/analysis/BondsRatesSection.tsx")).toContain(
      "Fixed Income",
    );
    expect(read("components/analysis/PortfolioAnalysisPage.tsx")).toContain(
      "<BondsRatesSection",
    );
  });

  it("keeps government and corporate subtypes honest and labels inferred metadata", () => {
    const allocation = buildPortfolioExposureAllocation([government, corporate]);
    const types = allocation.fixedIncome?.subgroups.map((row) => row.type) ?? [];
    expect(types).toEqual(expect.arrayContaining(["government", "corporate"]));
    const inferred = allocation.fixedIncome?.subgroups.find(
      (row) => row.confidence === "inferred",
    );
    expect(inferred).toBeTruthy();
    expect(formatFixedIncomeSubtypeLabel(inferred!)).toMatch(/inferred/i);
    const complete = buildBondsRatesView({
      allocation,
      intelligenceDepth: "complete",
    });
    expect(complete.subtypeRows.some((row) => /inferred/i.test(row.label))).toBe(
      true,
    );
    const free = buildBondsRatesView({
      allocation,
      intelligenceDepth: "free",
    });
    expect(free.subtypeRows).toEqual([]);
    expect(free.showBreakdown).toBe(false);
    expect(free.officialContext).toBeNull();
  });

  it("explains rates-up / prices-down without fake duration or yield numbers", () => {
    const allocation = buildPortfolioExposureAllocation([government]);
    const view = buildBondsRatesView({ allocation });
    expect(view.educationBody).toMatch(/yields rise/i);
    expect(view.educationBody).toMatch(/bond prices generally fall/i);
    expect(view.educationBody).toMatch(/yields fall/i);
    expect(view.educationBody).toMatch(/bond prices generally rise/i);
    expect(view.educationBody).not.toMatch(/\d/);
    expect(view.educationBody).not.toMatch(/duration of|yield of|dv01/i);
    const unknownDuration = holding({
      symbol: "IBGS",
      name: "iShares USD Treasury Bond ETF",
    });
    const unknownView = buildBondsRatesView({
      allocation: buildPortfolioExposureAllocation([unknownDuration]),
    });
    expect(unknownView.durationNote).toMatch(/does not estimate/i);
    expect(unknownView.limitations.join(" ")).not.toMatch(/duration of \d|yield of \d/i);
    const unknownProfile = buildFixedIncomeHoldingProfile(
      classifyHoldingExposure(unknownDuration).fixedIncome,
    );
    expect(unknownProfile?.durationUnknown).toBe(true);
    expect(unknownProfile?.durationLabel).toBeNull();
    const knownProfile = buildFixedIncomeHoldingProfile(
      classifyHoldingExposure(government).fixedIncome,
    );
    expect(knownProfile?.durationUnknown).toBe(false);
    expect(knownProfile?.durationLabel).toMatch(/inferred/i);
    expect(knownProfile?.durationLabel).not.toMatch(/\d/);
  });

  it("maps official ECB/Fed rate context to Fixed Income and ignores unrelated labor items", () => {
    const allocation = buildPortfolioExposureAllocation([government, equity]);
    const ecb = officialItem({
      id: "ecb-rates",
      title: "ECB keeps key interest rates unchanged",
    });
    const fed = officialItem({
      id: "fed-policy",
      title: "Federal Reserve issues FOMC statement",
      sourceName: "Federal Reserve Board",
      officialInstitution: "federal_reserve",
      canonicalUrl: "https://www.federalreserve.gov/newsevents/pressreleases/monetary20260818a.htm",
    });
    const labor = officialItem({
      id: "ecb-labor",
      title: "Euro area unemployment rate",
      officialFeedKind: "economic_release",
      macroTopic: "labor",
    });
    expect(selectOfficialRatePolicyContext([labor, ecb])?.id).toBe("ecb-rates");
    expect(selectOfficialRatePolicyContext([labor, fed])?.id).toBe("fed-policy");
    expect(selectOfficialRatePolicyContext([labor])).toBeNull();

    const withFi = buildBondsRatesView({
      allocation,
      ratePolicyContext: selectOfficialRatePolicyContext([labor, ecb]),
    });
    expect(withFi.officialContext?.title).toMatch(/ECB keeps key interest rates/i);
    expect(BONDS_RATES_OFFICIAL_CONTEXT_LABEL).toBe("Official macro context");
    expect(read("components/analysis/BondsRatesSection.tsx")).toContain(
      "BONDS_RATES_OFFICIAL_CONTEXT_LABEL",
    );

    const noFi = buildBondsRatesView({
      allocation: buildPortfolioExposureAllocation([equity]),
      ratePolicyContext: ecb,
    });
    expect(noFi.hasFixedIncome).toBe(false);
    expect(noFi.officialContext).toBeNull();
  });

  it("preserves Q1 attribution and does not force bond copy without support", () => {
    const offset = buildWhatHappenedQuestion({
      scope: "all",
      holdings: [
        holding({
          symbol: "VWCE",
          providerSymbol: "VWCE.XETRA",
          quantity: 80,
          currentPrice: 90,
          previousClose: 100,
          changePercent: -10,
        }),
        holding({
          symbol: "IBTM",
          name: "iShares USD Treasury Bond ETF",
          quantity: 20,
          currentPrice: 103,
          previousClose: 100,
          changePercent: 3,
        }),
      ],
    });
    expect(offset.support).toMatch(/offset part of/i);

    const noOffset = buildWhatHappenedQuestion({
      scope: "all",
      holdings: [
        holding({
          symbol: "VWCE",
          providerSymbol: "VWCE.XETRA",
          quantity: 80,
          currentPrice: 110,
          previousClose: 100,
          changePercent: 10,
        }),
        holding({
          symbol: "IBTM",
          name: "iShares USD Treasury Bond ETF",
          quantity: 20,
          currentPrice: 103,
          previousClose: 100,
          changePercent: 3,
        }),
      ],
    });
    expect(noOffset.support ?? "").not.toMatch(/offset part of/i);
  });

  it("keeps Q4 rate sensitivity qualitative and never invents a numeric shock", () => {
    const q4Unknown = buildWhatsAheadQuestion({
      scope: "all",
      holdings: [
        holding({
          symbol: "IBGS",
          name: "iShares USD Treasury Bond ETF",
        }),
      ],
      resilienceProfile: null,
    });
    const unknownRates = q4Unknown.expandItems.find(
      (row) => row.id === "fixed-income-rates",
    );
    expect(unknownRates?.detail).toMatch(/duration is unavailable|exact rate sensitivity/i);
    expect(unknownRates?.detail).not.toMatch(/\d+(\.\d+)?\s?%/);

    const q4 = buildWhatsAheadQuestion({
      scope: "all",
      holdings: [government],
      resilienceProfile: null,
    });
    const rates = q4.expandItems.find((row) => row.id === "fixed-income-rates");
    expect(rates?.detail).toMatch(/qualitative|numeric rate shock|precise rate shock/i);
    expect(rates?.detail).not.toMatch(/\d+(\.\d+)?\s?%/);
    expect(rates?.detail).not.toMatch(/basis points|\+1%|\-1%/i);
    expect(q4.answer).not.toMatch(/rate shock of|duration of/i);

    const equityOnly = buildWhatsAheadQuestion({
      scope: "all",
      holdings: [equity],
      resilienceProfile: null,
    });
    expect(
      equityOnly.expandItems.some((row) => row.id === "fixed-income-rates"),
    ).toBe(false);

    const outlook = buildQualitativeRateOutlook({
      weightPercent: 24,
      durationKnownSharePercent: 40,
      majorityIsLongDuration: true,
    });
    expect(outlook).toMatch(/qualitative|not a modeled shock/i);
    expect(outlook).not.toMatch(/\d/);
  });

  it("keeps Free vs Complete behavior on existing product access, not new entitlements", () => {
    const allocation = buildPortfolioExposureAllocation([government, corporate]);
    const complete = buildBondsRatesView({
      allocation,
      intelligenceDepth: "complete",
      ratePolicyContext: officialItem({
        id: "ecb-rates",
        title: "ECB keeps key interest rates unchanged",
      }),
    });
    const free = buildBondsRatesView({
      allocation,
      intelligenceDepth: "free",
      ratePolicyContext: officialItem({
        id: "ecb-rates",
        title: "ECB keeps key interest rates unchanged",
      }),
    });
    expect(complete.showBreakdown).toBe(true);
    expect(complete.subtypeRows.length).toBeGreaterThan(0);
    expect(complete.whatMatters).toBeTruthy();
    expect(complete.metrics.some((row) => row.id === "type")).toBe(true);
    expect(free.showBreakdown).toBe(false);
    expect(free.subtypeRows).toEqual([]);
    expect(free.educationBody).toBe(complete.educationBody);
    expect(free.officialContext?.title).toBe(complete.officialContext?.title);
    expect(free.allocationLine).toBe(complete.allocationLine);

    const q4 = buildWhatsAheadQuestion({
      scope: "all",
      holdings: [government],
      resilienceProfile: null,
      intelligenceDepth: "complete",
    });
    const freeQ4 = applyFourQuestionsIntelligenceDepth(
      {
        scope: "all",
        intelligenceDepth: "complete",
        questions: [q4],
      },
      "free",
    ).questions[0];
    expect(
      freeQ4?.expandItems.some((row) => row.id === "fixed-income-rates"),
    ).toBe(false);

    expect(read("components/analysis/BondsRatesSection.tsx")).toContain(
      "intelligenceDepth",
    );
    expect(read("components/holding/HoldingFixedIncomeCard.tsx")).toContain(
      'intelligenceDepth === "complete"',
    );
  });

  it("uses a mobile-safe structure and does not add a provider, cron, or polling path", () => {
    const ui = read("components/analysis/BondsRatesSection.tsx");
    expect(ui).toContain("min-w-0");
    expect(ui).toContain("scroll-mt-24");
    expect(ui).toContain("min-h-11");
    expect(ui).toContain("appSectionBodyClass");
    expect(ui).not.toContain("overflow-x-scroll");
    expect(ui).not.toContain("overflow-x-auto");
    expect(read("components/holding/HoldingFixedIncomeCard.tsx")).toContain(
      "min-h-11",
    );

    for (const file of PHASE14_FILES) {
      const source = read(file);
      expect(source).not.toMatch(/executeEodhdApiCall/);
      expect(source).not.toMatch(/openai/i);
      expect(source).not.toMatch(/setInterval\s*\(/);
      expect(source).not.toMatch(/node-cron|cron\.schedule/i);
      expect(source).not.toMatch(/\/api\/cash-intelligence/);
      expect(source).not.toMatch(/useCashIntelligence/);
    }
    expect(read("lib/services/classification/bondsRatesView.ts")).not.toMatch(
      /fetch\(/,
    );
    expect(ui).not.toMatch(/3\.\d{2}%|policy rate is \d/i);
  });

  it("reuses reports for Fixed Income context without a bond-specific report", () => {
    expect(
      buildFixedIncomePortfolioContextLine(24),
    ).toBe("Fixed income now represents 24% of your portfolio.");
    expect(
      buildFixedIncomeReportContext({
        weightPercent: 24,
        ratePolicyContext: { sourceName: "European Central Bank" },
      }),
    ).toEqual([
      "Fixed income now represents 24% of your portfolio.",
      "Official European Central Bank rate policy is relevant context for your bond exposure.",
    ]);
    expect(
      buildFixedIncomeReportContext({ weightPercent: 0 }),
    ).toEqual([]);
    const reviewSource = read(
      "lib/services/periodIntelligence/buildPeriodIntelligenceReview.ts",
    );
    expect(reviewSource).toContain("attachFixedIncomeAheadContext");
    expect(reviewSource).toContain("buildFixedIncomeReportContext");
    expect(reviewSource).not.toMatch(/bond-specific report|bonds report/i);
  });

  it("shows a useful empty state without duration-unavailable copy", () => {
    const view = buildBondsRatesView({
      allocation: buildPortfolioExposureAllocation([equity]),
    });
    expect(view.hasFixedIncome).toBe(false);
    expect(view.emptyHeadline).toBe("No Fixed Income holdings in this portfolio.");
    expect(view.emptyBody).toMatch(/Add a bond or bond ETF/i);
    expect(view.addHoldingHref).toBe("/portfolio?add=investment");
    expect(view.durationNote).toBeNull();
    expect(view.limitations.join(" ")).not.toMatch(
      /Duration is not available for this portfolio/i,
    );
    expect(read("components/analysis/BondsRatesSection.tsx")).toContain(
      "Add Fixed Income holding",
    );
  });

  it("never shows the empty state when a recognized Fixed Income holding exists", () => {
    const euna = holding({
      symbol: "EUNA",
      name: "iShares Core Global Aggregate Bond UCITS ETF EUR Hedged (Acc)",
      quantity: 2,
      purchasePrice: 10,
      currentPrice: 10,
    });
    const largeEquity = holding({
      symbol: "VWCE",
      providerSymbol: "VWCE.XETRA",
      quantity: 400,
      currentPrice: 120,
    });
    const allocation = buildPortfolioExposureAllocation([euna, largeEquity]);
    expect(allocation.fixedIncome).not.toBeNull();
    expect(allocation.fixedIncome!.weightPercent).toBeLessThan(1);
    const view = buildBondsRatesView({
      allocation,
      holdings: [euna, largeEquity],
      intelligenceDepth: "complete",
    });
    expect(view.hasFixedIncome).toBe(true);
    expect(view.weightPercent).toBeGreaterThan(0);
    expect(view.weightPercent).toBeLessThan(0.1);
    expect(view.whatMatters).toMatch(/<0\.1%/);
    expect(view.allocationLine).not.toBe(view.emptyHeadline);
    expect(view.holdings.map((row) => row.symbol)).toContain("EUNA");
    expect(view.metrics.some((row) => /aggregate/i.test(row.value))).toBe(true);
    expect(view.metrics.some((row) => /EUR hedged/i.test(row.value))).toBe(true);
  });

  it("classifies realistic bond ETF fixtures without inventing yield or ratings", () => {
    const aggregate = holding({
      symbol: "AGGH",
      name: "iShares Core Global Aggregate Bond UCITS ETF",
    });
    const highYield = holding({
      symbol: "IHYA",
      name: "iShares EUR High Yield Corporate Bond UCITS ETF",
    });
    const inflation = holding({
      symbol: "ITPS",
      name: "iShares USD TIPS UCITS ETF",
    });
    const ambiguous = holding({
      symbol: "FLEX",
      name: "Flexible Strategy Fund",
    });

    expect(classifyHoldingExposure(aggregate).fixedIncome?.type).toBe(
      "mixed_aggregate",
    );
    expect(classifyHoldingExposure(government).fixedIncome?.type).toBe("government");
    expect(classifyHoldingExposure(corporate).fixedIncome?.type).toBe("corporate");
    expect(classifyHoldingExposure(highYield).fixedIncome?.creditQuality).toBe(
      "high_yield",
    );
    expect(classifyHoldingExposure(inflation).fixedIncome?.type).toBe(
      "inflation_linked",
    );
    expect(classifyHoldingExposure(ambiguous).fixedIncome?.isFixedIncome).toBeFalsy();

    const allocation = buildPortfolioExposureAllocation([
      aggregate,
      government,
      corporate,
      highYield,
      inflation,
    ]);
    expect(allocation.fixedIncome?.durationKnownSharePercent).toBe(0);
    expect(allocation.fixedIncome?.durationClassifiedSharePercent).toBeGreaterThan(
      0,
    );
    const blob = JSON.stringify(buildBondsRatesView({ allocation, holdings: [
      aggregate, government, corporate, highYield, inflation,
    ], intelligenceDepth: "complete" }));
    expect(blob).not.toMatch(/yield of|coupon of|duration of \d/i);
    expect(blob).not.toMatch(/AAA|BBB\+|rating: /i);
    expect(blob).toMatch(/inferred/i);
  });

  it("keeps add-holding compatible with bonds without a new provider path", () => {
    const match = read("lib/services/instruments/instrumentMatchEngine.ts");
    expect(match).toContain("safeFetchSearch");
    expect(match).not.toMatch(/type:\s*"stock"/);
    expect(read("app/portfolio/page.tsx")).toMatch(/Bond ETFs and individual bonds/);
    expect(read("app/portfolio/page.tsx")).toContain("describeHoldingKindLabel");
    expect(read("app/portfolio/page.tsx")).toContain("formatAllocationPercent");
    expect(read("lib/services/instruments/listingConfirmation.ts")).toContain(
      "providerInstrumentType",
    );
    expect(read("components/dashboard/DashboardQuickActions.tsx")).toContain(
      "/portfolio?add=investment",
    );
  });
});
