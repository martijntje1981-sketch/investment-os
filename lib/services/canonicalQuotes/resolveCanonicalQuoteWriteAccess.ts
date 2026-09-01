/**
 * Server-side access gate for canonical crypto quote writes.
 * Personal Free / Trial / Complete may persist. Demo and missing access skip.
 * Never trust a browser-provided isDemo or tier flag.
 */

import type { ProductAccess } from "@/lib/services/productAccess/types";

export type CanonicalQuoteWriteAccess = Pick<
  ProductAccess,
  "isDemo" | "isCompleteTrial" | "tier"
>;

export type CanonicalQuoteWriteResolution =
  | { outcome: "allow_personal" }
  | { outcome: "skip_demo" }
  | { outcome: "unresolved" };

export function resolveCanonicalQuoteWriteAccess(
  access: CanonicalQuoteWriteAccess | null | undefined,
): CanonicalQuoteWriteResolution {
  if (!access) {
    return { outcome: "unresolved" };
  }

  if (access.isCompleteTrial === true) {
    return { outcome: "allow_personal" };
  }

  if (access.isDemo === true || access.tier === "demo") {
    return { outcome: "skip_demo" };
  }

  if (
    access.isDemo === false &&
    (access.tier === "free" ||
      access.tier === "trial" ||
      access.tier === "complete")
  ) {
    return { outcome: "allow_personal" };
  }

  return { outcome: "unresolved" };
}
