/**
 * Public product-model catalog — Invest / Crypto / Complete.
 * Aligns with IntelligenceScope ids. Positioning only — no billing/gating.
 */

import type { IntelligenceScopeId } from "@/lib/services/intelligenceScope";

export type ProductModelId = IntelligenceScopeId;

export type ProductModelDefinition = {
  id: ProductModelId;
  /** Matches IntelligenceScope. */
  scope: IntelligenceScopeId;
  publicName: string;
  shortName: string;
  /** One-line section headline. */
  headline: string;
  shortDescription: string;
  /** Compact proof points — not a feature laundry list. */
  highlights: readonly string[];
  /** Existing trial CTA — no entitlement switching. */
  ctaHref: string;
  ctaLabel: string;
};

/** Shared trial destination — scope is not enforced by onboarding yet. */
export const PRODUCT_MODEL_TRIAL_HREF = "/signup?intent=trial" as const;

export const PRODUCT_MODELS: readonly ProductModelDefinition[] = [
  {
    id: "invest",
    scope: "invest",
    publicName: "Tobailey Invest",
    shortName: "Invest",
    headline: "For stocks, ETFs and traditional portfolios.",
    shortDescription:
      "A complete intelligence experience for traditional investments — performance, markets, goals and scenarios without crypto noise.",
    highlights: [
      "Stocks, ETFs and funds understood together",
      "Performance attribution and market context",
      "Goals and scenarios for a traditional portfolio",
    ],
    ctaHref: PRODUCT_MODEL_TRIAL_HREF,
    ctaLabel: "Start your 14-day trial",
  },
  {
    id: "crypto",
    scope: "crypto",
    publicName: "Tobailey Crypto",
    shortName: "Crypto",
    headline: "For crypto portfolios and owned-coin intelligence.",
    shortDescription:
      "Holdings-first clarity across Bitcoin, Ethereum and your other supported coins — not a Bitcoin-only product.",
    highlights: [
      "Your coins, not a single-asset narrative",
      "Owned-coin intelligence linked to what you hold",
      "The same four questions, for crypto",
    ],
    ctaHref: PRODUCT_MODEL_TRIAL_HREF,
    ctaLabel: "Start your 14-day trial",
  },
  {
    id: "complete",
    scope: "complete",
    publicName: "Tobailey Complete",
    shortName: "Complete",
    headline: "Your investments and crypto, understood together.",
    shortDescription:
      "One portfolio. One intelligence layer. Four answers — Tobailey ranks what matters most across everything you own.",
    highlights: [
      "Sometimes an ETF matters most; sometimes a coin does",
      "One coherent daily view — not two products stacked",
      "The same four questions across your whole portfolio",
    ],
    ctaHref: PRODUCT_MODEL_TRIAL_HREF,
    ctaLabel: "Start your 14-day trial",
  },
] as const;

export function getProductModel(
  id: ProductModelId,
): ProductModelDefinition {
  const found = PRODUCT_MODELS.find((item) => item.id === id);
  if (!found) {
    throw new Error(`Unknown product model: ${id}`);
  }
  return found;
}
