import { describe, expect, it } from "vitest";

import { selectImportCandidate } from "@/lib/services/import/finalizeImport";
import {
  applyManualListingSelection,
} from "@/lib/client/manualHoldingMatch";
import {
  applySelectedListing,
  buildListingCandidates,
  draftToImportRow,
  importRowToStoredHolding,
  investmentNeedsListingConfirmation,
} from "@/lib/services/instruments/listingConfirmation";
import type { ResolvedInstrument } from "@/lib/types/instrument";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

const VWCE_XETRA: ResolvedInstrument = {
  providerSymbol: "VWCE.XETRA",
  instrumentName: "Vanguard FTSE All-World UCITS ETF",
  exchange: "XETRA",
  isin: "IE00BK5BQT80",
  matchMethod: "isin",
  confidence: 0.98,
  requiresConfirmation: false,
  warnings: [],
};

const VWCE_LSE: ResolvedInstrument = {
  providerSymbol: "VWCE.LSE",
  instrumentName: "Vanguard FTSE All-World UCITS ETF",
  exchange: "LSE",
  isin: "IE00BK5BQT80",
  matchMethod: "isin",
  confidence: 0.9,
  requiresConfirmation: true,
  warnings: ["Multiple listings found."],
  candidates: [],
};

VWCE_LSE.candidates = [VWCE_XETRA, VWCE_LSE];

function draft(
  overrides: Partial<StoredPortfolioHolding> = {},
): StoredPortfolioHolding {
  return {
    id: "draft-1",
    symbol: "VWCE",
    name: "Vanguard FTSE All-World",
    quantity: 10,
    purchasePrice: 100,
    currentPrice: 0,
    currency: "EUR",
    assetType: "investment",
    ...overrides,
  };
}

describe("listingConfirmation", () => {
  it("saves providerSymbol when a listing is selected", () => {
    const selected = applySelectedListing(
      {
        ...draft(),
        matchMethod: undefined,
      },
      VWCE_XETRA,
    );

    expect(selected.providerSymbol).toBe("VWCE.XETRA");
    expect(selected.exchange).toBe("XETRA");
    expect(selected.isin).toBe("IE00BK5BQT80");
    expect(selected.instrumentName).toBe("Vanguard FTSE All-World UCITS ETF");
    expect(selected.symbol).toBe("VWCE");
  });

  it("builds deduplicated candidate listings for ambiguous matches", () => {
    const candidates = buildListingCandidates({
      providerSymbol: VWCE_XETRA.providerSymbol,
      instrumentName: VWCE_XETRA.instrumentName,
      exchange: VWCE_XETRA.exchange,
      isin: VWCE_XETRA.isin,
      matchMethod: VWCE_XETRA.matchMethod,
      matchConfidence: VWCE_XETRA.confidence,
      candidates: VWCE_LSE.candidates,
    });

    expect(candidates).toHaveLength(2);
    expect(candidates.map((item) => item.providerSymbol)).toEqual([
      "VWCE.XETRA",
      "VWCE.LSE",
    ]);
  });

  it("requires listing confirmation when providerSymbol is missing", () => {
    expect(investmentNeedsListingConfirmation(draft())).toBe(true);
    expect(
      investmentNeedsListingConfirmation(
        draft({ providerSymbol: "VWCE.XETRA" }),
      ),
    ).toBe(false);
    expect(
      investmentNeedsListingConfirmation(
        draft({ assetType: "cash", providerSymbol: null }),
      ),
    ).toBe(false);
  });

  it("uses the same confirmation logic for manual add and import", () => {
    const seed = draftToImportRow(draft(), VWCE_LSE.candidates);

    const fromImport = importRowToStoredHolding(
      selectImportCandidate(seed, VWCE_XETRA),
    );
    const fromManual = applyManualListingSelection(draft(), VWCE_XETRA);

    expect(fromManual.providerSymbol).toBe(fromImport.providerSymbol);
    expect(fromManual.exchange).toBe(fromImport.exchange);
    expect(fromManual.isin).toBe(fromImport.isin);
    expect(fromManual.instrumentName).toBe(fromImport.instrumentName);
    expect(fromManual.matchMethod).toBe(fromImport.matchMethod);
  });
});
