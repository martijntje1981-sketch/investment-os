import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

import { buildCryptoIntelligenceProfile } from "@/lib/services/cryptoIntelligence";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function holding(
  overrides: Partial<StoredPortfolioHolding> &
    Pick<StoredPortfolioHolding, "symbol">,
): StoredPortfolioHolding {
  return {
    id: `${overrides.symbol}-id`,
    name: overrides.symbol,
    quantity: 1,
    purchasePrice: 100,
    currentPrice: 100,
    currency: "EUR",
    assetType: "crypto",
    ...overrides,
  };
}

describe("buildCryptoIntelligenceProfile", () => {
  it("returns none when there is no crypto", () => {
    const profile = buildCryptoIntelligenceProfile([
      holding({
        symbol: "VWCE",
        assetType: "investment",
        currentPrice: 100,
        quantity: 10,
      }),
    ]);
    expect(profile.hasCrypto).toBe(false);
    expect(profile.hasMaterialCrypto).toBe(false);
    expect(profile.portfolioShape).toBe("none");
    expect(profile.conclusions).toEqual([]);
  });

  it("classifies bitcoin-only books", () => {
    const profile = buildCryptoIntelligenceProfile([
      holding({
        symbol: "BTC",
        name: "Bitcoin",
        assetType: "crypto",
        currentPrice: 50_000,
        quantity: 1,
        change24hAmount: 500,
        change24hPercent: 1,
      }),
    ]);
    expect(profile.portfolioShape).toBe("bitcoin_only");
    expect(profile.bitcoinOfCryptoPercent).toBe(100);
    expect(profile.conclusions[0]?.text).toMatch(/Bitcoin drives 100%/);
  });

  it("classifies btc + eth sleeves", () => {
    const profile = buildCryptoIntelligenceProfile([
      holding({
        symbol: "BTC",
        name: "Bitcoin",
        currentPrice: 45_000,
        quantity: 1,
      }),
      holding({
        symbol: "ETH",
        name: "Ethereum",
        currentPrice: 35_000,
        quantity: 1,
      }),
    ]);
    expect(profile.portfolioShape).toBe("btc_eth");
    expect(profile.ethereumOfCryptoPercent).toBeCloseTo(43.75, 2);
  });

  it("classifies alt-dominant crypto books", () => {
    const profile = buildCryptoIntelligenceProfile([
      holding({
        symbol: "BTC",
        name: "Bitcoin",
        currentPrice: 10_000,
        quantity: 1,
      }),
      holding({
        symbol: "SOL",
        name: "Solana",
        currentPrice: 40_000,
        quantity: 1,
      }),
      holding({
        symbol: "SHIB",
        name: "Shiba Inu",
        currentPrice: 20_000,
        quantity: 1,
      }),
    ]);
    expect(profile.portfolioShape).toBe("alt_dominant");
    expect(profile.otherOfCryptoPercent).toBeGreaterThan(55);
  });

  it("marks mixed portfolios with material crypto", () => {
    const profile = buildCryptoIntelligenceProfile([
      holding({
        symbol: "VWCE",
        assetType: "investment",
        currentPrice: 80_000,
        quantity: 1,
      }),
      holding({
        symbol: "BTC",
        name: "Bitcoin",
        currentPrice: 20_000,
        quantity: 1,
        change24hAmount: 200,
        change24hPercent: 1,
      }),
    ]);
    expect(profile.hasMaterialCrypto).toBe(true);
    expect(profile.portfolioShape).toBe("bitcoin_dominant");
    expect(profile.cryptoPortfolioWeightPercent).toBe(20);
  });

  it("includes reliably named Bitcoin ETP exposure", () => {
    const profile = buildCryptoIntelligenceProfile([
      holding({
        symbol: "IB1T",
        name: "iShares Bitcoin ETP",
        assetType: "investment",
        providerSymbol: "IB1T.XETRA",
        currentPrice: 40,
        quantity: 100,
      }),
    ]);
    expect(profile.hasCrypto).toBe(true);
    expect(profile.bitcoinValue).toBe(4000);
    expect(profile.etpOrNamedExposureCount).toBe(1);
  });

  it("marks missing move data without inventing weekly/monthly pulse", () => {
    const profile = buildCryptoIntelligenceProfile([
      holding({
        symbol: "BTC",
        name: "Bitcoin",
        currentPrice: 50_000,
        quantity: 1,
      }),
    ]);
    expect(profile.pulse.daily.available).toBe(false);
    expect(profile.pulse.weekly.available).toBe(false);
    expect(profile.pulse.monthly.available).toBe(false);
    expect(profile.cryptoContributionPp).toBeNull();
  });

  it("estimates crypto contribution when 24h move amounts exist", () => {
    const profile = buildCryptoIntelligenceProfile([
      holding({
        symbol: "VWCE",
        assetType: "investment",
        currentPrice: 90_000,
        quantity: 1,
        changePercent: 0,
      }),
      holding({
        symbol: "BTC",
        name: "Bitcoin",
        currentPrice: 10_000,
        quantity: 1,
        change24hAmount: 600,
        change24hPercent: 6,
      }),
    ]);
    expect(profile.cryptoContributionPp).not.toBeNull();
    expect(profile.cryptoContributionPp!).toBeGreaterThan(0.4);
    expect(profile.conclusions.some((c) => c.id === "crypto-contribution")).toBe(
      true,
    );
  });
});

describe("Crypto Intelligence Analysis wiring", () => {
  it("mounts CryptoIntelligenceSection on Analysis for material crypto", () => {
    const analysis = readFileSync(
      path.resolve(
        process.cwd(),
        "components/analysis/PortfolioAnalysisPage.tsx",
      ),
      "utf8",
    );
    expect(analysis).toContain("CryptoIntelligenceSection");
    expect(analysis).toContain(
      "<CryptoIntelligenceSection holdings={holdings} userSub={userSub} />",
    );
  });
});
