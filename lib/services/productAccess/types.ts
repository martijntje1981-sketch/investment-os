/**
 * Central Tobailey product access — Free / Trial / Complete / Demo.
 *
 * Presentation and intelligence depth should resolve through this module.
 * Do not scatter free/trial/paid checks across UI components.
 *
 * Billing/Stripe is out of scope: `converted` maps to Complete until
 * real subscriptions exist. Standard / no-entitlement accounts are Free.
 * Owner/test Complete uses the same converted entitlement — see conversion.ts.
 */

import type { FourQuestionsIntelligenceDepth } from "@/lib/services/fourQuestions/types";
import type { ExampleStatusKind } from "@/lib/services/examplePortfolio/resolveExampleStatus";
import type {
  ExamplePortfolioUserMetadata,
  ExampleTrialKind,
} from "@/lib/services/examplePortfolio/types";
import { EXAMPLE_KEEP_PORTFOLIO_HREF } from "@/lib/services/examplePortfolio/types";

/** Permanent product levels + trial + demo showroom. */
export type ProductAccessTier = "free" | "trial" | "complete" | "demo";

/**
 * Phase 6B public Complete price. Live marketing previously said €7.99 —
 * product model for this phase is €5.99/month (non-transactional CTA).
 */
export const COMPLETE_MONTHLY_PRICE_LABEL = "€5.99";
export const COMPLETE_MONTHLY_PRICE_DISPLAY = `${COMPLETE_MONTHLY_PRICE_LABEL}/month`;

export const COMPLETE_UPGRADE_HREF = EXAMPLE_KEEP_PORTFOLIO_HREF;
export const COMPLETE_UPGRADE_CTA_LABEL = `Get Complete · ${COMPLETE_MONTHLY_PRICE_DISPLAY}`;
export const SEE_COMPLETE_ANALYSIS_LABEL = "See Complete analysis";

/** Future Complete-only capability keys (gate only when the feature exists). */
export type CompleteCapabilityId =
  | "multi_period_attribution"
  | "why_am_i_seeing_this"
  | "change_intelligence"
  | "full_xray"
  | "advanced_goal_projections"
  | "goal_sensitivity"
  | "what_if_scenarios"
  | "full_resilience"
  | "portfolio_whats_ahead"
  | "smart_alerts"
  | "period_briefings"
  | "cross_asset_intelligence";

export type ProductAccess = {
  tier: ProductAccessTier;
  /** Four Questions presentation depth. Trial/demo/complete → complete. */
  intelligenceDepth: FourQuestionsIntelligenceDepth;
  /** True when the user is on an active Complete trial (personal, not demo). */
  isCompleteTrial: boolean;
  daysRemaining: number;
  expiresAt: string | null;
  /** Unobtrusive trial strip, e.g. "Complete trial · 11 days remaining". */
  trialIndicatorLabel: string | null;
  upgradeHref: string;
  upgradeCtaLabel: string;
  /** Demo showroom isolation — never mix with personal Free/Trial/Complete. */
  isDemo: boolean;
  /** Account/portfolio data must remain intact regardless of tier. */
  preservesUserData: true;
};

export type ResolveProductAccessInput = {
  exampleKind: ExampleStatusKind | "none";
  /** Prefer explicit trial kind; fall back carefully for legacy rows. */
  trialKind?: ExampleTrialKind | null;
  expiresAt?: string | null;
  daysRemaining?: number;
  now?: Date;
};

function resolveTrialKind(
  trialKind: ExampleTrialKind | null | undefined,
  exampleKind: ExampleStatusKind | "none",
): ExampleTrialKind | null {
  if (trialKind === "demo" || trialKind === "personal") return trialKind;
  // Active/expired example without kind: treat as demo for isolation safety.
  if (exampleKind === "active" || exampleKind === "expired") return "demo";
  return null;
}

function formatCompleteTrialIndicator(
  daysRemaining: number,
  expiresAt: string | null,
  now: Date,
): string {
  if (!expiresAt) return "Complete trial";
  const expires = Date.parse(expiresAt);
  if (!Number.isFinite(expires)) return "Complete trial";
  if (expires <= now.getTime() || daysRemaining <= 0) {
    return "Complete trial ended";
  }
  const expiresLocal = new Date(expires);
  if (expiresLocal.toDateString() === now.toDateString()) {
    return "Complete trial · Expires today";
  }
  if (daysRemaining === 1) return "Complete trial · 1 day remaining";
  return `Complete trial · ${daysRemaining} days remaining`;
}

