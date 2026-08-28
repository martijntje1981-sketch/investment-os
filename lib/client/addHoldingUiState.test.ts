import { describe, expect, it } from "vitest";

import {
  canSubmitAddInvestmentHolding,
  resolveAddHoldingUiPhase,
  shouldShowAddHoldingEntryFields,
} from "@/lib/client/addHoldingUiState";

describe("Add Holding UI phase contract", () => {
  it("B. unresolved listing does not show Quantity/Cost/Add", () => {
    const phase = resolveAddHoldingUiPhase({
      listingSelected: false,
      listingLookupPending: false,
      candidateCount: 0,
      searchActive: true,
    });
    expect(phase).toBe("unresolved");
    expect(shouldShowAddHoldingEntryFields(phase)).toBe(false);
    expect(canSubmitAddInvestmentHolding(phase)).toBe(false);
  });

  it("treats lookup unavailability as unresolved, not as a saveable draft", () => {
    const phase = resolveAddHoldingUiPhase({
      listingSelected: false,
      listingLookupPending: false,
      candidateCount: 0,
      searchActive: false,
      lookupUnavailable: true,
    });
    expect(phase).toBe("unresolved");
    expect(shouldShowAddHoldingEntryFields(phase)).toBe(false);
    expect(canSubmitAddInvestmentHolding(phase)).toBe(false);
  });

  it("C. ambiguous listing does not show Quantity/Cost until selection", () => {
    const phase = resolveAddHoldingUiPhase({
      listingSelected: false,
      listingLookupPending: false,
      candidateCount: 3,
      searchActive: true,
    });
    expect(phase).toBe("ambiguous");
    expect(shouldShowAddHoldingEntryFields(phase)).toBe(false);
    expect(canSubmitAddInvestmentHolding(phase)).toBe(false);
  });

  it("D. resolved listing shows Quantity/Cost/Add", () => {
    const phase = resolveAddHoldingUiPhase({
      listingSelected: true,
      listingLookupPending: false,
      candidateCount: 1,
      searchActive: false,
    });
    expect(phase).toBe("resolved");
    expect(shouldShowAddHoldingEntryFields(phase)).toBe(true);
    expect(canSubmitAddInvestmentHolding(phase)).toBe(true);
  });

  it("searching hides entry fields even if stale candidates exist", () => {
    const phase = resolveAddHoldingUiPhase({
      listingSelected: false,
      listingLookupPending: true,
      candidateCount: 2,
      searchActive: true,
    });
    expect(phase).toBe("searching");
    expect(shouldShowAddHoldingEntryFields(phase)).toBe(false);
    expect(canSubmitAddInvestmentHolding(phase)).toBe(false);
  });

  it("idle empty search does not show Quantity/Cost/Add", () => {
    const phase = resolveAddHoldingUiPhase({
      listingSelected: false,
      listingLookupPending: false,
      candidateCount: 0,
      searchActive: false,
    });
    expect(phase).toBe("idle");
    expect(shouldShowAddHoldingEntryFields(phase)).toBe(false);
    expect(canSubmitAddInvestmentHolding(phase)).toBe(false);
  });
});
