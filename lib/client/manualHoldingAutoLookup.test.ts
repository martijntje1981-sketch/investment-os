import { describe, expect, it } from "vitest";

import { applyManualListingSelection } from "@/lib/client/manualHoldingMatch";
import {
  canPreselectSingleListing,
  filterListingsBySuppliedIsin,
  listingConflictsSuppliedIsin,
  resolveAutoListingDecision,
  shouldTriggerManualListingAutoLookup,
} from "@/lib/client/manualHoldingAutoLookup";
import type { ResolvedInstrument } from "@/lib/types/instrument";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function listing(
  overrides: Partial<ResolvedInstrument> &
    Pick<ResolvedInstrument, "providerSymbol" | "exchange">,
): ResolvedInstrument {
  return {
    instrumentName: overrides.instrumentName ?? "Vanguard FTSE All-World",
    isin: overrides.isin ?? "IE00BK5BQT80",
    matchMethod: overrides.matchMethod ?? "ticker_exchange",
    confidence: overrides.confidence ?? 0.92,
    requiresConfirmation: overrides.requiresConfirmation ?? false,
    warnings: overrides.warnings ?? [],
    quoteCurrency: overrides.quoteCurrency ?? "EUR",
    pricingExchange: overrides.pricingExchange ?? overrides.exchange,
    ...overrides,
  };
}

function holding(
  overrides: Partial<StoredPortfolioHolding> = {},
): StoredPortfolioHolding {
  return {
    id: "h1",
    symbol: "VWCE",
    name: "",
    quantity: 1,
    purchasePrice: 0,
    currentPrice: 0,
    currency: "EUR",
    assetType: "investment",
    isin: null,
    providerSymbol: null,
    ...overrides,
  };
}

describe("manual holding auto listing discovery", () => {
  it("D. triggers from stable ticker or name input", () => {
    expect(
      shouldTriggerManualListingAutoLookup({
        assetType: "investment",
        symbol: "VWCE",
        name: "",
        isin: null,
        providerSymbol: null,
      }),
    ).toBe(true);
    expect(
      shouldTriggerManualListingAutoLookup({
        assetType: "investment",
        symbol: "",
        name: "Vanguard",
        isin: null,
        providerSymbol: null,
      }),
    ).toBe(true);
    expect(
      shouldTriggerManualListingAutoLookup({
        assetType: "investment",
        symbol: "N",
        name: "",
        isin: null,
        providerSymbol: null,
      }),
    ).toBe(false);
    expect(
      shouldTriggerManualListingAutoLookup({
        assetType: "cash",
        symbol: "EUR",
        name: "Cash",
        providerSymbol: null,
      }),
    ).toBe(false);
    expect(
      shouldTriggerManualListingAutoLookup({
        assetType: "investment",
        symbol: "VWCE",
        name: "",
        providerSymbol: "VWCE.XETRA",
      }),
    ).toBe(false);
  });

  it("E. one high-confidence listing can be preselected", () => {
    const candidates = [
      listing({
        providerSymbol: "VWCE.XETRA",
        exchange: "XETRA",
        quoteCurrency: "EUR",
        confidence: 0.92,
        matchMethod: "ticker_exchange",
      }),
    ];
    expect(canPreselectSingleListing(candidates)).toBe(true);

    expect(
      canPreselectSingleListing([
        listing({
          providerSymbol: "0NRE.LSE",
          exchange: "LSE",
          quoteCurrency: "EUR",
          confidence: 0.55,
          matchMethod: "ticker_exchange",
        }),
      ]),
    ).toBe(false);

    const decision = resolveAutoListingDecision(
      {
        holding: holding(),
        candidates,
        warnings: [],
        quotaUnavailable: false,
      },
      null,
    );
    expect(decision.kind).toBe("preselect");
    expect(decision.holding.providerSymbol).toBe("VWCE.XETRA");
    expect(decision.holding.exchange).toBe("XETRA");
  });

  it("F. ambiguous matches still require selection", () => {
    const candidates = [
      listing({
        providerSymbol: "VWCE.XETRA",
        exchange: "XETRA",
        quoteCurrency: "EUR",
      }),
      listing({
        providerSymbol: "VWCE.US",
        exchange: "US",
        quoteCurrency: "USD",
        isin: "IE00BK5BQT80",
      }),
    ];
    expect(canPreselectSingleListing(candidates)).toBe(false);

    const decision = resolveAutoListingDecision(
      {
        holding: holding({ providerSymbol: "VWCE.XETRA", exchange: "XETRA" }),
        candidates,
        warnings: [],
        quotaUnavailable: false,
      },
      null,
    );
    expect(decision.kind).toBe("choose");
    expect(decision.holding.providerSymbol).toBeNull();
    expect(decision.candidates).toHaveLength(2);
  });

  it("G. supplied ISIN filters conflicting ISIN results", () => {
    const supplied = "IE00BK5BQT80";
    const mixed = [
      listing({
        providerSymbol: "VWCE.XETRA",
        exchange: "XETRA",
        isin: "IE00BK5BQT80",
      }),
      listing({
        providerSymbol: "SPY.US",
        exchange: "US",
        isin: "US78462F1030",
        quoteCurrency: "USD",
      }),
      listing({
        providerSymbol: "VWCE.LSE",
        exchange: "LSE",
        isin: null,
        quoteCurrency: "GBP",
      }),
    ];

    expect(listingConflictsSuppliedIsin(mixed[1]!, supplied)).toBe(true);
    expect(listingConflictsSuppliedIsin(mixed[2]!, supplied)).toBe(false);

    const filtered = filterListingsBySuppliedIsin(mixed, supplied);
    expect(filtered.map((row) => row.providerSymbol)).toEqual([
      "VWCE.XETRA",
      "VWCE.LSE",
    ]);

    const decision = resolveAutoListingDecision(
      {
        holding: holding({ isin: supplied }),
        candidates: mixed,
        warnings: [],
        quotaUnavailable: false,
      },
      supplied,
    );
    expect(decision.candidates.every((row) => row.isin !== "US78462F1030")).toBe(
      true,
    );
  });

  it("does not merge venues on a bare ticker", () => {
    const decision = resolveAutoListingDecision(
      {
        holding: holding({ symbol: "VWCE" }),
        candidates: [
          listing({ providerSymbol: "VWCE.XETRA", exchange: "XETRA" }),
          listing({
            providerSymbol: "VWCE.LSE",
            exchange: "LSE",
            quoteCurrency: "GBP",
          }),
        ],
        warnings: [],
        quotaUnavailable: false,
      },
      null,
    );
    expect(decision.kind).toBe("choose");
    expect(new Set(decision.candidates.map((row) => row.exchange)).size).toBe(2);
    expect(applyManualListingSelection).toBeTypeOf("function");
  });
});
