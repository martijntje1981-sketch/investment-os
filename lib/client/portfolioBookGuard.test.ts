import { describe, expect, it } from "vitest";

import {
  bookStateKey,
  PRIMARY_BOOK_KEY,
  recordHydratedVersionForBook,
  resolveHydratedVersionForActiveBook,
  shouldApplyAsyncBookResult,
} from "@/lib/client/portfolioBookGuard";

const MAIN = "main-book";
const KIDS = "kids-book";
const TESTING = "testing-book";

describe("portfolio book-switch race guard", () => {
  it("delayed GET A arriving after GET B is ignored", () => {
    const decision = shouldApplyAsyncBookResult({
      requestPortfolioId: MAIN,
      responsePortfolioId: MAIN,
      activePortfolioId: KIDS,
      requestEpoch: 1,
      activeEpoch: 2,
    });
    expect(decision).toEqual({ apply: false, reason: "stale_epoch" });
  });

  it("delayed price sync A after switch to B is ignored even if epochs were not bumped", () => {
    const decision = shouldApplyAsyncBookResult({
      requestPortfolioId: MAIN,
      responsePortfolioId: MAIN,
      activePortfolioId: KIDS,
      requestEpoch: 4,
      activeEpoch: 4,
    });
    expect(decision).toEqual({ apply: false, reason: "active_book_changed" });
  });

  it("rapid A→B→A ignores the first A GET in favor of the later A visit", () => {
    const versions = new Map<string, number>();
    const hydrateEpoch = new Map<string, number>();

    recordHydratedVersionForBook(versions, hydrateEpoch, {
      requestPortfolioId: MAIN,
      responsePortfolioId: MAIN,
      version: 0,
      epoch: 1,
    });
    recordHydratedVersionForBook(versions, hydrateEpoch, {
      requestPortfolioId: KIDS,
      responsePortfolioId: KIDS,
      version: 0,
      epoch: 2,
    });

    const lateFirstA = shouldApplyAsyncBookResult({
      requestPortfolioId: MAIN,
      responsePortfolioId: MAIN,
      activePortfolioId: MAIN,
      requestEpoch: 1,
      activeEpoch: 3,
    });
    expect(lateFirstA.apply).toBe(false);
    expect(lateFirstA.reason).toBe("stale_epoch");

    expect(
      resolveHydratedVersionForActiveBook({
        activePortfolioId: MAIN,
        versionsByBook: versions,
        hydrateEpochByBook: hydrateEpoch,
        activeEpoch: 3,
      }),
    ).toBeNull();

    recordHydratedVersionForBook(versions, hydrateEpoch, {
      requestPortfolioId: MAIN,
      responsePortfolioId: MAIN,
      version: 2,
      epoch: 3,
    });

    expect(
      resolveHydratedVersionForActiveBook({
        activePortfolioId: MAIN,
        versionsByBook: versions,
        hydrateEpochByBook: hydrateEpoch,
        activeEpoch: 3,
      }),
    ).toBe(2);
  });

  it("does not reuse kids/Testing versions while Main is active", () => {
    const versions = new Map<string, number>([
      [bookStateKey(KIDS), 7],
      [bookStateKey(TESTING), 9],
      [bookStateKey(MAIN), 1],
    ]);
    const hydrateEpoch = new Map<string, number>([
      [bookStateKey(KIDS), 2],
      [bookStateKey(TESTING), 3],
      [bookStateKey(MAIN), 4],
    ]);

    expect(
      resolveHydratedVersionForActiveBook({
        activePortfolioId: MAIN,
        versionsByBook: versions,
        hydrateEpochByBook: hydrateEpoch,
        activeEpoch: 4,
      }),
    ).toBe(1);

    expect(
      resolveHydratedVersionForActiveBook({
        activePortfolioId: KIDS,
        versionsByBook: versions,
        hydrateEpochByBook: hydrateEpoch,
        activeEpoch: 4,
      }),
    ).toBeNull();
  });

  it("rejects concurrent stale writes whose response belongs to another book", () => {
    expect(
      shouldApplyAsyncBookResult({
        requestPortfolioId: MAIN,
        responsePortfolioId: KIDS,
        activePortfolioId: MAIN,
        requestEpoch: 5,
        activeEpoch: 5,
      }),
    ).toEqual({ apply: false, reason: "response_book_mismatch" });

    expect(
      shouldApplyAsyncBookResult({
        requestPortfolioId: MAIN,
        responsePortfolioId: MAIN,
        activePortfolioId: MAIN,
        requestEpoch: 5,
        activeEpoch: 5,
      }),
    ).toEqual({ apply: true, reason: "current_book" });
  });

  it("allows primary GET with no request id when the unresolved book is still active", () => {
    expect(
      shouldApplyAsyncBookResult({
        requestPortfolioId: null,
        responsePortfolioId: MAIN,
        activePortfolioId: null,
        requestEpoch: 1,
        activeEpoch: 1,
      }),
    ).toEqual({ apply: true, reason: "current_book" });
    expect(bookStateKey(null)).toBe(PRIMARY_BOOK_KEY);
  });
});
