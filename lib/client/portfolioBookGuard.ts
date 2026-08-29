/**
 * Book-scoped guards for async portfolio hydrate / price-sync / PUT responses.
 *
 * A single process-wide version slot is unsafe: Main, kids, and Testing can all
 * start at sync_version 0, so a late GET for book A must never update book B
 * (or a later visit to A).
 */

export const PRIMARY_BOOK_KEY = "__primary__";

export function normalizePortfolioBookId(
  portfolioId?: string | null,
): string | null {
  if (typeof portfolioId !== "string") return null;
  const trimmed = portfolioId.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function bookStateKey(portfolioId?: string | null): string {
  return normalizePortfolioBookId(portfolioId) ?? PRIMARY_BOOK_KEY;
}

export function isSamePortfolioBook(
  left?: string | null,
  right?: string | null,
): boolean {
  return normalizePortfolioBookId(left) === normalizePortfolioBookId(right);
}

export type AsyncBookResultDecision =
  | { apply: true; reason: "current_book" }
  | {
      apply: false;
      reason: "stale_epoch" | "active_book_changed" | "response_book_mismatch";
    };

export function shouldApplyAsyncBookResult(input: {
  activePortfolioId?: string | null;
  requestPortfolioId?: string | null;
  responsePortfolioId?: string | null;
  requestEpoch: number;
  activeEpoch: number;
}): AsyncBookResultDecision {
  if (input.requestEpoch !== input.activeEpoch) {
    return { apply: false, reason: "stale_epoch" };
  }

  if (!isSamePortfolioBook(input.requestPortfolioId, input.activePortfolioId)) {
    return { apply: false, reason: "active_book_changed" };
  }

  const requestId = normalizePortfolioBookId(input.requestPortfolioId);
  const responseId = normalizePortfolioBookId(input.responsePortfolioId);
  if (requestId && responseId && requestId !== responseId) {
    return { apply: false, reason: "response_book_mismatch" };
  }

  return { apply: true, reason: "current_book" };
}

export function resolveHydratedVersionForActiveBook(input: {
  activePortfolioId?: string | null;
  versionsByBook: ReadonlyMap<string, number>;
  hydrateEpochByBook: ReadonlyMap<string, number>;
  activeEpoch: number;
}): number | null {
  const key = bookStateKey(input.activePortfolioId);
  if (input.hydrateEpochByBook.get(key) !== input.activeEpoch) {
    return null;
  }
  const version = input.versionsByBook.get(key);
  return typeof version === "number" && Number.isFinite(version) ? version : null;
}

export function recordHydratedVersionForBook(
  versionsByBook: Map<string, number>,
  hydrateEpochByBook: Map<string, number>,
  input: {
    requestPortfolioId?: string | null;
    responsePortfolioId?: string | null;
    version: number;
    epoch: number;
  },
): void {
  const keys = new Set([
    bookStateKey(input.requestPortfolioId),
    bookStateKey(input.responsePortfolioId),
  ]);
  for (const key of keys) {
    versionsByBook.set(key, input.version);
    hydrateEpochByBook.set(key, input.epoch);
  }
}
