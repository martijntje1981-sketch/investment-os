import { describe, expect, it } from "vitest";

import { buildPortfolioDividendSnapshot } from "@/lib/services/dividends/dividendCalculator";
import { buildPortfolioExposureAllocation } from "@/lib/services/classification";
import {
  buildHiddenDrivers,
  buildPortfolioHealthProfile,
  buildSharedClassification,
} from "@/lib/services/portfolio/portfolioHealthProfile";
import type { DividendApiQuote } from "@/lib/types/dividends";
import type {
  GoalSettings,
  StoredPortfolioHolding,
} from "@/lib/types/portfolioStorage";

function holding(
  overrides: Partial<StoredPortfolioHolding> &
    Pick<StoredPortfolioHolding, "symbol">,
): StoredPortfolioHolding {
  return {
    id: overrides.id ?? `${overrides.symbol}-id`,
    symbol: overrides.symbol,
    name: overrides.name ?? overrides.symbol,
    quantity: overrides.quantity ?? 10,
    purchasePrice: overrides.purchasePrice ?? 90,
    currentPrice: overrides.currentPrice ?? 100,
    currency: overrides.currency ?? "EUR",
    assetType: overrides.assetType ?? "investment",
    providerSymbol: overrides.providerSymbol,
    quoteCurrency: overrides.quoteCurrency,
    isin: overrides.isin,
    distributionPolicyUserOverride: overrides.distributionPolicyUserOverride,
    changePercent: overrides.changePercent,
    previousClose: overrides.previousClose,
    change24hPercent: overrides.change24hPercent,
    marketPriceUpdatedAt: overrides.marketPriceUpdatedAt,
  };
}

function goal(overrides: Partial<GoalSettings> = {}): GoalSettings {
  return {
    targetValue: 100000,
    targetYear: 2035,
    monthlyContribution: 500,
    expectedAnnualReturn: 7,
    ...overrides,
  };
}

