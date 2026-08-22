import { isValidUserSub } from "@/lib/client/portfolioStorageKeys";

export const DEFAULT_PORTFOLIO_ONE_NAME = "My Portfolio";

export function sanitizePortfolioOneName(value: unknown): string {
  if (typeof value !== "string") return DEFAULT_PORTFOLIO_ONE_NAME;
  const trimmed = value.trim().replace(/\s+/g, " ").slice(0, 60);
  return trimmed.length > 0 ? trimmed : DEFAULT_PORTFOLIO_ONE_NAME;
}

function nameKey(userSub: string): string {
  return `tobailey.portfolio-one.name:${userSub}`;
}

export function readPortfolioOneName(userSub: string | null | undefined): string {
  if (!isValidUserSub(userSub) || typeof window === "undefined") {
    return DEFAULT_PORTFOLIO_ONE_NAME;
  }
  try {
    return sanitizePortfolioOneName(window.localStorage.getItem(nameKey(userSub)));
  } catch {
    return DEFAULT_PORTFOLIO_ONE_NAME;
  }
}

export function writePortfolioOneName(
  userSub: string | null | undefined,
  name: string,
): string {
  const next = sanitizePortfolioOneName(name);
  if (!isValidUserSub(userSub) || typeof window === "undefined") return next;
  try {
    window.localStorage.setItem(nameKey(userSub), next);
  } catch {
    /* ignore quota / private mode */
  }
  return next;
}

export async function persistPortfolioOneName(
  userSub: string | null | undefined,
  name: string,
): Promise<{ portfolioId: string | null; name: string }> {
  const next = writePortfolioOneName(userSub, name);
  try {
    const response = await fetch("/api/portfolio/name", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: next }),
    });
    if (!response.ok) return { portfolioId: null, name: next };
    const payload = (await response.json()) as {
      portfolioId?: string;
      name?: string;
    };
    return {
      portfolioId:
        typeof payload.portfolioId === "string" ? payload.portfolioId : null,
      name: sanitizePortfolioOneName(payload.name ?? next),
    };
  } catch {
    return { portfolioId: null, name: next };
  }
}
