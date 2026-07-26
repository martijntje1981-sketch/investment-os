/**
 * React wiring for Portfolio / Dashboard "Refresh prices" controls.
 * Callers must pass the same useUserPortfolio holdings/saveHoldings instance.
 */

import { useBaseCurrencyDisplay } from "@/lib/client/baseCurrencyDisplay";
import type { CryptoRefreshDiagnosticRecord } from "@/lib/client/cryptoRefreshDiagnostics";
import { readLastLivePriceRefreshAt } from "@/lib/client/livePortfolioPriceRefresh";
import {
  buildRefreshPreviewMessageForHoldings,
  runLivePortfolioPriceRefreshAction,
  type RefreshPricesUiStatus,
} from "@/lib/client/livePortfolioPriceRefreshAction";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";
import { useCallback, useEffect, useState } from "react";

export type { RefreshPricesUiStatus } from "@/lib/client/livePortfolioPriceRefreshAction";
export {
  NO_QUOTABLE_REFRESH_MESSAGE,
  runLivePortfolioPriceRefreshAction,
  buildRefreshPreviewMessageForHoldings,
} from "@/lib/client/livePortfolioPriceRefreshAction";

export function useLivePortfolioPriceRefresh({
  userSub,
  holdings,
  saveHoldings,
  ready = true,
  idleMessage = "Portfolio prices use the latest available market data.",
}: {
  userSub: string | null;
  holdings: StoredPortfolioHolding[];
  saveHoldings: (next: StoredPortfolioHolding[]) => void;
  ready?: boolean;
  idleMessage?: string;
}) {
  const { baseCurrency, snapshot, refreshFx } = useBaseCurrencyDisplay();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [status, setStatus] = useState<RefreshPricesUiStatus>("idle");
  const [message, setMessage] = useState(idleMessage);
  const [liveRefreshAt, setLiveRefreshAt] = useState<string | null>(null);
  const [refreshDiagnostics, setRefreshDiagnostics] = useState<
    CryptoRefreshDiagnosticRecord[] | null
  >(null);
  const [showRefreshDiagnostics, setShowRefreshDiagnostics] = useState(false);

  useEffect(() => {
    if (!userSub) {
      setLiveRefreshAt(null);
      return;
    }
    setLiveRefreshAt(readLastLivePriceRefreshAt(userSub));
  }, [ready, userSub]);

  const refreshPrices = useCallback(async () => {
    if (!userSub || isRefreshing) return;

    const preview = buildRefreshPreviewMessageForHoldings(holdings, userSub);
    if (preview) {
      setMessage(preview);
    }
    setShowRefreshDiagnostics(false);
    setRefreshDiagnostics(null);
    setIsRefreshing(true);
    setStatus("loading");

    try {
      const outcome = await runLivePortfolioPriceRefreshAction({
        userSub,
        holdings,
        saveHoldings,
        baseCurrency,
        fxStatus: snapshot.status,
        refreshFx,
      });

      setMessage(outcome.message);
      setStatus(outcome.status === "idle" ? "idle" : outcome.status);
      if (outcome.liveRefreshAt) {
        setLiveRefreshAt(outcome.liveRefreshAt);
      }
      if (outcome.showCryptoRefreshDiagnostics && outcome.cryptoRefreshDiagnostics) {
        setRefreshDiagnostics(outcome.cryptoRefreshDiagnostics);
        setShowRefreshDiagnostics(true);
      } else {
        setRefreshDiagnostics(null);
        setShowRefreshDiagnostics(false);
      }
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Live prices could not be refreshed. Your last available prices remain visible.",
      );
      setRefreshDiagnostics(null);
      setShowRefreshDiagnostics(false);
    } finally {
      setIsRefreshing(false);
    }
  }, [
    baseCurrency,
    holdings,
    isRefreshing,
    refreshFx,
    saveHoldings,
    snapshot.status,
    userSub,
  ]);

  return {
    refreshPrices,
    isRefreshing,
    status,
    message,
    setMessage,
    liveRefreshAt,
    setLiveRefreshAt,
    refreshDiagnostics,
    showRefreshDiagnostics,
    disabled: isRefreshing || !userSub,
  };
}
