import { describe, expect, it } from "vitest";

import {
  buildHoldingVenuePresentation,
  LIVE_PRICING_AUTO_SELECTED_COPY,
  MANUAL_PRICING_SELECTION_TITLE,
  needsManualPricingSelection,
  resolveLivePricingExchangeCode,
} from "@/lib/client/holdingVenuePresentation";
import { applyResolvedToHolding } from "@/lib/services/instruments/applyResolved";
import {
  applySelectedListing,
  draftToImportRow,
  importRowToStoredHolding,
} from "@/lib/services/instruments/listingConfirmation";
import { applyManualListingSelection } from "@/lib/client/manualHoldingMatch";
import { verifiedEntryToResolved } from "@/lib/services/instruments/verifiedInstrumentRegistry";
import type { ResolvedInstrument } from "@/lib/types/instrument";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function ppfbTradegateDraft(
  overrides: Partial<StoredPortfolioHolding> = {},
): StoredPortfolioHolding {
  return {
    id: "ppfb-draft",
    symbol: "PPFB",
    name: "WisdomTree Physical Gold",
    quantity: 1,
    purchasePrice: 100,
    currentPrice: 100,
    currency: "EUR",
    assetType: "investment",
    exchange: "TDG",
    ...overrides,
  };
}

const xetraPricingListing: ResolvedInstrument = {
  providerSymbol: "PPFB.XETRA",
  instrumentName: "WisdomTree Physical Gold",
  exchange: "XETRA",
  isin: "JE00B1VS3770",
  quoteCurrency: "EUR",
  matchMethod: "isin",
  confidence: 0.9,
  requiresConfirmation: true,
  warnings: [],
};

