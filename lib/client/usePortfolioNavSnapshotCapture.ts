"use client";

/**
 * Background NAV snapshot capture after valuation has settled.
 * Must not block rendering, alter refresh copy, or start extra price fetches.
 */

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

import {
  activePortfolioValueAvailable,
  requestPortfolioNavSnapshotCapture,
  shouldRequestNavSnapshotCapture,
  type NavSnapshotCaptureTrigger,
} from "@/lib/client/navSnapshotCaptureClient";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

export function usePortfolioNavSnapshotCapture(input: {
  authReady: boolean;
  userSub: string | null;
  activePortfolioId: string | null;
  portfolioReady: boolean;
  holdings: StoredPortfolioHolding[];
  pricesSettled: boolean;
  isRefreshing: boolean;
  manualRefreshGeneration: number;
  accessReady: boolean;
  isDemo: boolean;
}): void {
  const pathname = usePathname();
  const lastPortfolioIdRef = useRef<string | null>(null);
  const lastManualGenerationRef = useRef(input.manualRefreshGeneration);

  useEffect(() => {
    const previousPortfolioId = lastPortfolioIdRef.current;
    const previousManualGeneration = lastManualGenerationRef.current;
    lastPortfolioIdRef.current = input.activePortfolioId;
    lastManualGenerationRef.current = input.manualRefreshGeneration;

    let trigger: NavSnapshotCaptureTrigger = "settled_valuation";
    if (
      input.manualRefreshGeneration > 0 &&
      input.manualRefreshGeneration !== previousManualGeneration
    ) {
      trigger = "manual_refresh";
    } else if (
      previousPortfolioId &&
      input.activePortfolioId &&
      previousPortfolioId !== input.activePortfolioId
    ) {
      trigger = "portfolio_switch";
    }

    const decision = shouldRequestNavSnapshotCapture({
      pathname,
      authReady: input.authReady,
      userSub: input.userSub,
      portfolioReady: input.portfolioReady,
      activePortfolioId: input.activePortfolioId,
      holdingsBelongToActivePortfolio:
        input.portfolioReady && Boolean(input.activePortfolioId),
      pricesSettled: input.pricesSettled,
      isRefreshing: input.isRefreshing,
      portfolioValueAvailable: activePortfolioValueAvailable(input.holdings),
      accessReady: input.accessReady,
      isDemo: input.isDemo,
      trigger,
    });
    if (!decision.request || !input.userSub || !input.activePortfolioId) {
      return;
    }

    void requestPortfolioNavSnapshotCapture({
      portfolioId: input.activePortfolioId,
      userSub: input.userSub,
      trigger,
    }).catch(() => undefined);
  }, [
    input.accessReady,
    input.activePortfolioId,
    input.authReady,
    input.holdings,
    input.isDemo,
    input.isRefreshing,
    input.manualRefreshGeneration,
    input.portfolioReady,
    input.pricesSettled,
    input.userSub,
    pathname,
  ]);
}
