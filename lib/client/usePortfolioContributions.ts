"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  createPortfolioContribution,
  deletePortfolioContribution,
  listPortfolioContributions,
  updatePortfolioContribution,
} from "@/lib/client/portfolioContributionsCloud";
import { useBaseCurrencyDisplay } from "@/lib/client/baseCurrencyDisplay";
import { calculateContributionSummary } from "@/lib/services/contributions/calculateContributionSummary";
import type {
  ContributionEntryDraft,
  ContributionHoldingOption,
  ContributionSummary,
  PortfolioContributionEntry,
} from "@/lib/services/contributions/types";
import { createClient } from "@/lib/supabase/client";
import { useActivePortfolioOptional } from "@/lib/client/useActivePortfolio";

const EMPTY_SUMMARY: ContributionSummary = {
  totalContributed: 0,
  totalWithdrawn: 0,
  netContributed: 0,
  currentValue: null,
  valueAboveContributions: null,
  valueAboveContributionsPercent: null,
  contributionCount: 0,
  withdrawalCount: 0,
  hasContributionData: false,
  contributionBasisReliable: false,
};

export function usePortfolioContributions(
  portfolioValueEur: number | null,
  portfolioValueAvailable: boolean,
  enabled = true,
  allowedHoldings: ContributionHoldingOption[] = [],
) {
  const supabase = useMemo(() => createClient(), []);
  const { userSub, baseCurrency, convertEur } = useBaseCurrencyDisplay();
  const activePortfolioId =
    useActivePortfolioOptional()?.activePortfolioId ?? null;
  const [entries, setEntries] = useState<PortfolioContributionEntry[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [isMutating, setIsMutating] = useState(false);

  const currentPortfolioValueBase = useMemo(() => {
    if (!portfolioValueAvailable || portfolioValueEur == null) {
      return null;
    }

    return convertEur(portfolioValueEur);
  }, [convertEur, portfolioValueAvailable, portfolioValueEur]);

  const summary = useMemo(
    () =>
      calculateContributionSummary(
        entries,
        currentPortfolioValueBase,
        baseCurrency,
      ),
    [baseCurrency, currentPortfolioValueBase, entries],
  );

  const reload = useCallback(async () => {
    if (!enabled || !userSub) {
      setEntries([]);
      setStatus("ready");
      setError(null);
      return;
    }

    setStatus("loading");
    setError(null);

    try {
      const nextEntries = await listPortfolioContributions(
        supabase,
        userSub,
        activePortfolioId,
      );
      setEntries(nextEntries);
      setStatus("ready");
    } catch (err) {
      setEntries([]);
      setStatus("error");
      setError(
        err instanceof Error
          ? err.message
          : "Could not load contribution entries.",
      );
    }
  }, [activePortfolioId, enabled, supabase, userSub]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const saveEntry = useCallback(
    async (draft: Partial<ContributionEntryDraft>, entryId?: string) => {
      if (!userSub) {
        throw new Error("Sign in to manage contributions.");
      }

      setIsMutating(true);
      setMutationError(null);

      try {
        const saveOptions = {
          allowedHoldings,
          portfolioId: activePortfolioId,
        };
        const saved = entryId
          ? await updatePortfolioContribution(
              supabase,
              userSub,
              entryId,
              draft,
              baseCurrency,
              saveOptions,
            )
          : await createPortfolioContribution(
              supabase,
              userSub,
              draft,
              baseCurrency,
              saveOptions,
            );

        setEntries((current) => {
          const withoutSaved = current.filter((entry) => entry.id !== saved.id);
          return [saved, ...withoutSaved].sort((left, right) => {
            const dateCompare = right.entryDate.localeCompare(left.entryDate);
            if (dateCompare !== 0) {
              return dateCompare;
            }
            return right.createdAt.localeCompare(left.createdAt);
          });
        });

        return saved;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Could not save contribution entry.";
        setMutationError(message);
        throw err;
      } finally {
        setIsMutating(false);
      }
    },
    [activePortfolioId, allowedHoldings, baseCurrency, supabase, userSub],
  );

  const removeEntry = useCallback(
    async (entryId: string) => {
      if (!userSub) {
        throw new Error("Sign in to manage contributions.");
      }

      setIsMutating(true);
      setMutationError(null);

      try {
        await deletePortfolioContribution(supabase, userSub, entryId);
        setEntries((current) => current.filter((entry) => entry.id !== entryId));
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Could not delete contribution entry.";
        setMutationError(message);
        throw err;
      } finally {
        setIsMutating(false);
      }
    },
    [supabase, userSub],
  );

  return {
    entries,
    summary: enabled ? summary : EMPTY_SUMMARY,
    status,
    error,
    mutationError,
    isLoading: status === "loading",
    isMutating,
    reload,
    saveEntry,
    removeEntry,
    hasEntries: entries.length > 0,
    portfolioValueAvailable,
  };
}
