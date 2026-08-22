/**
 * Browser portfolio recovery from legacy unscoped localStorage.
 *
 * Before commit 6558134, holdings lived under `investment-os-holdings`.
 * Authenticated users now use `investment-os-holdings:${userSub}`.
 * Recovery copies legacy data into the current user's scoped key only after
 * explicit confirmation — legacy data is never deleted.
 */

import type { CachedPortfolioPrice } from "@/lib/types/portfolioStorage";
import {
  LEGACY_PORTFOLIO_STORAGE_KEY,
  LEGACY_PRICE_CACHE_KEY,
  legacyMigrationFlagKey,
  legacyRecoveryDismissedKey,
  portfolioStorageKey,
  priceCacheKey,
  isValidUserSub,
} from "@/lib/client/portfolioStorageKeys";
import {
  dispatchPortfolioUpdated,
  normalizeStoredHoldings,
  readScopedHoldingsRaw,
} from "@/lib/client/userPortfolioStorage";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

export type LegacyRecoverySummary = {
  holdingCount: number;
  investmentCount: number;
  cashCount: number;
  cashCurrencies: string[];
  fingerprint: string;
};

export type LegacyRecoveryOffer = LegacyRecoverySummary & {
  canRecover: true;
};

function readLegacyHoldingsRaw(): StoredPortfolioHolding[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem(LEGACY_PORTFOLIO_STORAGE_KEY);
    if (!stored) return [];
    return normalizeStoredHoldings(JSON.parse(stored));
  } catch {
    return [];
  }
}

function summarizeLegacyHoldings(
  holdings: StoredPortfolioHolding[],
): LegacyRecoverySummary {
  const cashHoldings = holdings.filter((holding) => holding.assetType === "cash");

  return {
    holdingCount: holdings.length,
    investmentCount: holdings.length - cashHoldings.length,
    cashCount: cashHoldings.length,
    cashCurrencies: [
      ...new Set(
        cashHoldings.map(
          (holding) => holding.currency || holding.symbol || "EUR",
        ),
      ),
    ],
    fingerprint: buildLegacyFingerprint(holdings),
  };
}

export function buildLegacyFingerprint(
  holdings: StoredPortfolioHolding[],
): string {
  return holdings
    .map(
      (holding) =>
        `${holding.id}:${holding.symbol}:${holding.quantity}:${holding.assetType ?? "investment"}`,
    )
    .join("|");
}

export function isScopedPortfolioEmpty(userSub: string): boolean {
  return readScopedHoldingsRaw(userSub).length === 0;
}

export function getLegacyRecoveryOffer(
  userSub: string | null | undefined,
): LegacyRecoveryOffer | null {
  if (!isValidUserSub(userSub)) return null;
  if (!isScopedPortfolioEmpty(userSub)) return null;

  const legacyHoldings = readLegacyHoldingsRaw();
  if (legacyHoldings.length === 0) return null;

  const summary = summarizeLegacyHoldings(legacyHoldings);

  if (
    localStorage.getItem(legacyRecoveryDismissedKey(userSub)) ===
    summary.fingerprint
  ) {
    return null;
  }

  return { ...summary, canRecover: true };
}

function parsePriceCache(raw: string | null): CachedPortfolioPrice[] {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(
        (item) =>
          item &&
          typeof item === "object" &&
          Number.isFinite(item.price) &&
          item.price > 0,
      )
      .map((item) => ({
        symbol: String(item.symbol ?? "")
          .trim()
          .toUpperCase(),
        providerSymbol: item.providerSymbol
          ? String(item.providerSymbol).trim().toUpperCase()
          : undefined,
        isin: item.isin ? String(item.isin).trim().toUpperCase() : null,
        price: item.price,
        previousClose:
          typeof item.previousClose === "number" ? item.previousClose : undefined,
        change: typeof item.change === "number" ? item.change : undefined,
        changePercent:
          typeof item.changePercent === "number"
            ? item.changePercent
            : undefined,
        currency: typeof item.currency === "string" ? item.currency : null,
        dataStatus: item.dataStatus,
        updatedAt:
          typeof item.updatedAt === "string" ? item.updatedAt : undefined,
      }));
  } catch {
    return [];
  }
}

