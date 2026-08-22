"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  fetchPortfolioBaseCurrency,
  updatePortfolioBaseCurrency,
} from "@/lib/client/portfolioBaseCurrencyCloud";
import {
  clearCachedBaseCurrency,
  readCachedBaseCurrency,
  writeCachedBaseCurrency,
} from "@/lib/client/portfolioBaseCurrencyStorage";
import { useAuthenticatedUserSub } from "@/lib/client/useAuthenticatedUserSub";
import { createClient } from "@/lib/supabase/client";
import {
  DEFAULT_PORTFOLIO_BASE_CURRENCY,
  normalizePortfolioBaseCurrency,
  type PortfolioBaseCurrency,
} from "@/lib/types/portfolioBaseCurrency";

export type PortfolioBaseCurrencyStatus =
  | "loading"
  | "ready"
  | "saving"
  | "error";

/**
 * Authenticated loader for portfolio base currency.
 * Cloud `user_settings.base_currency` is source of truth; local cache is a
 * temporary fallback only and is namespaced by user id.
 */
export function usePortfolioBaseCurrency() {
  const supabase = useMemo(() => createClient(), []);
  const { userSub, authReady } = useAuthenticatedUserSub();
  const [baseCurrency, setBaseCurrency] = useState<PortfolioBaseCurrency>(
    DEFAULT_PORTFOLIO_BASE_CURRENCY,
  );
  const [status, setStatus] = useState<PortfolioBaseCurrencyStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (!authReady) return;

    let active = true;

    if (!userSub) {
      setBaseCurrency(DEFAULT_PORTFOLIO_BASE_CURRENCY);
      setStatus("ready");
      setError(null);
      setSaveSuccess(false);
      return;
    }

    const cached = readCachedBaseCurrency(userSub);
    if (cached) {
      setBaseCurrency(cached);
    }

    setStatus("loading");
    setError(null);
    setSaveSuccess(false);

    fetchPortfolioBaseCurrency(supabase, userSub)
      .then((currency) => {
        if (!active) return;
        setBaseCurrency(currency);
        writeCachedBaseCurrency(userSub, currency);
        setStatus("ready");
      })
      .catch((err: unknown) => {
        if (!active) return;
        const fallback =
          readCachedBaseCurrency(userSub) ?? DEFAULT_PORTFOLIO_BASE_CURRENCY;
        setBaseCurrency(fallback);
        setStatus("error");
        setError(
          err instanceof Error
            ? err.message
            : "Could not load portfolio base currency.",
        );
      });

    return () => {
      active = false;
    };
  }, [authReady, supabase, userSub]);

  useEffect(() => {
    if (authReady && !userSub) {
      // Account switch / sign-out: do not leave the previous user's preference in React state.
      setBaseCurrency(DEFAULT_PORTFOLIO_BASE_CURRENCY);
    }
  }, [authReady, userSub]);

  const saveBaseCurrency = useCallback(
    async (nextValue: unknown) => {
      if (!userSub) {
        setError("Sign in to change your portfolio base currency.");
        setStatus("error");
        return null;
      }

      const next = normalizePortfolioBaseCurrency(nextValue);
      setStatus("saving");
      setError(null);
      setSaveSuccess(false);

      try {
        const saved = await updatePortfolioBaseCurrency(
          supabase,
          userSub,
          next,
        );
        setBaseCurrency(saved);
        writeCachedBaseCurrency(userSub, saved);
        setStatus("ready");
        setSaveSuccess(true);
        return saved;
      } catch (err: unknown) {
        setStatus("error");
        setError(
          err instanceof Error
            ? err.message
            : "Could not save portfolio base currency.",
        );
        return null;
      }
    },
    [supabase, userSub],
  );

  const clearLocalPreferenceCache = useCallback(() => {
    clearCachedBaseCurrency(userSub);
  }, [userSub]);

  return {
    userSub,
    authReady,
    baseCurrency,
    status,
    error,
    saveSuccess,
    saveBaseCurrency,
    clearLocalPreferenceCache,
    isLoading: !authReady || status === "loading",
    isSaving: status === "saving",
  };
}
