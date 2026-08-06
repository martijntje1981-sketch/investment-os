/**
 * Non-destructive local backup of the last complete portfolio (investments + cash).
 * Used when sync corruption reduces the active portfolio to cash-only.
 */

import { portfolioStorageKey } from "@/lib/client/portfolioStorageKeys";
import {
  readPortfolioFromStorage,
  writePortfolioToStorage,
} from "@/lib/client/userPortfolioStorage";
import {
  summarizePortfolioHoldings,
  type PortfolioHoldingsSummary,
} from "@/lib/services/portfolio/portfolioPersistenceGuard";
import { portfolioContentFingerprint } from "@/lib/services/portfolio/idempotency";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";
import { assertUserSub, isValidUserSub } from "@/lib/client/portfolioStorageKeys";

function portfolioBackupKey(userSub: string): string {
  return `${portfolioStorageKey(userSub)}:backup`;
}

export type PortfolioBackupSummary = PortfolioHoldingsSummary & {
  fingerprint: string;
  savedAt: string;
};

export type PortfolioBackupRecoveryOffer = PortfolioBackupSummary & {
  canRecover: true;
  source: "local_backup";
  holdingCount: number;
  investmentCount: number;
  cashCount: number;
  cashCurrencies: string[];
};

function readBackupRaw(userSub: string): StoredPortfolioHolding[] {
  try {
    const raw = localStorage.getItem(portfolioBackupKey(userSub));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as {
      savedAt?: string;
      holdings?: StoredPortfolioHolding[];
    };
    return Array.isArray(parsed.holdings) ? parsed.holdings : [];
  } catch {
    return [];
  }
}

export function writePortfolioBackupIfComplete(
  userSub: string,
  holdings: StoredPortfolioHolding[],
): boolean {
  assertUserSub(userSub);
  const summary = summarizePortfolioHoldings(holdings);
  if (summary.investments === 0) {
    return false;
  }

  localStorage.setItem(
    portfolioBackupKey(userSub),
    JSON.stringify({
      savedAt: new Date().toISOString(),
      fingerprint: portfolioContentFingerprint(holdings, null),
      summary,
      holdings,
    }),
  );
  return true;
}

export function getPortfolioBackupRecoveryOffer(
  userSub: string | null | undefined,
): PortfolioBackupRecoveryOffer | null {
  if (!isValidUserSub(userSub)) return null;

  const current = readPortfolioFromStorage(userSub);
  const backup = readBackupRaw(userSub);
  if (backup.length === 0) return null;

  const currentSummary = summarizePortfolioHoldings(current);
  const backupSummary = summarizePortfolioHoldings(backup);

  if (backupSummary.investments === 0) return null;

  const currentFingerprint = portfolioContentFingerprint(current, null);
  const backupFingerprint = portfolioContentFingerprint(backup, null);
  if (currentFingerprint === backupFingerprint) return null;

  if (
    currentSummary.investments >= backupSummary.investments &&
    currentSummary.total >= backupSummary.total
  ) {
    return null;
  }

  let savedAt = new Date().toISOString();
  try {
    const raw = localStorage.getItem(portfolioBackupKey(userSub));
    if (raw) {
      const parsed = JSON.parse(raw) as { savedAt?: string };
      if (parsed.savedAt) savedAt = parsed.savedAt;
    }
  } catch {
    // ignore
  }

  return {
    ...backupSummary,
    holdingCount: backupSummary.total,
    investmentCount: backupSummary.investments,
    cashCount: backupSummary.cash,
    cashCurrencies: backup
      .filter((holding) => holding.assetType === "cash")
      .map((holding) => holding.currency || holding.symbol || "EUR"),
    fingerprint: backupFingerprint,
    savedAt,
    canRecover: true,
    source: "local_backup",
  };
}

export function restorePortfolioFromBackup(userSub: string): boolean {
  assertUserSub(userSub);
  const backup = readBackupRaw(userSub);
  if (backup.length === 0) return false;

  writePortfolioToStorage(userSub, backup);
  return true;
}
