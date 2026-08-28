import { describe, expect, it } from "vitest";

import {
  applyAddHoldingAdvancedQueryChange,
  applyAddHoldingSearchInputChange,
  canSaveAddHoldingListing,
  captureAddHoldingSearchBinding,
  hasDerivedListingIdentity,
  searchQueryChangedMeaningfully,
  shouldApplyListingLookupResult,
} from "@/lib/client/addHoldingSearchInvalidation";
import { resolveManualLookupMatchInput } from "@/lib/client/manualHoldingSearchQuery";
import {
  canSubmitAddInvestmentHolding,
  resolveAddHoldingUiPhase,
} from "@/lib/client/addHoldingUiState";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function holding(
  overrides: Partial<StoredPortfolioHolding> = {},
): StoredPortfolioHolding {
  return {
    id: "draft-1",
    symbol: "",
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

function confirmedListing(
  overrides: Partial<StoredPortfolioHolding> = {},
): StoredPortfolioHolding {
  return holding({
    symbol: "HSBA",
    name: "HSBC Holdings PLC",
    isin: "GB0005405286",
    exchange: "US",
    providerSymbol: "HSBC.US",
    instrumentName: "HSBC Holdings PLC",
    quoteCurrency: "USD",
    pricingExchange: "US",
    matchMethod: "ticker_exchange",
    matchConfidence: 0.94,
    confirmationSource: "auto_lookup",
    ...overrides,
  });
}

describe("Add Holding search-change listing invalidation", () => {
  it("HSBA resolves → type MSFT → previous listing disappears immediately", () => {
    const resolved = confirmedListing();
    const boundQuery = captureAddHoldingSearchBinding(resolved);
    expect(hasDerivedListingIdentity(resolved)).toBe(true);
    expect(
      canSaveAddHoldingListing({
        providerSymbol: resolved.providerSymbol,
        searchSymbol: resolved.symbol,
        listingIsin: resolved.isin,
        boundQuery,
      }),
    ).toBe(true);

    const next = applyAddHoldingSearchInputChange(resolved, "MSFT");

    expect(next.symbol).toBe("MSFT");
    expect(next.providerSymbol).toBeNull();
    expect(next.exchange).toBeNull();
    expect(next.quoteCurrency).toBeNull();
    expect(next.isin).toBeNull();
    expect(next.name).toBe("");
    expect(next.instrumentName).toBeNull();
    expect(next.pricingExchange).toBeNull();
    expect(next.confirmationSource).toBeUndefined();
    expect(next.matchMethod).toBeUndefined();
    expect(hasDerivedListingIdentity(next)).toBe(false);

    const matchInput = resolveManualLookupMatchInput(next);
    expect(matchInput.ticker).toBe("MSFT");
    expect(matchInput.isin).toBeNull();
    expect(matchInput.instrumentName).toBeNull();
    expect(matchInput.exchange).toBeNull();

    const phase = resolveAddHoldingUiPhase({
      listingSelected: Boolean(next.providerSymbol?.trim()),
      listingLookupPending: true,
      candidateCount: 0,
      searchActive: true,
    });
    expect(phase).toBe("searching");
    expect(canSubmitAddInvestmentHolding(phase)).toBe(false);
  });

  it("MSFT results can apply later without reopening the modal", () => {
    const afterHsba = applyAddHoldingSearchInputChange(confirmedListing(), "MSFT");
    const msftDraft = holding({
      ...afterHsba,
      providerSymbol: "MSFT.US",
      exchange: "US",
      name: "Microsoft Corporation",
      instrumentName: "Microsoft Corporation",
      quoteCurrency: "USD",
    });
    const boundQuery = captureAddHoldingSearchBinding(afterHsba);

    expect(
      canSaveAddHoldingListing({
        providerSymbol: msftDraft.providerSymbol,
        searchSymbol: msftDraft.symbol,
        listingIsin: msftDraft.isin,
        boundQuery,
      }),
    ).toBe(true);

    const phase = resolveAddHoldingUiPhase({
      listingSelected: true,
      listingLookupPending: false,
      candidateCount: 1,
      searchActive: false,
    });
    expect(phase).toBe("resolved");
    expect(canSubmitAddInvestmentHolding(phase)).toBe(true);
  });

  it("slow HSBA response arriving after MSFT cannot overwrite MSFT state", () => {
    const afterMsft = applyAddHoldingSearchInputChange(confirmedListing(), "MSFT");

    expect(
      shouldApplyListingLookupResult({
        aborted: false,
        requestGeneration: 1,
        currentGeneration: 2,
        requestQueryKey: captureAddHoldingSearchBinding(confirmedListing()).queryKey,
        currentQueryKey: captureAddHoldingSearchBinding(afterMsft).queryKey,
      }),
    ).toBe(false);

    expect(
      shouldApplyListingLookupResult({
        aborted: false,
        requestGeneration: 2,
        currentGeneration: 2,
        requestQueryKey: captureAddHoldingSearchBinding(afterMsft).queryKey,
        currentQueryKey: captureAddHoldingSearchBinding(afterMsft).queryKey,
      }),
    ).toBe(true);
  });

  it("selected listing is cleared immediately when search changes", () => {
    const selected = confirmedListing({
      providerSymbol: "MSFT.US",
      symbol: "MSFT",
      name: "Microsoft Corporation",
      isin: "US5949181045",
      instrumentName: "Microsoft Corporation",
      quoteCurrency: "USD",
    });

    const next = applyAddHoldingSearchInputChange(selected, "AAPL");
    expect(next.providerSymbol).toBeNull();
    expect(next.symbol).toBe("AAPL");
    expect(hasDerivedListingIdentity(next)).toBe(false);
  });

  it("Add Holding cannot save a stale listing after the query changes", () => {
    const resolved = confirmedListing();
    const boundQuery = captureAddHoldingSearchBinding(resolved);
    expect(
      canSaveAddHoldingListing({
        providerSymbol: "HSBC.US",
        searchSymbol: "HSBA",
        listingIsin: resolved.isin,
        boundQuery,
      }),
    ).toBe(true);

    const afterQueryChange = applyAddHoldingSearchInputChange(resolved, "MSFT");
    expect(
      canSaveAddHoldingListing({
        providerSymbol: "HSBC.US",
        searchSymbol: afterQueryChange.symbol,
        listingIsin: afterQueryChange.isin,
        boundQuery: null,
      }),
    ).toBe(false);
    expect(
      canSaveAddHoldingListing({
        providerSymbol: "HSBC.US",
        searchSymbol: afterQueryChange.symbol,
        listingIsin: afterQueryChange.isin,
        boundQuery,
      }),
    ).toBe(false);
    expect(
      canSaveAddHoldingListing({
        providerSymbol: afterQueryChange.providerSymbol,
        searchSymbol: afterQueryChange.symbol,
        listingIsin: afterQueryChange.isin,
        boundQuery: null,
      }),
    ).toBe(false);
  });

  it("ambiguous listing → choose one → change query → selection cleared", () => {
    const selected = confirmedListing({
      symbol: "VWCE",
      providerSymbol: "VWCE.US",
      name: "Vanguard FTSE All-World",
      isin: "IE00BK5BQT80",
    });
    const boundQuery = captureAddHoldingSearchBinding(selected);
    expect(
      canSaveAddHoldingListing({
        providerSymbol: selected.providerSymbol,
        searchSymbol: selected.symbol,
        listingIsin: selected.isin,
        boundQuery,
      }),
    ).toBe(true);

    const afterChange = applyAddHoldingSearchInputChange(selected, "EUNA");
    expect(afterChange.providerSymbol).toBeNull();
    expect(afterChange.isin).toBeNull();
    expect(hasDerivedListingIdentity(afterChange)).toBe(false);
    expect(
      canSaveAddHoldingListing({
        providerSymbol: selected.providerSymbol,
        searchSymbol: afterChange.symbol,
        listingIsin: afterChange.isin,
        boundQuery: null,
      }),
    ).toBe(false);
  });

  it("existing happy path still works", () => {
    const typed = applyAddHoldingSearchInputChange(holding(), "VWCE");
    expect(typed.symbol).toBe("VWCE");
    expect(typed.providerSymbol).toBeNull();
    expect(searchQueryChangedMeaningfully("", "VWCE")).toBe(true);

    const boundQuery = captureAddHoldingSearchBinding(typed);
    expect(
      canSaveAddHoldingListing({
        providerSymbol: "VWCE.XETRA",
        searchSymbol: typed.symbol,
        listingIsin: null,
        boundQuery,
      }),
    ).toBe(true);
  });

  it("does not treat case/whitespace-only Search edits as a new query", () => {
    const resolved = confirmedListing();
    const sameQuery = applyAddHoldingSearchInputChange(resolved, "hsba");
    expect(sameQuery.providerSymbol).toBe("HSBC.US");
    expect(sameQuery.symbol).toBe("hsba");
    expect(searchQueryChangedMeaningfully("HSBA", "hsba")).toBe(false);
  });

  it("More search options identity edits also drop the previous listing", () => {
    const next = applyAddHoldingAdvancedQueryChange(confirmedListing(), {
      isin: "US5949181045",
    });
    expect(next.isin).toBe("US5949181045");
    expect(next.symbol).toBe("HSBA");
    expect(next.providerSymbol).toBeNull();
    expect(next.quoteCurrency).toBeNull();
    expect(next.instrumentName).toBeNull();
    expect(next.name).toBe("");
    expect(next.exchange).toBeNull();
  });

  it("aborted responses are never applied", () => {
    const queryKey = captureAddHoldingSearchBinding(confirmedListing()).queryKey;
    expect(
      shouldApplyListingLookupResult({
        aborted: true,
        requestGeneration: 4,
        currentGeneration: 4,
        requestQueryKey: queryKey,
        currentQueryKey: queryKey,
      }),
    ).toBe(false);
  });
});
