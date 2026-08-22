"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { EXAMPLE_STATUS_CHANGED_EVENT } from "@/lib/client/exampleFirstRun";
import {
  maxPortfoliosForTier,
  resolveProductAccess,
  type ProductAccess,
  type ProductAccessTier,
} from "@/lib/services/productAccess";
import type { ExampleStatusKind } from "@/lib/services/examplePortfolio/resolveExampleStatus";
import type { ExampleTrialKind } from "@/lib/services/examplePortfolio/types";
import type { FourQuestionsIntelligenceDepth } from "@/lib/services/fourQuestions/types";

type StatusPayload = {
  kind?: ExampleStatusKind | "none";
  expiresAt?: string | null;
  daysRemaining?: number;
  trialKind?: ExampleTrialKind | null;
  productAccess?: {
    tier: ProductAccessTier;
    intelligenceDepth: FourQuestionsIntelligenceDepth;
    isCompleteTrial: boolean;
    daysRemaining: number;
    trialIndicatorLabel: string | null;
    upgradeHref: string;
    upgradeCtaLabel: string;
    isDemo: boolean;
  };
};

const DEFAULT_FREE_ACCESS: ProductAccess = resolveProductAccess({
  exampleKind: "none",
});

/**
 * Central client product access for Dashboard intelligence depth.
 * Uses the example-portfolio status endpoint — never invents entitlements.
 * Until status loads (or if it fails), treat the user as Free.
 */
export function useProductAccess(enabled = true): ProductAccess {
  const pathname = usePathname();
  const [access, setAccess] = useState<ProductAccess>(DEFAULT_FREE_ACCESS);

  const load = useCallback(async () => {
    if (!enabled) {
      setAccess(DEFAULT_FREE_ACCESS);
      return;
    }
    try {
      const response = await fetch("/api/example-portfolio/status", {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!response.ok) {
        setAccess(DEFAULT_FREE_ACCESS);
        return;
      }
      const payload = (await response.json()) as {
        success?: boolean;
        status?: StatusPayload;
      };
      if (!payload.success || !payload.status) {
        setAccess(DEFAULT_FREE_ACCESS);
        return;
      }

      if (payload.status.productAccess) {
        const pa = payload.status.productAccess;
        setAccess({
          tier: pa.tier,
          intelligenceDepth: pa.intelligenceDepth,
          isCompleteTrial: pa.isCompleteTrial,
          daysRemaining: pa.daysRemaining,
          expiresAt: payload.status.expiresAt ?? null,
          trialIndicatorLabel: pa.trialIndicatorLabel,
          upgradeHref: pa.upgradeHref,
          upgradeCtaLabel: pa.upgradeCtaLabel,
          isDemo: pa.isDemo,
          preservesUserData: true,
          maxPortfolios: maxPortfoliosForTier(pa.tier),
        });
        return;
      }

      setAccess(
        resolveProductAccess({
          exampleKind: payload.status.kind ?? "none",
          trialKind: payload.status.trialKind ?? null,
          expiresAt: payload.status.expiresAt ?? null,
          daysRemaining: payload.status.daysRemaining ?? 0,
        }),
      );
    } catch {
      setAccess(DEFAULT_FREE_ACCESS);
    }
  }, [enabled]);

  useEffect(() => {
    void load();
    const onStatusChanged = () => {
      void load();
    };
    window.addEventListener(EXAMPLE_STATUS_CHANGED_EVENT, onStatusChanged);
    return () => {
      window.removeEventListener(EXAMPLE_STATUS_CHANGED_EVENT, onStatusChanged);
    };
  }, [load, pathname]);

  return access;
}
