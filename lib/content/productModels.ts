/**
 * Public plan catalog — Tobailey Free and Tobailey Complete.
 * Positioning only. Does not gate access or change IntelligenceScope.
 */

import {
  COMPLETE_MONTHLY_PRICE_DISPLAY,
  COMPLETE_MONTHLY_PRICE_LABEL,
} from "@/lib/services/productAccess";

export type ProductPlanId = "free" | "complete";

export type ProductModelId = ProductPlanId;

export type ProductModelDefinition = {
  id: ProductPlanId;
  publicName: string;
  shortName: string;
  priceLabel: string;
  priceSuffix: string;
  headline: string;
  shortDescription: string;
  highlights: readonly string[];
  ctaHref: string;
  ctaLabel: string;
  featured: boolean;
};

/** Shared trial destination — billing is not automated here. */
export const PRODUCT_MODEL_TRIAL_HREF = "/signup?intent=trial" as const;

export const PRODUCT_POSITIONING = {
  eyebrow: "Free and Complete",
  title: "Start with everything. Keep what you need.",
  description: `Try Tobailey Complete free for 14 days. After that, continue with Complete for ${COMPLETE_MONTHLY_PRICE_DISPLAY} or keep using Tobailey Free.`,
} as const;

export const PRODUCT_MODELS: readonly ProductModelDefinition[] = [
  {
    id: "free",
    publicName: "Tobailey Free",
    shortName: "Free",
    priceLabel: "€0",
    priceSuffix: "always",
    headline: "Useful portfolio intelligence, without a subscription.",
    shortDescription:
      "Track your portfolio and see the Four Questions headline answers. Intelligence depth stays limited — still genuinely useful, not a locked demo.",
    highlights: [
      "Portfolio tracking for stocks, ETFs, cash and crypto",
      "Four Questions glance answers",
      "Headline personal intelligence",
      "Your Review, Goals and Portfolio Scorecard",
      "Export Portfolio",
      "Limited intelligence depth",
    ],
    ctaHref: PRODUCT_MODEL_TRIAL_HREF,
    ctaLabel: "Start with a 14-day trial",
    featured: false,
  },
  {
    id: "complete",
    publicName: "Tobailey Complete",
    shortName: "Complete",
    priceLabel: COMPLETE_MONTHLY_PRICE_LABEL,
    priceSuffix: "per month",
    headline: "Full intelligence depth after a 14-day trial.",
    shortDescription:
      "Everything in Free, plus the deeper Four Questions analysis already in Tobailey — more context behind conclusions, and scenario and goal views where your data supports them.",
    highlights: [
      "Everything in Tobailey Free",
      "Full intelligence depth on the Four Questions",
      "More context behind conclusions — not just the headline",
      "Scenario and sensitivity views where available",
      "Goal views where you have a goal",
    ],
    ctaHref: PRODUCT_MODEL_TRIAL_HREF,
    ctaLabel: "Start your 14-day trial",
    featured: true,
  },
] as const;

export function getProductModel(id: ProductPlanId): ProductModelDefinition {
  const found = PRODUCT_MODELS.find((item) => item.id === id);
  if (!found) {
    throw new Error(`Unknown product model: ${id}`);
  }
  return found;
}
