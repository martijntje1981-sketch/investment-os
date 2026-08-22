"use client";

import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  readActivePortfolioId,
  writeActivePortfolioId,
} from "@/lib/client/activePortfolioStorage";
import {
  createUserPortfolio,
  fetchUserPortfolios,
  renameUserPortfolio,
} from "@/lib/client/portfoliosApi";
import { useAuthenticatedUserSub } from "@/lib/client/useAuthenticatedUserSub";
import { sanitizePortfolioOneName } from "@/lib/client/portfolioOne";
import {
  annotatePortfolioAccess,
  resolveActivePortfolioId,
  type AccessiblePortfolio,
} from "@/lib/services/portfolios/access";
import { FREE_MAX_PORTFOLIOS } from "@/lib/services/productAccess/portfolioEntitlement";

type ActivePortfolioContextValue = {
  ready: boolean;
  portfolios: AccessiblePortfolio[];
  activePortfolioId: string | null;
  activePortfolio: AccessiblePortfolio | null;
  maxPortfolios: number;
  canCreate: boolean;
  selectPortfolio: (portfolioId: string) => boolean;
  createPortfolio: (name: string) => Promise<
    | { ok: true; portfolio: AccessiblePortfolio }
    | { ok: false; error: string; code?: string }
  >;
  renamePortfolio: (portfolioId: string, name: string) => Promise<boolean>;
  refreshPortfolios: () => Promise<void>;
};

const ActivePortfolioContext = createContext<ActivePortfolioContextValue | null>(
  null,
);

export function ActivePortfolioProvider({ children }: { children: ReactNode }) {
  const { userSub, authReady } = useAuthenticatedUserSub();
  const [ready, setReady] = useState(false);
  const [portfolios, setPortfolios] = useState<AccessiblePortfolio[]>([]);
  const [activePortfolioId, setActivePortfolioId] = useState<string | null>(null);
  const [maxPortfolios, setMaxPortfolios] = useState(FREE_MAX_PORTFOLIOS);
  const [canCreate, setCanCreate] = useState(false);

  const refreshPortfolios = useCallback(async () => {
    if (!userSub) {
      setPortfolios([]);
      setActivePortfolioId(null);
      setReady(true);
      return;
    }

    try {
      const payload = await fetchUserPortfolios();
      const next = annotatePortfolioAccess(
        payload.portfolios ?? [],
        payload.maxPortfolios ?? FREE_MAX_PORTFOLIOS,
      );
      const nextId = resolveActivePortfolioId(
        next,
        readActivePortfolioId(userSub),
      );
      setPortfolios(next);
      setMaxPortfolios(payload.maxPortfolios ?? FREE_MAX_PORTFOLIOS);
      setCanCreate(payload.canCreate === true);
      setActivePortfolioId(nextId);
      if (nextId) writeActivePortfolioId(userSub, nextId);
    } catch {
      setPortfolios([]);
    } finally {
      setReady(true);
    }
  }, [userSub]);

  useEffect(() => {
    if (!authReady) {
      setReady(false);
      return;
    }
    void refreshPortfolios();
  }, [authReady, refreshPortfolios]);

  const selectPortfolio = useCallback(
    (portfolioId: string) => {
      const match = portfolios.find((portfolio) => portfolio.id === portfolioId);
      if (!match?.accessible) return false;
      setActivePortfolioId(match.id);
      writeActivePortfolioId(userSub, match.id);
      return true;
    },
    [portfolios, userSub],
  );

  const createPortfolio = useCallback(
    async (name: string) => {
      const result = await createUserPortfolio(sanitizePortfolioOneName(name));
      if (!result.ok) return result;
      await refreshPortfolios();
      writeActivePortfolioId(userSub, result.portfolio.id);
      setActivePortfolioId(result.portfolio.id);
      return result;
    },
    [refreshPortfolios, userSub],
  );

  const renamePortfolio = useCallback(
    async (portfolioId: string, name: string) => {
      const result = await renameUserPortfolio(
        portfolioId,
        sanitizePortfolioOneName(name),
      );
      if (!result.ok) return false;
      setPortfolios((current) =>
        current.map((portfolio) =>
          portfolio.id === portfolioId
            ? { ...portfolio, name: result.name }
            : portfolio,
        ),
      );
      return true;
    },
    [],
  );

  const activePortfolio =
    portfolios.find((portfolio) => portfolio.id === activePortfolioId) ?? null;

  const value = useMemo<ActivePortfolioContextValue>(
    () => ({
      ready,
      portfolios,
      activePortfolioId,
      activePortfolio,
      maxPortfolios,
      canCreate,
      selectPortfolio,
      createPortfolio,
      renamePortfolio,
      refreshPortfolios,
    }),
    [
      activePortfolio,
      activePortfolioId,
      canCreate,
      createPortfolio,
      maxPortfolios,
      portfolios,
      ready,
      refreshPortfolios,
      renamePortfolio,
      selectPortfolio,
    ],
  );

  return createElement(ActivePortfolioContext.Provider, { value }, children);
}

export function useActivePortfolioOptional(): ActivePortfolioContextValue | null {
  return useContext(ActivePortfolioContext);
}

export function useActivePortfolio(): ActivePortfolioContextValue {
  const value = useContext(ActivePortfolioContext);
  if (!value) {
    throw new Error("useActivePortfolio must be used within ActivePortfolioProvider");
  }
  return value;
}