/** Public helper for banners / trial strip (personal Complete trial). */
export function formatCompleteTrialIndicatorLabel(
  expiresAtIso: string | null | undefined,
  now = new Date(),
): string {
  if (!expiresAtIso) return "Complete trial";
  const expires = Date.parse(expiresAtIso);
  if (!Number.isFinite(expires)) return "Complete trial";
  if (expires <= now.getTime()) {
    return "Complete trial ended · Upgrade to continue";
  }
  const expiresLocal = new Date(expires);
  if (expiresLocal.toDateString() === now.toDateString()) {
    return "Complete trial · Expires today";
  }
  const ms = expires - now.getTime();
  const days = Math.ceil(ms / (24 * 60 * 60 * 1000));
  if (days <= 0) return "Complete trial ended · Upgrade to continue";
  if (days === 1) return "Complete trial · 1 day remaining";
  return `Complete trial · ${days} days remaining`;
}

/**
 * Single resolver for product access. Prefer this over ad-hoc trial/paid checks.
 */
export function resolveProductAccess(
  input: ResolveProductAccessInput,
): ProductAccess {
  const now = input.now ?? new Date();
  const daysRemaining = Math.max(0, input.daysRemaining ?? 0);
  const expiresAt = input.expiresAt ?? null;
  const trialKind = resolveTrialKind(input.trialKind, input.exampleKind);
  const base = {
    upgradeHref: COMPLETE_UPGRADE_HREF,
    upgradeCtaLabel: COMPLETE_UPGRADE_CTA_LABEL,
    preservesUserData: true as const,
  };

  if (input.exampleKind === "converted") {
    return {
      ...base,
      tier: "complete",
      intelligenceDepth: "complete",
      isCompleteTrial: false,
      daysRemaining: 0,
      expiresAt,
      trialIndicatorLabel: null,
      isDemo: false,
    };
  }

  if (input.exampleKind === "active") {
    if (trialKind === "personal") {
      return {
        ...base,
        tier: "trial",
        intelligenceDepth: "complete",
        isCompleteTrial: true,
        daysRemaining,
        expiresAt,
        trialIndicatorLabel: formatCompleteTrialIndicator(
          daysRemaining,
          expiresAt,
          now,
        ),
        isDemo: false,
      };
    }
    return {
      ...base,
      tier: "demo",
      intelligenceDepth: "complete",
      isCompleteTrial: false,
      daysRemaining,
      expiresAt,
      trialIndicatorLabel: null,
      isDemo: true,
    };
  }

  if (input.exampleKind === "expired") {
    if (trialKind === "personal") {
      return {
        ...base,
        tier: "free",
        intelligenceDepth: "free",
        isCompleteTrial: false,
        daysRemaining: 0,
        expiresAt,
        trialIndicatorLabel: null,
        isDemo: false,
      };
    }
    // Demo expired — still demo-isolated; callers keep hard expiry UX.
    return {
      ...base,
      tier: "demo",
      intelligenceDepth: "free",
      isCompleteTrial: false,
      daysRemaining: 0,
      expiresAt,
      trialIndicatorLabel: null,
      isDemo: true,
    };
  }

  // none | reserved — Free until a trial is activated or conversion exists.
  return {
    ...base,
    tier: "free",
    intelligenceDepth: "free",
    isCompleteTrial: false,
    daysRemaining: 0,
    expiresAt: null,
    trialIndicatorLabel: null,
    isDemo: false,
  };
}

export function resolveProductAccessFromMetadata(input: {
  exampleKind: ExampleStatusKind | "none";
  metadata?: ExamplePortfolioUserMetadata | null;
  expiresAt?: string | null;
  daysRemaining?: number;
  now?: Date;
}): ProductAccess {
  return resolveProductAccess({
    exampleKind: input.exampleKind,
    trialKind: input.metadata?.example_trial_kind ?? null,
    expiresAt: input.expiresAt ?? input.metadata?.example_expires_at ?? null,
    daysRemaining: input.daysRemaining,
    now: input.now,
  });
}

/** Whether Complete-depth intelligence should render. */
export function hasCompleteIntelligenceDepth(access: ProductAccess): boolean {
  return access.intelligenceDepth === "complete";
}

/**
 * Capability gate for maturing Complete-only surfaces.
 * Phase 6B: returns true only when depth is complete — no fake cards.
 */
export function canUseCompleteCapability(
  access: ProductAccess,
  capability: CompleteCapabilityId,
): boolean {
  void capability;
  return access.intelligenceDepth === "complete";
}

/**
 * Personal Complete trial expiry becomes Free (app stays usable).
 * Demo / legacy example expiry remains blocked.
 */
export function isPersonalTrialExpiredFreeAccess(
  meta: ExamplePortfolioUserMetadata | null | undefined,
): boolean {
  return meta?.example_trial_kind === "personal";
}
