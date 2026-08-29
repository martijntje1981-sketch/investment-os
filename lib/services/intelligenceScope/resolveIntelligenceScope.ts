/**
 * Resolve active intelligence scope.
 * Current product defaults to COMPLETE — no pricing / checkout / lockouts.
 */

import type {
  IntelligenceScopeId,
  IntelligenceScopeResolution,
} from "@/lib/services/intelligenceScope/types";

const VALID: ReadonlySet<string> = new Set(["invest", "crypto", "complete"]);

export function isIntelligenceScopeId(
  value: unknown,
): value is IntelligenceScopeId {
  return typeof value === "string" && VALID.has(value);
}

/**
 * Resolve scope for the Four Questions layer.
 * Prefer an explicit product preference when present; otherwise COMPLETE.
 */
export function resolveIntelligenceScope(input?: {
  preferred?: IntelligenceScopeId | null;
}): IntelligenceScopeResolution {
  if (input?.preferred && isIntelligenceScopeId(input.preferred)) {
    return {
      scope: input.preferred,
      source: "explicit_preference",
      entitlementNote: null,
    };
  }

  return {
    scope: "complete",
    source: "default_complete",
    entitlementNote: null,
  };
}
