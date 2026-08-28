/**
 * Add Holding UI phases.
 *
 * Quantity, cost, and Add are only available after a listing is identified.
 * Missing quote currency does not make a listing unidentified.
 */

export type AddHoldingUiPhase =
  | "idle"
  | "searching"
  | "unresolved"
  | "ambiguous"
  | "resolved";

export function resolveAddHoldingUiPhase(input: {
  listingSelected: boolean;
  listingLookupPending: boolean;
  candidateCount: number;
  searchActive: boolean;
  lookupUnavailable?: boolean;
}): AddHoldingUiPhase {
  if (input.listingSelected) return "resolved";
  if (input.listingLookupPending) return "searching";
  if (input.candidateCount > 0) return "ambiguous";
  if (input.searchActive || input.lookupUnavailable) return "unresolved";
  return "idle";
}

export function shouldShowAddHoldingEntryFields(
  phase: AddHoldingUiPhase,
): boolean {
  return phase === "resolved";
}

export function canSubmitAddInvestmentHolding(
  phase: AddHoldingUiPhase,
): boolean {
  return phase === "resolved";
}
