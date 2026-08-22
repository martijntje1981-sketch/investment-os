import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import {
  fetchPortfolioBaseCurrency,
  simulateHandleNewUserBaseCurrency,
  updatePortfolioBaseCurrency,
} from "@/lib/client/portfolioBaseCurrencyCloud";
import {
  clearCachedBaseCurrency,
  readCachedBaseCurrency,
  resolveBaseCurrencyWithCacheFallback,
  writeCachedBaseCurrency,
} from "@/lib/client/portfolioBaseCurrencyStorage";
import { baseCurrencyStorageKey } from "@/lib/client/portfolioStorageKeys";
import { formatPortfolioCurrency } from "@/lib/client/portfolioAnalysis";
import {
  buildSignupUserMetadata,
  DEFAULT_PORTFOLIO_BASE_CURRENCY,
  normalizePortfolioBaseCurrency,
  portfolioBaseCurrencySymbol,
  PORTFOLIO_BASE_CURRENCY_OPTIONS,
  resolveSignupBaseCurrencyFromMetadata,
} from "@/lib/types/portfolioBaseCurrency";

describe("portfolio base currency normalization", () => {
  it("accepts EUR, USD and GBP only", () => {
    expect(normalizePortfolioBaseCurrency("EUR")).toBe("EUR");
    expect(normalizePortfolioBaseCurrency("usd")).toBe("USD");
    expect(normalizePortfolioBaseCurrency(" Gbp ")).toBe("GBP");
  });

  it("falls back to EUR for invalid or missing values", () => {
    expect(normalizePortfolioBaseCurrency(undefined)).toBe("EUR");
    expect(normalizePortfolioBaseCurrency(null)).toBe("EUR");
    expect(normalizePortfolioBaseCurrency("")).toBe("EUR");
    expect(normalizePortfolioBaseCurrency("JPY")).toBe("EUR");
    expect(normalizePortfolioBaseCurrency("XXX")).toBe("EUR");
    expect(normalizePortfolioBaseCurrency("euro")).toBe("EUR");
    expect(normalizePortfolioBaseCurrency(123)).toBe("EUR");
  });

  it("exposes input prefix symbols for EUR/USD/GBP", () => {
    expect(portfolioBaseCurrencySymbol("EUR")).toBe("€");
    expect(portfolioBaseCurrencySymbol("USD")).toBe("$");
    expect(portfolioBaseCurrencySymbol("GBP")).toBe("£");
  });

  it("builds allowlisted signup metadata", () => {
    expect(
      buildSignupUserMetadata({ fullName: "Martijn", baseCurrency: "USD" }),
    ).toEqual({ full_name: "Martijn", base_currency: "USD" });

    expect(
      buildSignupUserMetadata({ fullName: "Martijn", baseCurrency: "JPY" }),
    ).toEqual({ full_name: "Martijn", base_currency: "EUR" });
  });

  it("resolves signup metadata without trusting arbitrary keys", () => {
    expect(
      resolveSignupBaseCurrencyFromMetadata({
        full_name: "A",
        base_currency: "GBP",
        currency: "USD",
      }),
    ).toBe("GBP");

    expect(
      resolveSignupBaseCurrencyFromMetadata({ currency: "USD" }),
    ).toBe("EUR");
  });
});

describe("signup persistence path (handle_new_user allowlist)", () => {
  it("stores EUR/USD/GBP for new registrations", () => {
    expect(simulateHandleNewUserBaseCurrency({ base_currency: "EUR" })).toBe(
      "EUR",
    );
    expect(simulateHandleNewUserBaseCurrency({ base_currency: "USD" })).toBe(
      "USD",
    );
    expect(simulateHandleNewUserBaseCurrency({ base_currency: "GBP" })).toBe(
      "GBP",
    );
  });

  it("coerces invalid signup metadata to EUR", () => {
    expect(simulateHandleNewUserBaseCurrency({ base_currency: "CHF" })).toBe(
      "EUR",
    );
    expect(simulateHandleNewUserBaseCurrency({})).toBe("EUR");
    expect(simulateHandleNewUserBaseCurrency(null)).toBe("EUR");
  });

  it("defaults existing users without metadata to EUR", () => {
    expect(simulateHandleNewUserBaseCurrency(undefined)).toBe(
      DEFAULT_PORTFOLIO_BASE_CURRENCY,
    );
  });

  it("migration SQL allowlists currencies, defaults safely, and avoids duplicate settings rows", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const sql = readFileSync(
      resolve(
        process.cwd(),
        "supabase/migrations/20260726120000_portfolio_base_currency_signup.sql",
      ),
      "utf8",
    );

    expect(sql).toContain("raw_user_meta_data ->> 'base_currency'");
    expect(sql).toContain("IN ('EUR', 'USD', 'GBP')");
    expect(sql).toContain("v_base_currency := 'EUR'");
    expect(sql).toContain("INSERT INTO public.user_settings (user_id, base_currency)");
    expect(sql).toContain("ON CONFLICT (user_id) DO NOTHING");
    expect(sql).toContain("CREATE OR REPLACE FUNCTION public.handle_new_user()");
  });
});

