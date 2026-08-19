/**
 * Free / Complete / Trial / Demo presentation for change attention.
 * Reuses existing entitlements — no new plan.
 */

import {
  canUseCompleteCapability,
  type ProductAccess,
} from "@/lib/services/productAccess";
import { FREE_CHANGE_TEASE } from "@/lib/services/portfolioChangeDetection/config";
import type {
  PortfolioChangeAttention,
  SmartAlertsAccessMode,
} from "@/lib/services/portfolioChangeDetection/types";

export function resolveSmartAlertsAccessMode(
  access: ProductAccess,
): SmartAlertsAccessMode {
  if (access.isDemo && access.intelligenceDepth === "complete") {
    return "demo";
  }
  if (canUseCompleteCapability(access, "smart_alerts")) {
    return "complete";
  }
  return "free_preview";
}

export function applyPortfolioChangeAccess(
  attention: PortfolioChangeAttention,
  mode: SmartAlertsAccessMode,
): PortfolioChangeAttention {
  if (mode !== "free_preview") {
    return {
      ...attention,
      support:
        mode === "demo" && attention.support
          ? `${attention.support} Illustrative demo portfolio.`
          : attention.support,
    };
  }

  if (attention.status !== "attention" || !attention.primary) {
    return { ...attention, secondary: [] };
  }

  return {
    ...attention,
    secondary: [],
    ranked: attention.primary ? [attention.primary] : [],
    support: attention.support
      ? `${attention.support} ${FREE_CHANGE_TEASE}`
      : FREE_CHANGE_TEASE,
    limitations: [...attention.limitations, FREE_CHANGE_TEASE],
  };
}