describe("PPFB Tradegate purchase vs Xetra live pricing", () => {
  it("keeps Tradegate as purchase exchange when applying Xetra pricing listing", () => {
    const applied = applyResolvedToHolding(
      {
        ...ppfbTradegateDraft(),
        pricingExchange: null,
        providerSymbol: null,
      },
      xetraPricingListing,
    );

    expect(applied.exchange).toBe("TDG");
    expect(applied.pricingExchange).toBe("XETRA");
    expect(applied.providerSymbol).toBe("PPFB.XETRA");
  });

  it("presents Tradegate as purchase venue and Xetra as live pricing only", () => {
    const venue = buildHoldingVenuePresentation({
      exchange: "TDG",
      pricingExchange: "XETRA",
      providerSymbol: "PPFB.XETRA",
      instrumentName: "WisdomTree Physical Gold",
      confirmationSource: "verified_mapping",
    });

    expect(venue.purchaseExchangeLabel).toBe("Tradegate");
    expect(venue.pricingExchangeLabel).toBe("Xetra");
    expect(venue.providerSymbol).toBe("PPFB.XETRA");
    expect(venue.purchaseExchangeCode).toBe("TDG");
    expect(venue.pricingExchangeCode).toBe("XETRA");
    expect(venue.autoSelectedPricing).toBe(true);
    expect(venue.needsManualPricingSelection).toBe(false);
    expect(LIVE_PRICING_AUTO_SELECTED_COPY).toMatch(/Automatically selected/i);
  });

  it("does not treat Xetra as the purchase exchange in presentation", () => {
    const venue = buildHoldingVenuePresentation({
      exchange: "TDG",
      pricingExchange: "XETRA",
      providerSymbol: "PPFB.XETRA",
    });

    expect(venue.purchaseExchangeLabel).not.toBe("Xetra");
    expect(venue.purchaseExchangeCode).not.toBe("XETRA");
    expect(venue.pricingExchangeLabel).toBe("Xetra");
  });

  it("auto-selects deterministic verified alternate pricing without a listing picker", () => {
    const resolved = verifiedEntryToResolved(
      {
        ticker: "4COP",
        exchange: "XETRA",
        providerSymbol: "4COP.XETRA",
        instrumentName: "Global X Copper Miners UCITS ETF",
        isin: "IE00BMDK7554",
        quoteCurrency: "EUR",
        purchaseExchangeAliases: ["TDG"],
      },
      "ticker_exchange",
      { purchaseExchange: "TDG" },
    );

    expect(resolved.exchange).toBe("TDG");
    expect(resolved.pricingExchange).toBe("XETRA");
    expect(resolved.providerSymbol).toBe("4COP.XETRA");
    expect(resolved.confirmationSource).toBe("verified_mapping");

    const applied = applyResolvedToHolding(
      {
        symbol: "4COP",
        name: "",
        exchange: "TDG",
        pricingExchange: null as string | null,
        providerSymbol: null as string | null,
      },
      resolved,
    );

    expect(applied.exchange).toBe("TDG");
    expect(applied.pricingExchange).toBe("XETRA");
    expect(applied.providerSymbol).toBe("4COP.XETRA");
    expect(
      needsManualPricingSelection({
        providerSymbol: applied.providerSymbol,
        candidates: [],
      }),
    ).toBe(false);
  });

  it("hides the listing selector when a deterministic provider symbol exists", () => {
    expect(
      needsManualPricingSelection({
        providerSymbol: "PPFB.XETRA",
        candidates: [xetraPricingListing],
      }),
    ).toBe(false);
  });

  it("still allows manual pricing selection when unresolved candidates remain", () => {
    expect(
      needsManualPricingSelection({
        providerSymbol: null,
        candidates: [
          xetraPricingListing,
          {
            ...xetraPricingListing,
            providerSymbol: "PPFB.F",
            exchange: "F",
          },
        ],
      }),
    ).toBe(true);
    expect(MANUAL_PRICING_SELECTION_TITLE).toMatch(/market prices/i);
  });

  it("persists TDG / XETRA / PPFB.XETRA after manual pricing selection", () => {
    const saved = applyManualListingSelection(
      ppfbTradegateDraft(),
      xetraPricingListing,
    );

    expect(saved.exchange).toBe("TDG");
    expect(saved.pricingExchange).toBe("XETRA");
    expect(saved.providerSymbol).toBe("PPFB.XETRA");
  });

  it("round-trips purchase and pricing exchanges through draft import mapping", () => {
    const draft = ppfbTradegateDraft({
      pricingExchange: "XETRA",
      providerSymbol: "PPFB.XETRA",
      confirmationSource: "verified_mapping",
    });

    const roundTripped = importRowToStoredHolding(draftToImportRow(draft));

    expect(roundTripped.exchange).toBe("TDG");
    expect(roundTripped.pricingExchange).toBe("XETRA");
    expect(roundTripped.providerSymbol).toBe("PPFB.XETRA");
  });

  it("edit-flow presentation keeps Tradegate and Xetra separate", () => {
    const existing = ppfbTradegateDraft({
      pricingExchange: "XETRA",
      providerSymbol: "PPFB.XETRA",
      confirmationSource: "verified_mapping",
    });

    const venue = buildHoldingVenuePresentation(existing);

    expect(venue.purchaseExchangeLabel).toBe("Tradegate");
    expect(venue.pricingExchangeLabel).toBe("Xetra");
    expect(venue.providerSymbol).toBe("PPFB.XETRA");
    expect(venue.needsManualPricingSelection).toBe(false);
  });

  it("resolves live pricing exchange from provider symbol when needed", () => {
    expect(
      resolveLivePricingExchangeCode({
        exchange: "TDG",
        pricingExchange: null,
        providerSymbol: "PPFB.XETRA",
      }),
    ).toBe("XETRA");
  });

  it("applySelectedListing preserves purchase venue for alternate pricing listings", () => {
    const next = applySelectedListing(
      {
        symbol: "PPFB",
        name: "WisdomTree Physical Gold",
        exchange: "TDG",
        pricingExchange: null as string | null,
        providerSymbol: null as string | null,
      },
      xetraPricingListing,
    );
    expect(next.exchange).toBe("TDG");
    expect(next.pricingExchange).toBe("XETRA");
    expect(next.providerSymbol).toBe("PPFB.XETRA");
  });
});