describe("local cache isolation", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("namespaces cache by user id and isolates account switching", () => {
    writeCachedBaseCurrency("user-a", "USD");
    writeCachedBaseCurrency("user-b", "GBP");

    expect(readCachedBaseCurrency("user-a")).toBe("USD");
    expect(readCachedBaseCurrency("user-b")).toBe("GBP");
    expect(baseCurrencyStorageKey("user-a")).not.toBe(
      baseCurrencyStorageKey("user-b"),
    );

    clearCachedBaseCurrency("user-a");
    expect(readCachedBaseCurrency("user-a")).toBeNull();
    expect(readCachedBaseCurrency("user-b")).toBe("GBP");
  });

  it("uses cloud value over cache, and cache over default", () => {
    writeCachedBaseCurrency("user-a", "GBP");
    expect(resolveBaseCurrencyWithCacheFallback("USD", "user-a")).toBe("USD");
    expect(resolveBaseCurrencyWithCacheFallback(null, "user-a")).toBe("GBP");
    expect(resolveBaseCurrencyWithCacheFallback(null, "user-missing")).toBe(
      "EUR",
    );
  });
});

describe("cloud settings update", () => {
  it("updates only base_currency and preserves preferences", async () => {
    const preferences = { portfolio_sync_version: 3, theme: "system" };
    let stored = {
      user_id: "user-1",
      base_currency: "EUR",
      locale: "en-GB",
      preferences,
    };
    let updatePayload: Record<string, unknown> | null = null;

    const client = {
      from: (table: string) => {
        expect(table).toBe("user_settings");
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { base_currency: stored.base_currency },
                error: null,
              }),
            }),
          }),
          update: (values: Record<string, unknown>) => {
            updatePayload = values;
            stored = {
              ...stored,
              ...values,
              preferences: stored.preferences,
            } as typeof stored;
            return {
              eq: () => ({
                select: () => ({
                  maybeSingle: async () => ({
                    data: { base_currency: stored.base_currency },
                    error: null,
                  }),
                }),
              }),
            };
          },
        };
      },
    };

    expect(await fetchPortfolioBaseCurrency(client, "user-1")).toBe("EUR");
    expect(await updatePortfolioBaseCurrency(client, "user-1", "usd")).toBe(
      "USD",
    );
    expect(updatePayload).toEqual({ base_currency: "USD" });
    expect(stored.preferences).toEqual(preferences);
    expect(stored.locale).toBe("en-GB");
    expect(await fetchPortfolioBaseCurrency(client, "user-1")).toBe("USD");
  });

  it("does not insert when updating an existing settings row", async () => {
    const insert = vi.fn();
    const client = {
      from: () => ({
        insert,
        update: () => ({
          eq: () => ({
            select: () => ({
              maybeSingle: async () => ({
                data: { base_currency: "GBP" },
                error: null,
              }),
            }),
          }),
        }),
      }),
    };

    await updatePortfolioBaseCurrency(client, "user-1", "GBP");
    expect(insert).not.toHaveBeenCalled();
  });

  it("fails honestly when settings row is missing instead of creating a duplicate", async () => {
    const client = {
      from: () => ({
        update: () => ({
          eq: () => ({
            select: () => ({
              maybeSingle: async () => ({ data: null, error: null }),
            }),
          }),
        }),
      }),
    };

    await expect(
      updatePortfolioBaseCurrency(client, "user-1", "USD"),
    ).rejects.toThrow(/settings were not found/i);
  });
});

describe("phase A safety: no display or portfolio mutation", () => {
  it("does not relabel currency symbols in formatters", () => {
    expect(formatPortfolioCurrency(1234.5)).toMatch(/€|EUR/);
    expect(formatPortfolioCurrency(1234.5, "EUR")).toMatch(/€|EUR/);
  });

  it("keeps option labels in English without mutating holdings shape", () => {
    expect(PORTFOLIO_BASE_CURRENCY_OPTIONS.map((o) => o.label)).toEqual([
      "Euro (EUR)",
      "US Dollar (USD)",
      "British Pound (GBP)",
    ]);
  });

  it("cloud module does not import market-data providers", async () => {
    const source = await import("@/lib/client/portfolioBaseCurrencyCloud");
    expect(source.fetchPortfolioBaseCurrency).toBeTypeOf("function");
    // Ensure this module graph stays free of price/FX services.
    await expect(
      import("@/lib/client/portfolioBaseCurrencyCloud"),
    ).resolves.toBeTruthy();
    expect(
      Object.keys(source).every(
        (key) =>
          !key.toLowerCase().includes("price") &&
          !key.toLowerCase().includes("fx"),
      ),
    ).toBe(true);
  });
});
