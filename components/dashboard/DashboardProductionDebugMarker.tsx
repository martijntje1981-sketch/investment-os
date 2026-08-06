"use client";

/**
 * TEMPORARY — remove after production verification.
 * Search: baaec00-dashboard-debug
 */

import { PRODUCTION_DEBUG_BUILD_MARKER } from "@/lib/client/investmentOsProductionDebug";

export function DashboardProductionDebugMarker() {
  return (
    <p
      data-production-debug-build={PRODUCTION_DEBUG_BUILD_MARKER}
      className="mt-4 text-center text-[11px] font-mono tracking-wide text-slate-400/90"
      aria-label={`Build marker ${PRODUCTION_DEBUG_BUILD_MARKER}`}
    >
      Build: {PRODUCTION_DEBUG_BUILD_MARKER}
    </p>
  );
}
