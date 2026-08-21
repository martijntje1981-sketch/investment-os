/**
 * React wiring for Portfolio / Dashboard "Refresh prices" controls.
 * Callers must pass the same useUserPortfolio holdings/saveHoldings instance.
 *
 * Also runs one controlled app-entry / tab-return refresh when data is stale,
 * reusing the same action + cooldown / in-flight guards (no duplicate paths).
 */

import { useCallback, useEffect, useRef, useState } from "react";

import {
  APP_ENTRY_VISIBILITY_MIN_GAP_MS,
  shouldRunAppEntryPortfolioRefresh,
} from "@/lib/client/appEntryPortfolioRefresh";
import { useBaseCurrencyDisplay } from "@/lib/client/baseCurrencyDisplay";
import type { CryptoRefreshDiagnosticRecord } from "@/lib/client/cryptoRefreshDiagnostics";
import { markAppEntryPricesReconciled } from "@/lib/client/appEntryPerformanceMarks";
import { readLastLivePriceRefreshAt } from "@/lib/client/livePortfolioPriceRefresh";
import {
  buildRefreshPreviewMessageForHoldings,
  readLivePriceRefreshUiState,
  runLivePortfolioPriceRefreshAction,
  type RefreshPricesUiStatus,
} from "@/lib/client/livePortfolioPriceRefreshAction";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

export type { RefreshPricesUiStatus } from "@/lib/client/livePortfolioPriceRefreshAction";
export {
  NO_QUOTABLE_REFRESH_MESSAGE,
  runLivePortfolioPriceRefreshAction,
  buildRefreshPreviewMessageForHoldings,
  readLivePriceRefreshUiState,
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
  const isRefreshingRef = useRef(false);
  const holdingsRef = useRef(holdings);
  const entryRefreshStartedRef = useRef(false);
  const lastVisibilityAttemptRef = useRef(0);
  holdingsRef.current = holdings;

  useEffect(() => {
    if (!userSub) {
      setLiveRefreshAt(null);
      return;
    }
    setLiveRefreshAt(readLastLivePriceRefreshAt(userSub));
    const shared = readLivePriceRefreshUiState(userSub);
    if (shared?.status === "success") {
      setStatus("success");
      setMessage(shared.message);
    } else if (shared?.status === "error") {
      setStatus("error");
      setMessage(
        "Prices could not be refreshed. Your last available prices remain visible.",
      );
    } else if (shared?.status === "idle") {
      setStatus("idle");
      setMessage(idleMessage);
    }
  }, [idleMessage, ready, userSub]);

  const refreshPrices = useCallback(async (options?: { cacheFirst?: boolean }) => {
    if (!userSub || isRefreshingRef.current) return;

    const currentHoldings = holdingsRef.current;
    const cacheFirst = options?.cacheFirst === true;
    if (!cacheFirst) {
      const preview = buildRefreshPreviewMessageForHoldings(
        currentHoldings,
        userSub,
      );
      if (preview) {
        setMessage(preview);
      }
    }
    setShowRefreshDiagnostics(false);
    setRefreshDiagnostics(null);
    isRefreshingRef.current = true;
    setIsRefreshing(true);
    setStatus("loading");

    try {
      const outcome = await runLivePortfolioPriceRefreshAction({
        userSub,
        holdings: currentHoldings,
        saveHoldings,
        baseCurrency,
        fxStatus: snapshot.status,
        refreshFx,
        cacheFirst,
      });

      markAppEntryPricesReconciled();

      // Keep prior figures on soft skip (cooldown / in-flight) — never clear data.
      if (outcome.updated || outcome.status === "success") {
        setMessage(outcome.message);
        setStatus("success");
      } else if (outcome.status === "error") {
        setMessage(
          "Prices could not be refreshed. Your last available prices remain visible.",
        );
        setStatus("error");
      } else {
        setMessage(idleMessage);
        setStatus("idle");
      }
      if (outcome.liveRefreshAt) {
        setLiveRefreshAt(outcome.liveRefreshAt);
      }
      if (
        outcome.showCryptoRefreshDiagnostics &&
        outcome.cryptoRefreshDiagnostics
      ) {
        setRefreshDiagnostics(outcome.cryptoRefreshDiagnostics);
        setShowRefreshDiagnostics(true);
      } else {
        setRefreshDiagnostics(null);
        setShowRefreshDiagnostics(false);
      }
      return outcome;
    } catch {
      markAppEntryPricesReconciled();
      setStatus("error");
      setMessage(
        "Prices could not be refreshed. Your last available prices remain visible.",
      );
      setRefreshDiagnostics(null);
      setShowRefreshDiagnostics(false);
      return undefined;
    } finally {
      isRefreshingRef.current = false;
      setIsRefreshing(false);
    }
  }, [
    baseCurrency,
    idleMessage,
    refreshFx,
    saveHoldings,
    snapshot.status,
    userSub,
  ]);

  useEffect(() => {
    if (!ready || !userSub) return;

    const attempt = (source: "entry" | "visible") => {
      if (source === "visible") {
        const now = Date.now();
        if (now - lastVisibilityAttemptRef.current < APP_ENTRY_VISIBILITY_MIN_GAP_MS) {
          return;
        }
        lastVisibilityAttemptRef.current = now;
      }

      const decision = shouldRunAppEntryPortfolioRefresh({
        ready,
        userSub,
        holdingsCount: holdingsRef.current.length,
      });
      if (!decision.shouldRefresh) return;
      void refreshPrices({ cacheFirst: true });
    };

    if (!entryRefreshStartedRef.current) {
      entryRefreshStartedRef.current = true;
      attempt("entry");
    }

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        attempt("visible");
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [ready, refreshPrices, userSub]);

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
