/**
 * Product-level intelligence scope.
 * Architecture foundation for future tiers — not subscription gating.
 */

export type IntelligenceScopeId = "invest" | "crypto" | "complete";

export type IntelligenceScopeResolution = {
  scope: IntelligenceScopeId;
  /** Why this scope is active. */
  source: "default_complete" | "explicit_preference";
  /**
   * Future pricing may set preferred scopes; Phase 1 never locks users out.
   * Entitlement checks must live here later — not scattered in UI.
   */
  entitlementNote: string | null;
};
