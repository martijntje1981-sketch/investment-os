import { describe, expect, it } from "vitest";

import {
  brokerFixtures,
  buxCryptoFixture,
  degiroGermanEtfFixture,
  duplicateRowFixture,
  ibkrUsStockFixture,
  ocrIsinTypoFixture,
  saxoEtcFixture,
  trading212MixedFixture,
} from "@/lib/services/extraction/fixtures/brokerFixtures";
import {
  parseLocaleNumber,
  parsePurchaseDate,
  normalizeCurrencyCode,
} from "@/lib/services/extraction/parseLocaleNumber";
import {
  normalizeInstrumentName,
  repairIsinOcr,
  resolveTickerAndIsin,
} from "@/lib/services/extraction/repairIdentifiers";
import { processRawPortfolioExtraction } from "@/lib/services/extraction";
import {
  getExtractionFieldsNeedingReview,
  EXTRACTION_FIELD_REVIEW_THRESHOLD,
} from "@/lib/services/extraction/fieldConfidence";
import { mapScreenshotHoldingsToImportRows } from "@/lib/services/import/screenshotMapper";

describe("parseLocaleNumber", () => {
  it("parses European decimal commas", () => {
    expect(parseLocaleNumber("12,5", "EUR")).toBe(12.5);
    expect(parseLocaleNumber("1.484,00", "EUR")).toBe(1484);
    expect(parseLocaleNumber("325,18", "EUR")).toBe(325.18);
  });

  it("parses US decimal points", () => {
    expect(parseLocaleNumber("3,214.35", "USD")).toBe(3214.35);
    expect(parseLocaleNumber(214.29)).toBe(214.29);
  });

  it("parses currency-prefixed values", () => {
    expect(parseLocaleNumber("€118,72", "EUR")).toBe(118.72);
  });
});

describe("repairIdentifiers", () => {
  it("repairs common ISIN OCR errors", () => {
    expect(repairIsinOcr("IE00BK5BQT8O")).toBe("IE00BK5BQT80");
  });

  it("moves ISIN-shaped ticker values to ISIN field", () => {
    const resolved = resolveTickerAndIsin("IE00BK5BQT80", null);
    expect(resolved.isin).toBe("IE00BK5BQT80");
    expect(resolved.ticker).toBe("");
  });

  it("normalizes wrapped instrument names", () => {
    expect(normalizeInstrumentName("Apple\nInc")).toBe("Apple Inc");
  });
});

describe("processRawPortfolioExtraction", () => {
  it("normalizes DEGIRO European ETF and cash rows", () => {
    const result = processRawPortfolioExtraction(degiroGermanEtfFixture);

    expect(result.broker).toBe("DEGIRO");
    expect(result.holdings).toHaveLength(2);

    const etf = result.holdings[0];
    expect(etf?.isin).toBe("IE00BK5BQT80");
    expect(etf?.exchange).toBe("XETRA");
    expect(etf?.quantity).toBe(12.5);
    expect(etf?.marketValue).toBe(1484);
    expect(etf?.purchaseDate).toBe("2024-03-14");

    const cash = result.holdings[1];
    expect(cash?.assetType).toBe("cash");
    expect(cash?.quantity).toBe(325.18);
  });

  it("normalizes Interactive Brokers US stock rows", () => {
    const result = processRawPortfolioExtraction(ibkrUsStockFixture);
    const row = result.holdings[0];

    expect(result.broker).toBe("Interactive Brokers");
    expect(row?.ticker).toBe("AAPL");
    expect(row?.exchange).toBe("US");
    expect(row?.currency).toBe("USD");
    expect(row?.marketValue).toBe(3214.35);
  });

  it("filters portfolio total noise from Trading 212 exports", () => {
    const result = processRawPortfolioExtraction(trading212MixedFixture);
    expect(result.holdings).toHaveLength(1);
    expect(result.holdings[0]?.ticker).toBe("SWDA");
    expect(result.holdings[0]?.currentPrice).toBeCloseTo(84.12, 2);
  });

  it("keeps crypto rows as investments", () => {
    const result = processRawPortfolioExtraction(buxCryptoFixture);
    expect(result.holdings[0]?.assetType).toBe("investment");
    expect(result.holdings[0]?.ticker).toBe("BTC");
    expect(result.holdings[0]?.quantity).toBeCloseTo(0.045, 3);
  });

  it("normalizes Saxo ETC rows", () => {
    const result = processRawPortfolioExtraction(saxoEtcFixture);
    expect(result.holdings[0]?.isin).toBe("JE00B783TY65");
    expect(result.holdings[0]?.purchaseDate).toBe("2023-09-05");
  });

  it("deduplicates repeated OCR rows", () => {
    const result = processRawPortfolioExtraction(duplicateRowFixture);
    expect(result.holdings).toHaveLength(1);
  });

  it("derives current price when only market value is visible", () => {
    const result = processRawPortfolioExtraction({
      broker: "Trading 212",
      holdings: [
        {
          ...trading212MixedFixture.holdings[0],
          currentPrice: null,
          marketValue: 711.01,
          quantity: 8.456789,
        },
      ],
    });

    expect(result.holdings[0]?.currentPrice).toBeCloseTo(84.08, 1);
  });
});

describe("field-level extraction review", () => {
  it("flags only uncertain fields for editing", () => {
    const processed = processRawPortfolioExtraction(ocrIsinTypoFixture);
    const rows = mapScreenshotHoldingsToImportRows(
      processed.holdings.map((holding) => ({
        ...holding,
        matchConfidence: 0.99,
        providerSymbol: "VWCE.XETRA",
        matchMethod: "isin" as const,
        requiresConfirmation: false,
      })),
    );

    const fields = getExtractionFieldsNeedingReview(rows[0]!);
    expect(fields).toContain("isin");
    expect(fields).not.toContain("quantity");
  });

  it("covers all broker fixture families", () => {
    for (const fixture of Object.values(brokerFixtures)) {
      const result = processRawPortfolioExtraction(fixture);
      expect(result.holdings.length).toBeGreaterThan(0);
      for (const holding of result.holdings) {
        expect(holding.quantity).toBeGreaterThan(0);
        expect(holding.extractionConfidence).toBeGreaterThan(0);
        expect(holding.extractionConfidence).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe("parsePurchaseDate", () => {
  it("normalizes European and ISO dates", () => {
    expect(parsePurchaseDate("14.03.2024")).toBe("2024-03-14");
    expect(parsePurchaseDate("2024-11-02")).toBe("2024-11-02");
    expect(parsePurchaseDate("05/09/2023")).toBe("2023-09-05");
  });
});

describe("normalizeCurrencyCode", () => {
  it("maps symbols to ISO codes", () => {
    expect(normalizeCurrencyCode("€")).toBe("EUR");
    expect(normalizeCurrencyCode("usd")).toBe("USD");
  });
});

describe("EXTRACTION_FIELD_REVIEW_THRESHOLD", () => {
  it("is high enough to avoid unnecessary edits", () => {
    expect(EXTRACTION_FIELD_REVIEW_THRESHOLD).toBeGreaterThanOrEqual(0.8);
  });
});
