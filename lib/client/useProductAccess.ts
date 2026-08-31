"use client";

import { useEffect, useState } from "react";

import { useAuthenticatedUserSub } from "@/lib/client/useAuthenticatedUserSub";
import {
  DEFAULT_FREE_PRODUCT_ACCESS,
  fetchExamplePortfolioStatus,
  peekExamplePortfolioStatus,
  productAccessFromStatusPayload,
  subscribeExamplePortfolioStatus,
  type ExamplePortfolioStatusPayload,
} from "@/lib/client/examplePortfolioStatusCache";
import type { ProductAccess } from "@/lib/services/productAccess";

export type ClientProductAccess = ProductAccess & {
  /** True after the first status resolve (success or fallback). */
  accessReady: boolean;
};

function applyPayload(payload: ExamplePortfolioStatusPayload | null): ProductAccess {
  return productAccessFromStatusPayload(payload);
}

/**
 * Central client product access for intelligence depth.
 * Session-scoped status cache — never invents entitlements.
 * Until status loads, callers must not reveal plan-specific UI.
 */
export function useProductAccess(enabled = true): ClientProductAccess {
  const { userSub, authReady } = useAuthenticatedUserSub();
  const peeked = peekExamplePortfolioStatus(userSub);
  const [access, setAccess] = useState<ProductAccess>(() =>
    peeked ? applyPayload(peeked) : DEFAULT_FREE_PRODUCT_ACCESS,
  );
  const [fetched, setFetched] = useState(() => peeked !== null);

  useEffect(() => {
    if (!enabled) {
      setAccess(DEFAULT_FREE_PRODUCT_ACCESS);
      setFetched(false);
      return;
    }

    if (!authReady) {
      return;
    }

    if (!userSub) {
      setAccess(DEFAULT_FREE_PRODUCT_ACCESS);
      setFetched(true);
      void fetchExamplePortfolioStatus({ userSub: null });
      return;
    }

    const syncFromCache = () => {
      const peeked = peekExamplePortfolioStatus(userSub);
      if (peeked) {
        setAccess(applyPayload(peeked));
        setFetched(true);
      }
    };

    syncFromCache();
    const unsubscribe = subscribeExamplePortfolioStatus(syncFromCache);

    void fetchExamplePortfolioStatus({ userSub }).then((payload) => {
      setAccess(applyPayload(payload));
      setFetched(true);
    });

    return unsubscribe;
  }, [authReady, enabled, userSub]);

  const view = peeked ? applyPayload(peeked) : access;
  return {
    ...view,
    accessReady: !enabled || fetched || peeked !== null,
  };
}
