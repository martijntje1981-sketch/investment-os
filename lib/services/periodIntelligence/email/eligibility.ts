/**
 * Complete-only personal review email eligibility.
 * Demo is never delivered, even when intelligence depth is complete.
 */

import {
  canUseCompleteCapability,
  type ProductAccess,
} from "@/lib/services/productAccess";

export function isEligibleForPeriodReportEmail(access: ProductAccess): boolean {
  if (access.isDemo) return false;
  return canUseCompleteCapability(access, "period_briefings");
}

/**
 * Visual checked state for Settings/Review email toggles.
 * Stored opt-in must never look enabled when the user is not eligible
 * (Free, demo, or otherwise gated). Server authorization remains separate.
 */
export function visiblePeriodReviewEmailOptIn(
  eligible: boolean,
  storedOptIn: boolean,
): boolean {
  return eligible && storedOptIn;
}

export type PeriodReportEmailSkipReason =
  | "email_not_configured"
  | "not_eligible"
  | "demo"
  | "opt_in_off"
  | "missing_email"
  | "missing_report"
  | "not_ready"
  | "already_sent"
  | "provider_error"
  | "network_error";

export type PeriodReportEmailDecision =
  | { send: true; reason: null }
  | { send: false; reason: PeriodReportEmailSkipReason };

export function evaluatePeriodReportEmailDelivery(input: {
  configured: boolean;
  access: ProductAccess;
  optedIn: boolean;
  email: string | null | undefined;
  reviewReady: boolean;
  reviewPresent: boolean;
  reviewIsDemo: boolean;
  alreadySent: boolean;
}): PeriodReportEmailDecision {
  if (!input.configured) return { send: false, reason: "email_not_configured" };
  if (input.access.isDemo || input.reviewIsDemo) {
    return { send: false, reason: "demo" };
  }
  if (!isEligibleForPeriodReportEmail(input.access)) {
    return { send: false, reason: "not_eligible" };
  }
  if (!input.optedIn) return { send: false, reason: "opt_in_off" };
  if (!input.email?.trim()) return { send: false, reason: "missing_email" };
  if (!input.reviewPresent) return { send: false, reason: "missing_report" };
  if (!input.reviewReady) return { send: false, reason: "not_ready" };
  if (input.alreadySent) return { send: false, reason: "already_sent" };
  return { send: true, reason: null };
}
