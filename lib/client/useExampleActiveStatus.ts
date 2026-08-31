"use client";

import { useEffect, useState } from "react";

import { useAuthenticatedUserSub } from "@/lib/client/useAuthenticatedUserSub";
import {
  fetchExamplePortfolioStatus,
  isExampleActiveFromStatusPayload,
  peekExamplePortfolioStatus,
  subscribeExamplePortfolioStatus,
} from "@/lib/client/examplePortfolioStatusCache";

/**
 * Lightweight Example Portfolio active flag for first-run UI.
 * Uses the shared session status cache — never infers from metadata alone.
 */
export function useExampleActiveStatus(enabled = true): boolean {
  const { userSub, authReady } = useAuthenticatedUserSub();
  const peeked = peekExamplePortfolioStatus(userSub);
  const peekedActive = isExampleActiveFromStatusPayload(peeked);
  const [active, setActive] = useState(() => (enabled ? peekedActive : false));

  useEffect(() => {
    if (!enabled || !authReady || !userSub) {
      setActive(false);
      return;
    }

    const syncFromCache = () => {
      const peeked = peekExamplePortfolioStatus(userSub);
      if (peeked) {
        setActive(isExampleActiveFromStatusPayload(peeked));
      }
    };

    syncFromCache();
    const unsubscribe = subscribeExamplePortfolioStatus(syncFromCache);

    void fetchExamplePortfolioStatus({ userSub }).then((payload) => {
      setActive(isExampleActiveFromStatusPayload(payload));
    });

    return unsubscribe;
  }, [authReady, enabled, userSub]);

  if (!enabled) return false;
  return peeked ? peekedActive : active;
}
