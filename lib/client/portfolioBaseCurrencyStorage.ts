import {
  assertUserSub,
  baseCurrencyStorageKey,
  isValidUserSub,
} from "@/lib/client/portfolioStorageKeys";
import {
  DEFAULT_PORTFOLIO_BASE_CURRENCY,
  normalizePortfolioBaseCurrency,
  type PortfolioBaseCurrency,
} from "@/lib/types/portfolioBaseCurrency";

export function readCachedBaseCurrency(
  userSub: string | null | undefined,
): PortfolioBaseCurrency | null {
  if (!isValidUserSub(userSub) || typeof localStorage === "undefined") {
    return null;
  }

  try {
    const raw = localStorage.getItem(baseCurrencyStorageKey(userSub));
    if (raw == null) return null;
    return normalizePortfolioBaseCurrency(raw);
  } catch {
    return null;
  }
}

export function writeCachedBaseCurrency(
  userSub: string,
  currency: PortfolioBaseCurrency,
): void {
  assertUserSub(userSub);
  if (typeof localStorage === "undefined") return;

  localStorage.setItem(
    baseCurrencyStorageKey(userSub),
    normalizePortfolioBaseCurrency(currency),
  );
}

export function clearCachedBaseCurrency(
  userSub: string | null | undefined,
): void {
  if (!isValidUserSub(userSub) || typeof localStorage === "undefined") {
    return;
  }

  try {
    localStorage.removeItem(baseCurrencyStorageKey(userSub));
  } catch {
    // Ignore storage failures on sign-out.
  }
}

export function resolveBaseCurrencyWithCacheFallback(
  cloudValue: unknown,
  userSub: string | null | undefined,
): PortfolioBaseCurrency {
  if (cloudValue != null && cloudValue !== "") {
    return normalizePortfolioBaseCurrency(cloudValue);
  }

  const cached = readCachedBaseCurrency(userSub);
  if (cached) return cached;

  return DEFAULT_PORTFOLIO_BASE_CURRENCY;
}
