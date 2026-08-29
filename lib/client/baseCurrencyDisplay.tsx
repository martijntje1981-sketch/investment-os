"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { usePortfolioBaseCurrency } from "@/lib/client/usePortfolioBaseCurrency";
import {
  canPersistBaseCurrencyAmounts,
  convertBaseAmountToCanonicalEur,
  convertCanonicalEurAmount,
  formatBaseCurrencyAmount,
  formatBaseCurrencyCompact,
  FX_UNAVAILABLE_SAVE_MESSAGE,
  IDENTITY_EUR_FX_SNAPSHOT,
  type BaseCurrencyFxSnapshot,
} from "@/lib/services/prices/baseCurrencyFxSnapshot";
import {
  DEFAULT_PORTFOLIO_BASE_CURRENCY,
  portfolioBaseCurrencySymbol,
  type PortfolioBaseCurrency,
} from "@/lib/types/portfolioBaseCurrency";

type BaseCurrencyDisplayContextValue = {
  userSub: string | null;
  baseCurrency: PortfolioBaseCurrency;
  snapshot: BaseCurrencyFxSnapshot;
  fxReady: boolean;
  preferenceReady: boolean;
  isSavingPreference: boolean;
  preferenceError: string | null;
  preferenceSaveSuccess: boolean;
  currencySymbol: string;
  canPersistMonetary: boolean;
  fxUnavailableSaveMessage: string;
  saveBaseCurrency: (
    next: unknown,
  ) => Promise<PortfolioBaseCurrency | null>;
  formatEur: (amountEur: number | null | undefined, decimals?: number) => string;
  formatEurCompact: (amountEur: number | null | undefined) => string;
  convertEur: (amountEur: number | null | undefined) => number | null;
  convertToEur: (amountBase: number | null | undefined) => number | null;
  refreshFx: () => void;
};

const BaseCurrencyDisplayContext =
  createContext<BaseCurrencyDisplayContextValue | null>(null);

const clientFxInFlight = new Map<string, Promise<BaseCurrencyFxSnapshot>>();

export async function fetchFxSnapshotFromPricesApi(
  baseCurrency: PortfolioBaseCurrency,
): Promise<BaseCurrencyFxSnapshot> {
  if (baseCurrency === "EUR") {
    return IDENTITY_EUR_FX_SNAPSHOT;
  }

  const existing = clientFxInFlight.get(baseCurrency);
  if (existing) {
    return existing;
  }

  const request = (async () => {
    const response = await fetch("/api/prices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fxSnapshotOnly: true,
        baseCurrency,
      }),
    });

    if (!response.ok) {
      throw new Error("Could not load FX rates for display currency.");
    }

    const payload = (await response.json()) as {
      success?: boolean;
      fxSnapshot?: BaseCurrencyFxSnapshot;
    };

    if (!payload.success || !payload.fxSnapshot) {
      throw new Error("FX snapshot unavailable.");
    }

    return payload.fxSnapshot;
  })();

  clientFxInFlight.set(baseCurrency, request);
  try {
    return await request;
  } finally {
    clientFxInFlight.delete(baseCurrency);
  }
}

function unavailableSnapshot(
  baseCurrency: PortfolioBaseCurrency,
): BaseCurrencyFxSnapshot {
  return {
    baseCurrency,
    eurToBaseRate: null,
    source: "EODHD",
    updatedAt: null,
    status: "unavailable",
    conversionPath:
      baseCurrency === "USD"
        ? "EUR → USD via EURUSD.FOREX (unavailable)"
        : "EUR → GBP via EURGBP.FOREX (unavailable)",
    foreignToEurRate: null,
  };
}

