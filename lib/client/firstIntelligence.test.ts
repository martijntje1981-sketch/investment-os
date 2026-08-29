import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  dismissFirstIntelligence,
  firstIntelligenceDashboardHref,
  isFirstIntelligencePending,
  markFirstIntelligencePending,
  readReadyQueryFlag,
  shouldShowFirstIntelligence,
} from "@/lib/client/firstIntelligence";

describe("first intelligence moment", () => {
  const userSub = "user-first-intel";

  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("marks pending after setup and shows on dashboard ready query", () => {
    expect(isFirstIntelligencePending(userSub)).toBe(false);
    markFirstIntelligencePending(userSub);
    expect(isFirstIntelligencePending(userSub)).toBe(true);
    expect(firstIntelligenceDashboardHref()).toBe("/dashboard?ready=1");
    expect(readReadyQueryFlag("?ready=1")).toBe(true);

    expect(
      shouldShowFirstIntelligence({
        userSub,
        hasHoldings: true,
        exampleActive: false,
        search: "?ready=1",
      }),
    ).toBe(true);
  });

  it("does not show for Demo books or empty portfolios", () => {
    markFirstIntelligencePending(userSub);
    expect(
      shouldShowFirstIntelligence({
        userSub,
        hasHoldings: true,
        exampleActive: true,
        search: "?ready=1",
      }),
    ).toBe(false);
    expect(
      shouldShowFirstIntelligence({
        userSub,
        hasHoldings: false,
        exampleActive: false,
        search: "?ready=1",
      }),
    ).toBe(false);
  });

  it("hides after dismiss even if the ready query remains", () => {
    markFirstIntelligencePending(userSub);
    dismissFirstIntelligence(userSub);
    expect(isFirstIntelligencePending(userSub)).toBe(false);
    expect(
      shouldShowFirstIntelligence({
        userSub,
        hasHoldings: true,
        exampleActive: false,
        search: "?ready=1",
      }),
    ).toBe(false);
  });
});
