/**
 * Deterministic example portfolio templates.
 * Seed structure only — live quotes come from existing price providers.
 */

import type { GoalSettings, StoredPortfolioHolding } from "@/lib/types/portfolioStorage";
import type { ExamplePortfolioTemplate } from "@/lib/services/examplePortfolio/types";

export const EXAMPLE_HOLDING_ID_PREFIX = "example-";

function holding(
  partial: Omit<StoredPortfolioHolding, "currency"> & { currency?: "EUR" },
): StoredPortfolioHolding {
  return {
    currency: "EUR",
    ...partial,
  };
}

/** Approx EUR 100k Global Investor book. */
export function buildGlobalExampleHoldings(
  nowIso = new Date().toISOString(),
): StoredPortfolioHolding[] {
  return [
    holding({
      id: "example-global-vwce",
      symbol: "VWCE",
      name: "Vanguard FTSE All-World UCITS ETF",
      quantity: 333.33,
      purchasePrice: 120,
      currentPrice: 120,
      assetType: "investment",
      exchange: "XETRA",
      providerSymbol: "VWCE.XETRA",
      quoteCurrency: "EUR",
      createdAt: nowIso,
      updatedAt: nowIso,
    }),
    holding({
      id: "example-global-cspx",
      symbol: "CSPX",
      name: "iShares Core S&P 500 UCITS ETF",
      quantity: 36.36,
      purchasePrice: 550,
      currentPrice: 550,
      assetType: "investment",
      exchange: "LSE",
      providerSymbol: "CSPX.LSE",
      quoteCurrency: "USD",
      createdAt: nowIso,
      updatedAt: nowIso,
    }),
    holding({
      id: "example-global-aifs",
      symbol: "AIFS",
      name: "Global X Artificial Intelligence UCITS ETF",
      quantity: 400,
      purchasePrice: 25,
      currentPrice: 25,
      assetType: "investment",
      exchange: "XETRA",
      providerSymbol: "AIFS.XETRA",
      quoteCurrency: "EUR",
      createdAt: nowIso,
      updatedAt: nowIso,
    }),
    holding({
      id: "example-global-btc",
      symbol: "BTC",
      name: "Bitcoin",
      quantity: 0.1579,
      purchasePrice: 95_000,
      currentPrice: 95_000,
      assetType: "crypto",
      providerSymbol: "BTC-EUR.CC",
      tradingPair: "BTC-EUR",
      pairCurrency: "EUR",
      portfolioCurrency: "EUR",
      createdAt: nowIso,
      updatedAt: nowIso,
    }),
    holding({
      id: "example-global-ppfb",
      symbol: "PPFB",
      name: "WisdomTree Physical Gold",
      quantity: 142.86,
      purchasePrice: 70,
      currentPrice: 70,
      assetType: "investment",
      exchange: "XETRA",
      providerSymbol: "PPFB.XETRA",
      quoteCurrency: "EUR",
      createdAt: nowIso,
      updatedAt: nowIso,
    }),
    holding({
      id: "example-global-cash",
      symbol: "EUR",
      name: "Euro cash",
      quantity: 5000,
      purchasePrice: 1,
      currentPrice: 1,
      assetType: "cash",
      createdAt: nowIso,
      updatedAt: nowIso,
    }),
  ];
}

export function buildGlobalExampleGoal(): GoalSettings {
  return {
    targetValue: 250_000,
    targetYear: 2038,
    monthlyContribution: 750,
    expectedAnnualReturn: 7,
  };
}

/** Income-focused book using instruments already recognized in-app. */
export function buildIncomeExampleHoldings(
  nowIso = new Date().toISOString(),
): StoredPortfolioHolding[] {
  return [
    holding({
      id: "example-income-vhyl",
      symbol: "VHYL",
      name: "Vanguard FTSE All-World High Dividend Yield UCITS ETF",
      quantity: 400,
      purchasePrice: 60,
      currentPrice: 60,
      assetType: "investment",
      exchange: "XETRA",
      providerSymbol: "VHYL.XETRA",
      quoteCurrency: "EUR",
      distributionPolicyUserOverride: "distributing",
      createdAt: nowIso,
      updatedAt: nowIso,
    }),
    holding({
      id: "example-income-vwce",
      symbol: "VWCE",
      name: "Vanguard FTSE All-World UCITS ETF",
      quantity: 166.67,
      purchasePrice: 120,
      currentPrice: 120,
      assetType: "investment",
      exchange: "XETRA",
      providerSymbol: "VWCE.XETRA",
      quoteCurrency: "EUR",
      createdAt: nowIso,
      updatedAt: nowIso,
    }),
    holding({
      id: "example-income-strc",
      symbol: "STRC",
      name: "VanEck Morningstar Developed Markets Dividend Leaders",
      quantity: 250,
      purchasePrice: 40,
      currentPrice: 40,
      assetType: "investment",
      exchange: "AS",
      providerSymbol: "STRC.AS",
      quoteCurrency: "EUR",
      distributionPolicyUserOverride: "distributing",
      createdAt: nowIso,
      updatedAt: nowIso,
    }),
    holding({
      id: "example-income-cash",
      symbol: "EUR",
      name: "Euro cash",
      quantity: 12_000,
      purchasePrice: 1,
      currentPrice: 1,
      assetType: "cash",
      createdAt: nowIso,
      updatedAt: nowIso,
    }),
  ];
}

export function buildIncomeExampleGoal(): GoalSettings {
  return {
    targetValue: 180_000,
    targetYear: 2035,
    monthlyContribution: 600,
    expectedAnnualReturn: 5.5,
    passiveIncomeTarget: 6000,
  };
}

export function buildExampleHoldings(
  template: ExamplePortfolioTemplate,
  nowIso = new Date().toISOString(),
): StoredPortfolioHolding[] {
  return template === "income"
    ? buildIncomeExampleHoldings(nowIso)
    : buildGlobalExampleHoldings(nowIso);
}

export function buildExampleGoal(
  template: ExamplePortfolioTemplate,
): GoalSettings {
  return template === "income"
    ? buildIncomeExampleGoal()
    : buildGlobalExampleGoal();
}

export function hasExampleSeedHoldings(
  holdings: Array<{ id?: string }>,
): boolean {
  return holdings.some((row) =>
    String(row.id ?? "").startsWith(EXAMPLE_HOLDING_ID_PREFIX),
  );
}
