/**
 * Complete-only PDF download gate. Uses existing product-access depth.
 * No new plans or entitlements.
 */

import {
  canUseCompleteCapability,
  type ProductAccess,
} from "@/lib/services/productAccess";

export type PeriodReportPdfAccessResult =
  | { allowed: true; reason: null }
  | { allowed: false; reason: "free" | "demo_mix" | "not_ready" };

export function canDownloadPeriodReportPdf(access: ProductAccess): boolean {
  return canUseCompleteCapability(access, "period_briefings");
}

/**
 * Demo must never mix with personal report payloads.
 * Personal Complete must never download a demo-labelled review.
 */
export function pdfPayloadMatchesAccess(
  access: ProductAccess,
  reviewIsDemo: boolean,
): boolean {
  return access.isDemo === reviewIsDemo;
}

export function resolvePeriodReportPdfAccess(input: {
  access: ProductAccess;
  reviewReady: boolean;
  reviewIsDemo: boolean;
}): PeriodReportPdfAccessResult {
  if (!canDownloadPeriodReportPdf(input.access)) {
    return { allowed: false, reason: "free" };
  }
  if (!pdfPayloadMatchesAccess(input.access, input.reviewIsDemo)) {
    return { allowed: false, reason: "demo_mix" };
  }
  if (!input.reviewReady) {
    return { allowed: false, reason: "not_ready" };
  }
  return { allowed: true, reason: null };
}
