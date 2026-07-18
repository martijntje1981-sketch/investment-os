/**
 * User-scoped portfolio persistence. Never reads or writes unscoped legacy keys
 * unless an explicit one-time migration is requested.
 */

import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";
import {
  LEGACY_MIGRATION_SESSION_FLAG,
  LEGACY_PORTFOLIO_STORAGE_KEY,
  PORTFOLIO_HOLDINGS_UPDATED_EVENT,
  assertUserSub,
  isValidUserSub,
  legacyMigrationFlagKey,
  portfolioStorageKey,
} from "@/lib/client/portfolioStorageKeys";

function normalizeStoredHoldings(
  parsed: unknown,
): StoredPortfolioHolding[] {
  if (!Array.isArray(parsed)) return [];

  return parsed
    .filter((item) => item && typeof item === "object")
    .map((item) => {
      const holding = item as StoredPortfolioHolding;
      return {
        ...holding,
        symbol: String(holding.symbol ?? "")
          .trim()
          .toUpperCase(),
        assetType:
          holding.assetType === "cash" ? "cash" : "investment",
      };
    });
}

/** Marks that the current browser session may perform a one-time legacy import. */
export function requestLegacyPortfolioMigration(): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(LEGACY_MIGRATION_SESSION_FLAG, "1");
}

/**
 * One-time explicit migration from the legacy unscoped key to the authenticated
 * user's scoped key. Does nothing unless the session migration flag is set.
 */
export function tryExplicitLegacyPortfolioMigration(
  userSub: string,
): boolean {
  assertUserSub(userSub);

  if (typeof window === "undefined") return false;

  const migrationRequested =
    sessionStorage.getItem(LEGACY_MIGRATION_SESSION_FLAG) === "1";
  if (!migrationRequested) return false;

  if (localStorage.getItem(legacyMigrationFlagKey(userSub)) === "1") {
    sessionStorage.removeItem(LEGACY_MIGRATION_SESSION_FLAG);
    return false;
  }

  const scopedKey = portfolioStorageKey(userSub);
  if (localStorage.getItem(scopedKey)) {
    sessionStorage.removeItem(LEGACY_MIGRATION_SESSION_FLAG);
    return false;
  }

  const legacyRaw = localStorage.getItem(LEGACY_PORTFOLIO_STORAGE_KEY);
  if (!legacyRaw) {
    sessionStorage.removeItem(LEGACY_MIGRATION_SESSION_FLAG);
    return false;
  }

  try {
    const legacyHoldings = normalizeStoredHoldings(JSON.parse(legacyRaw));
    if (legacyHoldings.length === 0) {
      sessionStorage.removeItem(LEGACY_MIGRATION_SESSION_FLAG);
      return false;
    }

    localStorage.setItem(scopedKey, JSON.stringify(legacyHoldings));
    localStorage.setItem(legacyMigrationFlagKey(userSub), "1");
    sessionStorage.removeItem(LEGACY_MIGRATION_SESSION_FLAG);
    return true;
  } catch {
    sessionStorage.removeItem(LEGACY_MIGRATION_SESSION_FLAG);
    return false;
  }
}

export function readPortfolioFromStorage(
  userSub: string,
): StoredPortfolioHolding[] {
  assertUserSub(userSub);

  tryExplicitLegacyPortfolioMigration(userSub);

  try {
    const stored = localStorage.getItem(portfolioStorageKey(userSub));
    if (!stored) return [];
    return normalizeStoredHoldings(JSON.parse(stored));
  } catch {
    return [];
  }
}

export function writePortfolioToStorage(
  userSub: string,
  holdings: StoredPortfolioHolding[],
): void {
  assertUserSub(userSub);
  localStorage.setItem(
    portfolioStorageKey(userSub),
    JSON.stringify(holdings),
  );
}

export function dispatchPortfolioUpdated(userSub: string): void {
  assertUserSub(userSub);
  window.dispatchEvent(
    new CustomEvent(PORTFOLIO_HOLDINGS_UPDATED_EVENT, {
      detail: { userSub },
    }),
  );
}

/**
 * Pure helper used by pages and tests to derive visible portfolio state whenever
 * auth changes. Clears in-memory holdings until auth is ready or when signed out.
 */
export function resolveVisiblePortfolioState(
  userSub: string | null,
  authReady: boolean,
  readForUser: (sub: string) => StoredPortfolioHolding[] = readPortfolioFromStorage,
): { holdings: StoredPortfolioHolding[]; portfolioReady: boolean } {
  if (!authReady) {
    return { holdings: [], portfolioReady: false };
  }

  if (!isValidUserSub(userSub)) {
    return { holdings: [], portfolioReady: true };
  }

  return {
    holdings: readForUser(userSub),
    portfolioReady: true,
  };
}