export function BaseCurrencyDisplayProvider({
  children,
}: {
  children: ReactNode;
}) {
  const preference = usePortfolioBaseCurrency();
  const {
    baseCurrency,
    authReady,
    isLoading: preferenceLoading,
    userSub,
    isSaving,
    error,
    saveSuccess,
    saveBaseCurrency,
  } = preference;
  const [snapshot, setSnapshot] = useState<BaseCurrencyFxSnapshot>(
    IDENTITY_EUR_FX_SNAPSHOT,
  );
  const [fxReady, setFxReady] = useState(true);
  const requestIdRef = useRef(0);
  const unavailableRetryRef = useRef(0);
  const lastGoodByCurrencyRef = useRef<
    Partial<Record<PortfolioBaseCurrency, BaseCurrencyFxSnapshot>>
  >({});

  const loadFx = useCallback(async (currency: PortfolioBaseCurrency) => {
    const requestId = ++requestIdRef.current;
    if (currency === "EUR") {
      setSnapshot(IDENTITY_EUR_FX_SNAPSHOT);
      setFxReady(true);
      unavailableRetryRef.current = 0;
      return;
    }

    setFxReady(false);
    try {
      const next = await fetchFxSnapshotFromPricesApi(currency);
      if (requestId !== requestIdRef.current) return;
      setSnapshot(next);
      if (next.status !== "unavailable" && next.eurToBaseRate != null) {
        lastGoodByCurrencyRef.current[currency] = next;
        unavailableRetryRef.current = 0;
      }
    } catch {
      if (requestId !== requestIdRef.current) return;
      setSnapshot(unavailableSnapshot(currency));
    } finally {
      if (requestId === requestIdRef.current) {
        setFxReady(true);
      }
    }
  }, []);

  useEffect(() => {
    if (!authReady) return;
    unavailableRetryRef.current = 0;
    void loadFx(userSub ? baseCurrency : DEFAULT_PORTFOLIO_BASE_CURRENCY);
  }, [authReady, baseCurrency, loadFx, userSub]);

  // One automatic recovery when presentation FX is unavailable (e.g. prior cold
  // snapshotOnly miss that a concurrent market refresh has since warmed).
  useEffect(() => {
    if (!authReady || !userSub || baseCurrency === "EUR" || !fxReady) {
      return;
    }
    if (snapshot.baseCurrency !== baseCurrency) {
      return;
    }
    if (snapshot.status !== "unavailable") {
      return;
    }
    if (unavailableRetryRef.current >= 1) {
      return;
    }
    unavailableRetryRef.current += 1;
    const timer = window.setTimeout(() => {
      void loadFx(baseCurrency);
    }, 750);
    return () => window.clearTimeout(timer);
  }, [authReady, baseCurrency, fxReady, loadFx, snapshot, userSub]);

  const resolvedSnapshot = useMemo(() => {
    if (!userSub || baseCurrency === "EUR") {
      return IDENTITY_EUR_FX_SNAPSHOT;
    }
    if (snapshot.baseCurrency === baseCurrency) {
      return snapshot;
    }
    const lastGood = lastGoodByCurrencyRef.current[baseCurrency];
    if (!fxReady && lastGood) {
      return lastGood;
    }
    return unavailableSnapshot(baseCurrency);
  }, [baseCurrency, fxReady, snapshot, userSub]);

  const value = useMemo<BaseCurrencyDisplayContextValue>(() => {
    const resolvedCurrency = userSub
      ? baseCurrency
      : DEFAULT_PORTFOLIO_BASE_CURRENCY;
    return {
      userSub,
      baseCurrency: resolvedCurrency,
      snapshot: resolvedSnapshot,
      fxReady: baseCurrency === "EUR" ? true : fxReady,
      preferenceReady: authReady && !preferenceLoading,
      isSavingPreference: isSaving,
      preferenceError: error,
      preferenceSaveSuccess: saveSuccess,
      currencySymbol: portfolioBaseCurrencySymbol(resolvedCurrency),
      canPersistMonetary: canPersistBaseCurrencyAmounts(resolvedSnapshot),
      fxUnavailableSaveMessage: FX_UNAVAILABLE_SAVE_MESSAGE,
      saveBaseCurrency: async (next) => {
        const saved = await saveBaseCurrency(next);
        if (saved) {
          void loadFx(saved);
        }
        return saved;
      },
      formatEur: (amountEur, decimals = 0) =>
        formatBaseCurrencyAmount(amountEur, resolvedSnapshot, decimals),
      formatEurCompact: (amountEur) =>
        formatBaseCurrencyCompact(amountEur, resolvedSnapshot),
      convertEur: (amountEur) =>
        convertCanonicalEurAmount(amountEur, resolvedSnapshot),
      convertToEur: (amountBase) =>
        convertBaseAmountToCanonicalEur(amountBase, resolvedSnapshot),
      refreshFx: () => {
        void loadFx(baseCurrency);
      },
    };
  }, [
    authReady,
    baseCurrency,
    error,
    fxReady,
    isSaving,
    loadFx,
    preferenceLoading,
    resolvedSnapshot,
    saveBaseCurrency,
    saveSuccess,
    userSub,
  ]);

  return (
    <BaseCurrencyDisplayContext.Provider value={value}>
      {children}
    </BaseCurrencyDisplayContext.Provider>
  );
}

export function useBaseCurrencyDisplay(): BaseCurrencyDisplayContextValue {
  const context = useContext(BaseCurrencyDisplayContext);
  if (!context) {
    return {
      userSub: null,
      baseCurrency: DEFAULT_PORTFOLIO_BASE_CURRENCY,
      snapshot: IDENTITY_EUR_FX_SNAPSHOT,
      fxReady: true,
      preferenceReady: true,
      isSavingPreference: false,
      preferenceError: null,
      preferenceSaveSuccess: false,
      currencySymbol: portfolioBaseCurrencySymbol(DEFAULT_PORTFOLIO_BASE_CURRENCY),
      canPersistMonetary: true,
      fxUnavailableSaveMessage: FX_UNAVAILABLE_SAVE_MESSAGE,
      saveBaseCurrency: async () => null,
      formatEur: (amountEur, decimals = 0) =>
        formatBaseCurrencyAmount(amountEur, IDENTITY_EUR_FX_SNAPSHOT, decimals),
      formatEurCompact: (amountEur) =>
        formatBaseCurrencyCompact(amountEur, IDENTITY_EUR_FX_SNAPSHOT),
      convertEur: (amountEur) =>
        convertCanonicalEurAmount(amountEur, IDENTITY_EUR_FX_SNAPSHOT),
      convertToEur: (amountBase) =>
        convertBaseAmountToCanonicalEur(amountBase, IDENTITY_EUR_FX_SNAPSHOT),
      refreshFx: () => undefined,
    };
  }
  return context;
}
