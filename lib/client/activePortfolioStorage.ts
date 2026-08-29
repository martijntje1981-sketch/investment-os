import { isValidUserSub } from "@/lib/client/portfolioStorageKeys";

export function activePortfolioStorageKey(userSub: string): string {
  return `tobailey.active-portfolio:${userSub}`;
}

export function readActivePortfolioId(
  userSub: string | null | undefined,
): string | null {
  if (!isValidUserSub(userSub) || typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(activePortfolioStorageKey(userSub));
    return value && value.trim() ? value.trim() : null;
  } catch {
    return null;
  }
}

export function writeActivePortfolioId(
  userSub: string | null | undefined,
  portfolioId: string,
): void {
  if (!isValidUserSub(userSub) || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(activePortfolioStorageKey(userSub), portfolioId);
  } catch {
    /* ignore quota / private mode */
  }
}
