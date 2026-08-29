/**
 * Free vs Complete vs Demo presentation for What-if Intelligence.
 * Reuses existing entitlements — no new plan.
 */

import {
  canUseCompleteCapability,
  type ProductAccess,
} from "@/lib/services/productAccess";
import type { WhatIfAccessMode } from "@/lib/services/whatIf/types";

export function resolveWhatIfAccessMode(
  access: ProductAccess,
): WhatIfAccessMode {
  if (access.isDemo && access.intelligenceDepth === "complete") {
    return "demo";
  }
  if (canUseCompleteCapability(access, "what_if_scenarios")) {
    return "complete";
  }
  return "free_preview";
}

export function canExploreFullWhatIf(access: ProductAccess): boolean {
  return resolveWhatIfAccessMode(access) !== "free_preview";
}