function dividendQuote(
  overrides: Partial<DividendApiQuote> & Pick<DividendApiQuote, "symbol">,
): DividendApiQuote {
  return {
    providerSymbol: `${overrides.symbol}.XETRA`,
    paysDividends: true,
    dividendYield: 3.5,
    forwardAnnualDividendRate: 3.5,
    estimatedAnnualDividendEur: 35,
    estimatedNextPaymentEur: 8,
    nextExDate: "2026-08-01",
    nextPaymentDate: "2026-08-15",
    frequency: "quarterly",
    currency: "EUR",
    updatedAt: "2026-07-20T00:00:00.000Z",
    verifiedCashDistributionEvent: {
      date: "2026-06-01",
      amount: 0.4,
      currency: "EUR",
    },
    providerUnavailable: false,
    ...overrides,
  };
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

describe("buildPortfolioHealthProfile Phase 3", () => {
  it("keeps DNA/Exposure crypto classification aligned for IB1T Bitcoin ETP mixes", () => {
    const holdings = [
      holding({
        symbol: "IB1T",
        name: "iShares Bitcoin ETP",
        providerSymbol: "IB1T.XETRA",
        quantity: 100,
        currentPrice: 48,
      }),
      holding({
        symbol: "VWCE",
        name: "Vanguard FTSE All-World",
        providerSymbol: "VWCE.XETRA",
        quantity: 200,
        currentPrice: 120,
      }),
      holding({
        symbol: "EUR",
        name: "Euro cash",
        assetType: "cash",
        quantity: 1000,
        currentPrice: 1,
      }),
    ];

    const exposure = buildPortfolioExposureAllocation(holdings);
    const shared = buildSharedClassification(exposure);
    const profile = buildPortfolioHealthProfile({
      holdings,
      goal: goal({ expectedAnnualReturn: 10 }),
      hasSavedGoal: true,
      exposure,
    });

    expect(shared.cryptoWeight).toBeGreaterThan(10);
    expect(profile.classification.cryptoWeight).toBe(round1(shared.cryptoWeight));
    expect(profile.exposure.slices.find((s) => s.id === "crypto")?.percent).toBe(
      profile.classification.cryptoWeight,
    );
    expect(profile.hero.identity).toBeTruthy();
    expect(profile.hero.tagline.split(/\s+/).length).toBeLessThanOrEqual(30);
    expect(profile.hero.traits.length).toBeLessThanOrEqual(3);
    expect(profile.dna.characteristics.some((c) => /IB1T/i.test(c.value))).toBe(
      false,
    );
  });

  it("classifies crypto-only portfolios without equity weaknesses", () => {
    const holdings = [
      holding({
        symbol: "BTC",
        name: "Bitcoin",
        assetType: "crypto",
        providerSymbol: "BTC-EUR.CC",
        quantity: 1,
        currentPrice: 60000,
      }),
      holding({
        symbol: "ETH",
        name: "Ethereum",
        assetType: "crypto",
        providerSymbol: "ETH-EUR.CC",
        quantity: 10,
        currentPrice: 2000,
      }),
      holding({
        symbol: "USDC",
        name: "USD Coin",
        assetType: "crypto",
        providerSymbol: "USDC-EUR.CC",
        quantity: 5000,
        currentPrice: 1,
      }),
    ];

    const profile = buildPortfolioHealthProfile({
      holdings,
      goal: goal({ expectedAnnualReturn: 12, targetYear: 2040 }),
      hasSavedGoal: true,
      dividends: buildPortfolioDividendSnapshot(holdings, []),
    });

    expect(profile.hero.identity).toMatch(
      /Bitcoin-Focused|Diversified Crypto|Altcoin-Led|Stablecoin-Heavy/,
    );
    expect(profile.exposure.mode).toBe("crypto_breakdown");
    expect(profile.exposure.slices.map((s) => s.id)).toEqual(
      expect.arrayContaining(["bitcoin", "altcoins", "stablecoins"]),
    );
    expect(profile.exposure.slices.some((s) => /Technology|Healthcare|Equity/i.test(s.label))).toBe(
      false,
    );
    expect(
      profile.dna.characteristics.find((c) => c.id === "asset_class_breadth")?.value,
    ).toMatch(/Single class/i);
    expect(
      profile.dna.characteristics.find((c) => c.id === "within_crypto_breadth")?.value,
    ).toBeTruthy();
    expect(
      profile.dna.characteristics.find((c) => c.id === "income")?.value,
    ).toMatch(/Not applicable/i);
    expect(profile.hiddenDrivers.drivers.map((d) => d.id)).toEqual(
      expect.arrayContaining(["bitcoin"]),
    );
    expect(profile.hiddenDrivers.drivers.some((d) => /Technology|Global equity/i.test(d.label))).toBe(
      false,
    );
    expect(profile.vulnerability?.title).not.toMatch(/dividend|equity sector|lacks diversification/i);
    expect(profile.vulnerability?.detail ?? "").not.toMatch(/lacks traditional diversification as a weakness/i);
    expect(profile.goalAlignment.label).toBe("Strong alignment");
  });

  it("describes a Bitcoin-only book as focused digital assets with limited within-crypto breadth", () => {
    const holdings = [
      holding({
        symbol: "BTC",
        name: "Bitcoin",
        assetType: "crypto",
        providerSymbol: "BTC-EUR.CC",
        quantity: 2,
        currentPrice: 50000,
      }),
    ];

    const profile = buildPortfolioHealthProfile({
      holdings,
      goal: goal({ expectedAnnualReturn: 3, targetYear: 2028 }),
      hasSavedGoal: true,
    });

    expect(profile.hero.identity).toBe("Bitcoin-Focused Digital Asset Portfolio");
    expect(profile.hero.tagline.toLowerCase()).toMatch(/bitcoin|dominant|within-crypto/);
    expect(
      profile.dna.characteristics.find((c) => c.id === "within_crypto_breadth")?.value,
    ).toBe("Limited");
    expect(profile.hiddenDrivers.drivers[0]?.id).toBe("bitcoin");
    expect(profile.goalAlignment.label).toBe("Limited alignment");
  });

  it("identifies dividend-focused portfolios as Income Builder", () => {
    const holdings = [
      holding({
        symbol: "VHYL",
        name: "Vanguard High Yield",
        providerSymbol: "VHYL.XETRA",
        isin: "IE00TESTDIST01",
        quantity: 100,
        currentPrice: 50,
        distributionPolicyUserOverride: "distributing",
      }),
      holding({
        symbol: "IDVY",
        name: "Euro Dividend",
        providerSymbol: "IDVY.XETRA",
        isin: "IE00TESTDIST02",
        quantity: 80,
        currentPrice: 40,
        distributionPolicyUserOverride: "distributing",
      }),
      holding({
        symbol: "VWCE",
        name: "Vanguard FTSE All-World Acc",
        providerSymbol: "VWCE.XETRA",
        quantity: 20,
        currentPrice: 120,
        distributionPolicyUserOverride: "accumulating",
      }),
    ];

    const quotes = [
      dividendQuote({
        symbol: "VHYL",
        providerSymbol: "VHYL.XETRA",
        dividendYield: 4,
        estimatedAnnualDividendEur: 200,
      }),
      dividendQuote({
        symbol: "IDVY",
        providerSymbol: "IDVY.XETRA",
        dividendYield: 3.5,
        estimatedAnnualDividendEur: 112,
      }),
    ];

    const dividends = buildPortfolioDividendSnapshot(holdings, quotes);
    const profile = buildPortfolioHealthProfile({
      holdings,
      goal: goal({ passiveIncomeTarget: 6000 }),
      hasSavedGoal: true,
      dividends,
    });

    expect(profile.hero.identity).toBe("Income Builder");
    expect(profile.goalAlignment.label).toBe("Strong alignment");
    expect(profile.strength?.title.toLowerCase()).toMatch(/income/);
  });

  it("describes concentrated portfolios without ticker restatement", () => {
    const holdings = [
      holding({
        symbol: "AIFS",
        name: "AI & Tech",
        providerSymbol: "AIFS.XETRA",
        quantity: 100,
        currentPrice: 100,
      }),
      holding({
        symbol: "EUR",
        name: "Euro cash",
        assetType: "cash",
        quantity: 200,
        currentPrice: 1,
      }),
    ];

    const profile = buildPortfolioHealthProfile({
      holdings,
      goal: goal(),
      hasSavedGoal: true,
    });

    expect(profile.hero.identity).toMatch(
      /High Conviction|Technology Growth|Thematic Growth/,
    );
    expect(profile.vulnerability?.title).toMatch(/concentration|thematic/i);
    expect(profile.strength?.detail ?? "").not.toMatch(/\bAIFS\b/);
    expect(profile.hero.traits.join(" ")).not.toMatch(/\bAIFS\b/);
  });

  it("returns goal data unavailable when no goal is saved", () => {
    const holdings = [
      holding({
        symbol: "VWCE",
        providerSymbol: "VWCE.XETRA",
        quantity: 50,
        currentPrice: 120,
      }),
    ];

    const profile = buildPortfolioHealthProfile({
      holdings,
      goal: null,
      hasSavedGoal: false,
    });

    expect(profile.goalAlignment.label).toBe("Goal data unavailable");
    expect(profile.goalAlignment.bandPosition).toBe(0);
  });

  it("marks partial classification and unavailable pricing transparently", () => {
    const holdings = [
      holding({
        symbol: "UNK1",
        name: "Unknown Instrument One",
        quantity: 40,
        currentPrice: 100,
      }),
      holding({
        symbol: "UNK2",
        name: "Unknown Instrument Two",
        quantity: 30,
        currentPrice: 0,
      }),
    ];

    const profile = buildPortfolioHealthProfile({
      holdings,
      goal: goal(),
      hasSavedGoal: true,
    });

    expect(profile.partialData).toBe(true);
    expect(profile.dataNotes.join(" ").toLowerCase()).toMatch(
      /unclassified|price|partial/,
    );
  });

  it("builds hidden drivers that are not a plain allocation copy", () => {
    const holdings = [
      holding({
        symbol: "IB1T",
        name: "iShares Bitcoin ETP",
        providerSymbol: "IB1T.XETRA",
        quantity: 100,
        currentPrice: 48,
      }),
      holding({
        symbol: "NUKL",
        name: "Uranium",
        providerSymbol: "NUKL.XETRA",
        quantity: 50,
        currentPrice: 40,
      }),
      holding({
        symbol: "VWCE",
        providerSymbol: "VWCE.XETRA",
        quantity: 80,
        currentPrice: 120,
      }),
      holding({
        symbol: "EUR",
        name: "Euro cash",
        assetType: "cash",
        quantity: 3000,
        currentPrice: 1,
      }),
    ];

    const exposure = buildPortfolioExposureAllocation(holdings);
    const classification = buildSharedClassification(exposure);
    const profile = buildPortfolioHealthProfile({
      holdings,
      goal: goal(),
      hasSavedGoal: true,
      exposure,
    });

    expect(profile.hiddenDrivers.drivers.length).toBeGreaterThan(0);
    expect(profile.hiddenDrivers.drivers.length).toBeLessThanOrEqual(5);
    expect(profile.hiddenDrivers.drivers[0]?.influence).toMatch(/driver|influence/i);
    expect(profile.hiddenDrivers.insight.length).toBeGreaterThan(20);

    const exposureLabels = profile.exposure.slices.map((s) => s.label).sort();
    const driverLabels = profile.hiddenDrivers.drivers.map((d) => d.label).sort();
    // Drivers use influence weighting — labels/order should not be an identical copy.
    expect(driverLabels.join("|")).not.toBe(exposureLabels.join("|"));

    const drivers = buildHiddenDrivers({
      exposure,
      classification,
      cryptoBuckets: { bitcoin: 100, altcoins: 0, stablecoins: 0 },
      crypto: {
        isCryptoOnly: false,
        isCryptoDominant: true,
        bitcoinOfCrypto: 100,
        ethereumOfCrypto: 0,
        largeCapAltOfCrypto: 0,
        speculativeAltOfCrypto: 0,
        stablecoinOfCrypto: 0,
        bitcoinPortfolioWeight: classification.cryptoWeight,
        ethereumPortfolioWeight: 0,
        largeCapAltPortfolioWeight: 0,
        speculativeAltPortfolioWeight: 0,
        stablecoinPortfolioWeight: 0,
        withinCryptoBreadth: "Limited",
        assetClassBreadth: "Multi-asset",
        distinctCryptoCategories: 1,
        largestCryptoAssetShare: 100,
      },
      incomeFocused: false,
    });
    expect(drivers.drivers[0]?.relativeStrength).toBe(1);
  });

  it("exposes dashboard-ready preview fields from the same profile", () => {
    const holdings = [
      holding({
        symbol: "VWCE",
        providerSymbol: "VWCE.XETRA",
        quantity: 50,
        currentPrice: 120,
      }),
    ];

    const profile = buildPortfolioHealthProfile({
      holdings,
      goal: goal(),
      hasSavedGoal: true,
    });

    expect(profile.hero.identity).toBeTruthy();
    expect(profile.expectedVolatility.level).toBeTruthy();
    expect(profile.goalAlignment.label).toBeTruthy();
  });
});
