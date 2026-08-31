import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { MANUAL_HOLDING_AUTO_LOOKUP_DEBOUNCE_MS } from "@/lib/client/manualHoldingAutoLookup";

function read(relativePath: string): string {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("Add Holding simplification", () => {
  const page = read("app/portfolio/page.tsx");
  const form = read("components/portfolio/AddInvestmentHoldingForm.tsx");
  const autoLookup = read("lib/client/manualHoldingAutoLookup.ts");
  const match = read("lib/client/manualHoldingMatch.ts");
  const glance = read("components/portfolio/glance/PortfolioGlance.tsx");
  const holdings = read("components/portfolio/glance/PortfolioHoldingsList.tsx");
  const activity = read("components/portfolio/glance/PortfolioActivity.tsx");
  const explore = read("components/portfolio/glance/PortfolioExploreNav.tsx");
  const identityCard = read("components/instruments/ConfirmedListingIdentity.tsx");
  const picker = read("components/instruments/ListingCandidatePicker.tsx");

  it("defaults to a single Search field and hides technical inputs", () => {
    expect(form).toContain('data-testid="add-holding-search"');
    expect(form).toContain("Search by name, ticker or ISIN");
    expect(form).toContain("More search options");
    expect(form).toContain('data-testid="add-holding-more-options"');
    expect(form).toContain("ISIN (optional)");
    expect(form).toContain("Instrument name (optional)");
    expect(form).toContain("ExchangeFieldEditor");
    expect(form).toContain("Find listing");
    expect(form.indexOf("add-holding-search")).toBeLessThan(
      form.indexOf("More search options"),
    );
    expect(form.indexOf("ISIN (optional)")).toBeGreaterThan(
      form.indexOf("add-holding-more-options"),
    );
  });

  it("auto-discovers after stable input and shows searching / no-match / quantity after selection", () => {
    expect(autoLookup).toContain("MANUAL_HOLDING_AUTO_LOOKUP_DEBOUNCE_MS");
    expect(MANUAL_HOLDING_AUTO_LOOKUP_DEBOUNCE_MS).toBe(450);
    expect(page).toContain("shouldTriggerManualListingAutoLookup");
    expect(page).toContain("lookupManualHoldingListing");
    expect(page).toContain("setListingLookupPending(true)");
    expect(form).toContain("add-holding-searching");
    expect(form).toContain("Searching…");
    expect(form).toContain("UNIDENTIFIED_LISTING_MESSAGE");
    expect(form).toContain("shouldShowAddHoldingEntryFields(uiPhase)");
    expect(form).toContain('data-testid="add-holding-entry-fields"');
    expect(form).not.toContain("noMatch || moreSearchOptions");
    expect(form).toContain("listingSelected");
    expect(form).toContain("ConfirmedListingIdentity");
    expect(form).toContain("ListingCandidatePicker");
  });

  it("B/C. Quantity/Cost/Add are not actionable until a listing is resolved", () => {
    expect(form).toContain("shouldShowAddHoldingEntryFields(uiPhase) || isEditing");
    expect(page).toContain('data-testid="add-holding-submit"');
    expect(page).toContain("canSaveAddHoldingListing");
  });

  it("clears listing identity immediately when Search changes and ignores stale responses", () => {
    expect(form).toContain("onSearchQueryChange");
    expect(form).toContain("applyAddHoldingAdvancedQueryChange");
    expect(page).toContain("applyAddHoldingSearchInputChange");
    expect(page).toContain("shouldApplyListingLookupResult");
    expect(page).toContain("listingLookupAbortRef");
    expect(page).toContain("listingLookupGenerationRef");
    expect(page).toContain("userSearchQueryKeyRef");
    expect(page).toContain("boundListingQueryRef");
  });

  it("F. advanced search collapses back to the compact resolved state", () => {
    expect(form).toContain('if (uiPhase === "resolved")');
    expect(form).toContain("setMoreSearchOptions(false)");
  });

  it("G. does not hard-code instrument behavior", () => {
    expect(autoLookup).not.toMatch(/\bHSBA\b/);
    expect(form).not.toMatch(/\bHSBA\b/);
    expect(page).not.toMatch(/\bHSBA\b/);
    const uiState = read("lib/client/addHoldingUiState.ts");
    const invalidation = read("lib/client/addHoldingSearchInvalidation.ts");
    expect(uiState).not.toMatch(/\bHSBA\b|\bMSFT\b/);
    expect(invalidation).not.toMatch(/\bHSBA\b|\bMSFT\b|\bHSBC\b/);
  });

  it("A. missing quote currency is labeled unavailable, not unidentified", () => {
    expect(identityCard).toContain("LISTING_CURRENCY_UNAVAILABLE_LABEL");
    expect(identityCard).toContain("listing-currency-unavailable");
    expect(identityCard).not.toContain("Unresolved");
    expect(identityCard).not.toContain("couldn’t confidently identify");
    expect(picker).toContain("LISTING_CURRENCY_UNAVAILABLE_LABEL");
    expect(autoLookup).toContain("listingIdentityReadyToConfirm");
    expect(autoLookup).toContain("listingQuoteCurrencyResolved");
  });

  it("keeps Add on the existing saveHoldings path and does not search-write portfolio", () => {
    expect(page).toContain("saveHoldings");
    expect(page).toContain("validateManualHoldingForSave");
    expect(page).toContain("refreshConfirmedListingAfterSave");
    expect(page).toContain("isSavingHolding");
    expect(page).toContain(
      "Holding saved. Current price is temporarily unavailable and will be refreshed later.",
    );
    expect(page).not.toMatch(/price was refreshed|Price refreshed/i);
    expect(page).not.toMatch(/\bSDIV\b/);
    expect(match).not.toContain("saveHoldings");
    expect(match).not.toContain("writePortfolioToStorage");
    expect(autoLookup).not.toContain("saveHoldings");
    expect(form).not.toContain("saveHoldings");
    const uiState = read("lib/client/addHoldingUiState.ts");
    const invalidation = read("lib/client/addHoldingSearchInvalidation.ts");
    expect(uiState).not.toContain("saveHoldings");
    expect(uiState).not.toContain("writePortfolioToStorage");
    expect(invalidation).not.toContain("saveHoldings");
    expect(invalidation).not.toContain("writePortfolioToStorage");
  });

  it("does not redesign Glance, Holdings, Activity, or Explore", () => {
    expect(page).toContain("<PortfolioGlance");
    expect(page).toContain("<PortfolioHoldingsList");
    expect(page).toContain("<PortfolioActivity");
    expect(page).toContain("<PortfolioExploreNav");
    expect(glance).toContain("Glance");
    expect(holdings).toContain("Holdings");
    expect(activity).toContain("Activity");
    expect(explore).toContain("Explore");
  });
});
