import { describe, expect, it } from "vitest";

import { normalizeExtractedHolding } from "@/lib/services/extraction/normalizeExtracted";
import { parseLocaleNumber } from "@/lib/services/extraction/parseLocaleNumber";
import { mapScreenshotHoldingToImportRow } from "@/lib/services/import/screenshotMapper";
import { finalizeImportRowForSave } from "@/lib/services/import/finalizeImport";
import { sanitizeLocalHoldings } from "@/lib/services/portfolio/mappers";
import { getHoldingMarketValue } from "@/lib/client/portfolioAnalysis";

const IB1T_PRICE = 5.477;

describe("IB1T Dutch quantity pipeline trace", () => {
  it("shows where 11.269 becomes 11.269 instead of 11269", () => {
    const stringParsed = parseLocaleNumber("11.269", "EUR");
    const numberParsed = parseLocaleNumber(11.269, "EUR");

    expect(stringParsed).toBe(11269);
    expect(numberParsed).toBe(11.269);

    const normalizedFromNumber = normalizeExtractedHolding({
      name: "iShares Bitcoin ETP",
      ticker: "IB1T",
      isin: null,
      exchange: "XETRA",
      assetType: "investment",
      quantity: 11.269,
      purchasePrice: 6.97,
      currentPrice: IB1T_PRICE,
      marketValue: 11269 * IB1T_PRICE,
      purchaseDate: null,
      currency: "EUR",
      fieldConfidence: {
        name: 0.95,
        isin: 0.5,
        ticker: 0.95,
        exchange: 0.9,
        quantity: 0.95,
        purchasePrice: 0.9,
        currentPrice: 0.95,
        marketValue: 0.95,
        purchaseDate: 0.5,
        currency: 0.95,
      },
      warnings: [],
    })!;

    const normalizedFromString = normalizeExtractedHolding({
      name: "iShares Bitcoin ETP",
      ticker: "IB1T",
      isin: null,
      exchange: "XETRA",
      assetType: "investment",
      quantity: "11.269",
      purchasePrice: 6.97,
      currentPrice: IB1T_PRICE,
      marketValue: 11269 * IB1T_PRICE,
      purchaseDate: null,
      currency: "EUR",
      fieldConfidence: {
        name: 0.95,
        isin: 0.5,
        ticker: 0.95,
        exchange: 0.9,
        quantity: 0.95,
        purchasePrice: 0.9,
        currentPrice: 0.95,
        marketValue: 0.95,
        purchaseDate: 0.5,
        currency: 0.95,
      },
      warnings: [],
    })!;

    expect(normalizedFromNumber.quantity).toBe(11.269);
    expect(normalizedFromString.quantity).toBe(11269);

    const importRow = mapScreenshotHoldingToImportRow({
      ...normalizedFromNumber,
      providerSymbol: "IB1T.XETRA",
      matchMethod: "manual",
      requiresConfirmation: false,
    });

    expect(importRow.quantity).toBe(11.269);

    const beforeImport = finalizeImportRowForSave({
      ...importRow,
      reviewTier: "auto",
      userConfirmed: true,
    });

    expect(beforeImport.quantity).toBe(11.269);

    const apiPayload = sanitizeLocalHoldings([beforeImport]);
    expect(apiPayload[0]?.quantity).toBe(11.269);

    const valuation = getHoldingMarketValue({
      ...beforeImport,
      currentPrice: IB1T_PRICE,
    });

    expect(valuation).toBeCloseTo(61.72, 1);
    expect(valuation! / IB1T_PRICE).toBeCloseTo(11.269, 3);

    const expectedValue = 11269 * IB1T_PRICE;
    expect(valuation!).toBeLessThan(expectedValue / 1000);
  });
});
