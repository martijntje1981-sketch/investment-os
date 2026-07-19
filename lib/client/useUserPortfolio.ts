"use client";

import { useCallback, useEffect, useState } from "react";
import {
  applyCachedPrices,
  dispatchPortfolioUpdated,
  getLegacyRecoveryOffer,
  loadUserPortfolioHoldings,
  recoverLegacyPortfolioToUser,
  dismissLegacyPortfolioRecovery,
  writePortfolioToStorage,
  type LegacyRecoveryOffer,
  type StoredPortfolioHolding,
} from "@/lib/client/portfolioPricing";
import { PORTFOLIO_HOLDINGS_UPDATED_EVENT } from "@/lib/client/portfolioStorageKeys";
import { createPortfolioUpdatedHandler } from "@/lib/client/portfolioUpdatedEvents";
import { useAuthenticatedUserSub } from "@/lib/client/useAuthenticatedUserSub";

export function useUserPortfolio() {
  const { userSub, authReady } = useAuthenticatedUserSub();
  const [holdings, setHoldings] = useState<StoredPortfolioHolding[]>([]);
  const [portfolioReady, setPortfolioReady] = useState(false);
  const [recoveryOffer, setRecoveryOffer] =
    useState<LegacyRecoveryOffer | null>(null);

  const reloadPortfolio = useCallback(() => {
    if (!userSub) {
      setHoldings([]);
      setRecoveryOffer(null);
      return;
    }

    setHoldings(loadUserPortfolioHoldings(userSub));
    setRecoveryOffer(getLegacyRecoveryOffer(userSub));
  }, [userSub]);

  useEffect(() => {
    if (!authReady) {
      setHoldings([]);
      setRecoveryOffer(null);
      setPortfolioReady(false);
      return;
    }

    if (!userSub) {
      setHoldings([]);
      setRecoveryOffer(null);
      setPortfolioReady(true);
      return;
    }

    reloadPortfolio();
    setPortfolioReady(true);
  }, [authReady, reloadPortfolio, userSub]);

  useEffect(() => {
    if (!userSub) return;

    const handlePortfolioUpdated = createPortfolioUpdatedHandler(
      userSub,
      reloadPortfolio,
    );

    window.addEventListener(
      PORTFOLIO_HOLDINGS_UPDATED_EVENT,
      handlePortfolioUpdated,
    );

    return () => {
      window.removeEventListener(
        PORTFOLIO_HOLDINGS_UPDATED_EVENT,
        handlePortfolioUpdated,
      );
    };
  }, [reloadPortfolio, userSub]);

  const saveHoldings = useCallback(
    (next: StoredPortfolioHolding[]) => {
      if (!userSub) return;
      writePortfolioToStorage(userSub, next);
      dispatchPortfolioUpdated(userSub);
      setHoldings(applyCachedPrices(userSub, next));
      setRecoveryOffer(getLegacyRecoveryOffer(userSub));
    },
    [userSub],
  );

  const recoverPortfolio = useCallback(() => {
    if (!userSub) return false;
    const recovered = recoverLegacyPortfolioToUser(userSub);
    if (recovered) reloadPortfolio();
    return recovered;
  }, [reloadPortfolio, userSub]);

  const dismissRecovery = useCallback(() => {
    if (!userSub) return;
    dismissLegacyPortfolioRecovery(userSub);
    setRecoveryOffer(null);
  }, [userSub]);

  return {
    userSub,
    authReady,
    holdings,
    setHoldings,
    portfolioReady,
    recoveryOffer,
    reloadPortfolio,
    saveHoldings,
    recoverPortfolio,
    dismissRecovery,
  };
}
