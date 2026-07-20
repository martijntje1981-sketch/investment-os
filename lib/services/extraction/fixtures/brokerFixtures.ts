/**
 * Representative raw vision-model outputs for broker screenshot tests.
 * These simulate OCR responses before normalization — not live API calls.
 */

import type { RawPortfolioExtraction } from "@/lib/services/extraction/types";

const fullConfidence = {
  name: 0.98,
  isin: 0.98,
  ticker: 0.98,
  exchange: 0.95,
  quantity: 0.98,
  purchasePrice: 0.9,
  currentPrice: 0.95,
  marketValue: 0.95,
  purchaseDate: 0.85,
  currency: 0.99,
};

export const degiroGermanEtfFixture: RawPortfolioExtraction = {
  broker: "DEGIRO",
  holdings: [
    {
      name: "Vanguard FTSE All-World UCITS ETF USD Acc",
      ticker: "VWCE",
      isin: "IE00BK5BQT80",
      exchange: "XETR",
      assetType: "investment",
      quantity: "12,5",
      purchasePrice: "98,40",
      currentPrice: "118,72",
      marketValue: "1.484,00",
      purchaseDate: "14.03.2024",
      currency: "EUR",
      fieldConfidence: fullConfidence,
      warnings: [],
    },
    {
      name: "EUR Cash",
      ticker: "EUR",
      isin: null,
      exchange: null,
      assetType: "cash",
      quantity: "325,18",
      purchasePrice: null,
      currentPrice: null,
      marketValue: "325,18",
      purchaseDate: null,
      currency: "EUR",
      fieldConfidence: {
        ...fullConfidence,
        isin: 0,
        ticker: 0.9,
        exchange: 0,
        purchasePrice: 0,
        purchaseDate: 0,
      },
      warnings: [],
    },
  ],
};

export const ibkrUsStockFixture: RawPortfolioExtraction = {
  broker: "Interactive Brokers",
  holdings: [
    {
      name: "APPLE INC",
      ticker: "AAPL",
      isin: "US0378331005",
      exchange: "NASDAQ",
      assetType: "investment",
      quantity: 15,
      purchasePrice: 172.5,
      currentPrice: 214.29,
      marketValue: 3214.35,
      purchaseDate: "2024-11-02",
      currency: "USD",
      fieldConfidence: fullConfidence,
      warnings: [],
    },
  ],
};

export const trading212MixedFixture: RawPortfolioExtraction = {
  broker: "Trading 212",
  holdings: [
    {
      name: "iShares Core MSCI World UCITS ETF",
      ticker: "SWDA",
      isin: "IE00B4L5Y983",
      exchange: "LSE",
      assetType: "investment",
      quantity: 8.456789,
      purchasePrice: null,
      currentPrice: 84.12,
      marketValue: 711.01,
      purchaseDate: null,
      currency: "GBP",
      fieldConfidence: {
        ...fullConfidence,
        purchasePrice: 0,
        purchaseDate: 0,
      },
      warnings: ["Average purchase price not visible."],
    },
    {
      name: "Portfolio value",
      ticker: "TOTAL",
      isin: null,
      exchange: null,
      assetType: "investment",
      quantity: 1,
      purchasePrice: null,
      currentPrice: null,
      marketValue: 711.01,
      purchaseDate: null,
      currency: "GBP",
      fieldConfidence: fullConfidence,
      warnings: [],
    },
  ],
};

export const buxCryptoFixture: RawPortfolioExtraction = {
  broker: "BUX",
  holdings: [
    {
      name: "Bitcoin",
      ticker: "BTC",
      isin: null,
      exchange: null,
      assetType: "crypto",
      quantity: "0,045",
      purchasePrice: "52.100,00",
      currentPrice: "67.842,15",
      marketValue: "3.052,90",
      purchaseDate: null,
      currency: "EUR",
      fieldConfidence: {
        ...fullConfidence,
        isin: 0,
        exchange: 0,
      },
      warnings: [],
    },
  ],
};

export const saxoEtcFixture: RawPortfolioExtraction = {
  broker: "Saxo Bank",
  holdings: [
    {
      name: "WisdomTree Brent Crude Oil ETC",
      ticker: "BRNT",
      isin: "JE00B783TY65",
      exchange: "LSE",
      assetType: "investment",
      quantity: 120,
      purchasePrice: 6.45,
      currentPrice: 7.02,
      marketValue: 842.4,
      purchaseDate: "05/09/2023",
      currency: "USD",
      fieldConfidence: fullConfidence,
      warnings: [],
    },
  ],
};

export const ocrIsinTypoFixture: RawPortfolioExtraction = {
  broker: "DEGIRO",
  holdings: [
    {
      name: "Vanguard FTSE All-World UCITS ETF USD Acc",
      ticker: "",
      isin: "IE00BK5BQT8O",
      exchange: "XETRA",
      assetType: "investment",
      quantity: 3,
      purchasePrice: 100,
      currentPrice: 118,
      marketValue: 354,
      purchaseDate: null,
      currency: "EUR",
      fieldConfidence: {
        ...fullConfidence,
        isin: 0.72,
      },
      warnings: ["ISIN may contain OCR error."],
    },
  ],
};

export const duplicateRowFixture: RawPortfolioExtraction = {
  broker: "DEGIRO",
  holdings: [
    {
      name: "ASML Holding NV",
      ticker: "ASML",
      isin: "NL0010273215",
      exchange: "AMS",
      assetType: "investment",
      quantity: 4,
      purchasePrice: 620,
      currentPrice: 890,
      marketValue: 3560,
      purchaseDate: null,
      currency: "EUR",
      fieldConfidence: fullConfidence,
      warnings: [],
    },
    {
      name: "ASML Holding NV",
      ticker: "ASML",
      isin: "NL0010273215",
      exchange: "AMS",
      assetType: "investment",
      quantity: 4,
      purchasePrice: 620,
      currentPrice: 890,
      marketValue: 3560,
      purchaseDate: null,
      currency: "EUR",
      fieldConfidence: fullConfidence,
      warnings: [],
    },
  ],
};

export const brokerFixtures = {
  degiroGermanEtfFixture,
  ibkrUsStockFixture,
  trading212MixedFixture,
  buxCryptoFixture,
  saxoEtcFixture,
  ocrIsinTypoFixture,
  duplicateRowFixture,
};