function cacheEntryKey(entry: CachedPortfolioPrice): string {
  const parts = [
    entry.symbol,
    entry.providerSymbol ?? "",
    entry.isin ?? "",
  ]
    .map((part) => String(part).trim().toUpperCase())
    .filter(Boolean);

  return parts.join("|") || entry.symbol;
}

function cacheEntryTimestamp(entry: CachedPortfolioPrice): number {
  if (!entry.updatedAt) return 0;
  const parsed = Date.parse(entry.updatedAt);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Idempotently merges compatible legacy cached prices into the current user's
 * scoped cache. Never reads another user's scoped cache or deletes legacy data.
 */
export function mergeLegacyPriceCacheIntoScoped(userSub: string): boolean {
  if (!isValidUserSub(userSub)) return false;

  const legacyEntries = parsePriceCache(
    localStorage.getItem(LEGACY_PRICE_CACHE_KEY),
  );
  if (legacyEntries.length === 0) return false;

  const scopedKey = priceCacheKey(userSub);
  const scopedEntries = parsePriceCache(localStorage.getItem(scopedKey));
  const merged = new Map<string, CachedPortfolioPrice>();

  for (const entry of scopedEntries) {
    merged.set(cacheEntryKey(entry), entry);
  }

  let changed = scopedEntries.length === 0 && legacyEntries.length > 0;

  for (const entry of legacyEntries) {
    const key = cacheEntryKey(entry);
    const existing = merged.get(key);

    if (!existing) {
      merged.set(key, entry);
      changed = true;
      continue;
    }

    if (cacheEntryTimestamp(entry) > cacheEntryTimestamp(existing)) {
      merged.set(key, entry);
      changed = true;
    }
  }

  if (!changed) {
    return false;
  }

  const nextCache = Array.from(merged.values());
  localStorage.setItem(scopedKey, JSON.stringify(nextCache));
  return true;
}

function copyLegacyPriceCacheIfNeeded(userSub: string): void {
  mergeLegacyPriceCacheIntoScoped(userSub);
}

/**
 * Idempotently copies legacy unscoped portfolio data into the current user's
 * scoped storage. Never deletes legacy data or reads another user's scoped key.
 */
export function recoverLegacyPortfolioToUser(userSub: string): boolean {
  if (!isValidUserSub(userSub)) return false;
  if (!isScopedPortfolioEmpty(userSub)) return false;

  const legacyHoldings = readLegacyHoldingsRaw();
  if (legacyHoldings.length === 0) return false;

  const scopedKey = portfolioStorageKey(userSub);
  const existingScoped = localStorage.getItem(scopedKey);
  if (existingScoped) {
    const parsed = normalizeStoredHoldings(JSON.parse(existingScoped));
    if (parsed.length > 0) return false;
  }

  localStorage.setItem(scopedKey, JSON.stringify(legacyHoldings));
  localStorage.setItem(legacyMigrationFlagKey(userSub), "1");
  localStorage.removeItem(legacyRecoveryDismissedKey(userSub));
  copyLegacyPriceCacheIfNeeded(userSub);
  dispatchPortfolioUpdated(userSub);
  return true;
}

export function dismissLegacyPortfolioRecovery(userSub: string): void {
  if (!isValidUserSub(userSub)) return;

  const legacyHoldings = readLegacyHoldingsRaw();
  if (legacyHoldings.length === 0) return;

  localStorage.setItem(
    legacyRecoveryDismissedKey(userSub),
    buildLegacyFingerprint(legacyHoldings),
  );
}

export function readLegacyHoldingsForDiagnostics(): StoredPortfolioHolding[] {
  return readLegacyHoldingsRaw();
}
