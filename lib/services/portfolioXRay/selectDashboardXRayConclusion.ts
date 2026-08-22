/**
 * Dashboard / PI selector for material X-Ray conclusions.
 * Returns null when look-through is not connected — show nothing.
 */

import type { PortfolioLookThrough } from "@/lib/services/portfolioXRay/types";

export function selectDashboardXRayConclusion(
  lookThrough: PortfolioLookThrough | null | undefined,
): { text: string; href: string } | null {
  if (!lookThrough) return null;
  if (!lookThrough.providerStatus.connected) return null;
  if (
    lookThrough.status === "unavailable" ||
    lookThrough.status === "provider_not_connected"
  ) {
    return null;
  }

  const overlap = lookThrough.conclusions.find(
    (row) => row.kind === "multi_holding_overlap",
  );
  const hidden = lookThrough.conclusions.find(
    (row) => row.kind === "top_hidden_exposure",
  );
  const text = overlap?.text ?? hidden?.text ?? null;
  if (!text) return null;

  return {
    text,
    href: "/analysis#portfolio-xray",
  };
}
