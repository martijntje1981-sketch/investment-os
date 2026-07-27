import { describe, expect, it } from "vitest";

import {
  createPortfolioContribution,
  listPortfolioContributions,
} from "@/lib/client/portfolioContributionsCloud";
import type { DbPortfolioContributionRow } from "@/lib/services/contributions/types";

type QueryResult<T> = { data: T; error: null } | { data: null; error: { message: string } };

function createMockClient(state: {
  portfolioId: string;
  rows: DbPortfolioContributionRow[];
}) {
  return {
    from(table: string) {
      if (table === "portfolios") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                order: () => ({
                  order: () => ({
                    limit: () => ({
                      maybeSingle: async (): Promise<
                        QueryResult<{ id: string }>
                      > => ({
                        data: { id: state.portfolioId },
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
            }),
          }),
        };
      }

      if (table !== "portfolio_contributions") {
        throw new Error(`Unexpected table ${table}`);
      }

      return {
        select: () => ({
          eq: () => ({
            order: () => ({
              order: async (): Promise<QueryResult<DbPortfolioContributionRow[]>> => ({
                data: [...state.rows].sort((left, right) => {
                  const dateCompare = right.entry_date.localeCompare(left.entry_date);
                  if (dateCompare !== 0) {
                    return dateCompare;
                  }
                  return right.created_at.localeCompare(left.created_at);
                }),
                error: null,
              }),
            }),
          }),
        }),
        insert: (payload: Record<string, unknown>) => ({
          select: () => ({
            single: async (): Promise<QueryResult<DbPortfolioContributionRow>> => {
              if (Number(payload.amount) <= 0) {
                return {
                  data: null,
                  error: { message: "amount must be positive" },
                };
              }

              const row: DbPortfolioContributionRow = {
                id: `row-${state.rows.length + 1}`,
                portfolio_id: state.portfolioId,
                user_id: payload.user_id as string,
                entry_type: payload.entry_type as DbPortfolioContributionRow["entry_type"],
                amount: payload.amount as number,
                currency: payload.currency as string,
                base_currency: payload.base_currency as string,
                base_amount: payload.base_amount as number,
                fx_rate_used: payload.fx_rate_used as number,
                entry_date: payload.entry_date as string,
                note: (payload.note as string | null) ?? null,
                source: payload.source as DbPortfolioContributionRow["source"],
                created_at: "2026-07-27T12:00:00.000Z",
                updated_at: "2026-07-27T12:00:00.000Z",
              };
              state.rows.push(row);
              return { data: row, error: null };
            },
          }),
        }),
      };
    },
  };
}

describe("portfolio contributions cloud access", () => {
  it("lists entries in stable date order for the authenticated user", async () => {
    const state = {
      portfolioId: "portfolio-1",
      rows: [
        {
          id: "1",
          portfolio_id: "portfolio-1",
          user_id: "user-1",
          entry_type: "contribution",
          amount: 1000,
          currency: "EUR",
          base_currency: "EUR",
          base_amount: 1000,
          fx_rate_used: 1,
          entry_date: "2026-01-01",
          note: null,
          source: "manual",
          created_at: "2026-01-01T10:00:00.000Z",
          updated_at: "2026-01-01T10:00:00.000Z",
        },
        {
          id: "2",
          portfolio_id: "portfolio-1",
          user_id: "user-1",
          entry_type: "withdrawal",
          amount: 250,
          currency: "EUR",
          base_currency: "EUR",
          base_amount: 250,
          fx_rate_used: 1,
          entry_date: "2026-06-01",
          note: null,
          source: "manual",
          created_at: "2026-06-01T10:00:00.000Z",
          updated_at: "2026-06-01T10:00:00.000Z",
        },
      ] as DbPortfolioContributionRow[],
    };

    const entries = await listPortfolioContributions(
      createMockClient(state),
      "user-1",
    );

    expect(entries.map((entry) => entry.id)).toEqual(["2", "1"]);
    expect(entries[0]?.entryType).toBe("withdrawal");
  });

  it("rejects non-positive amounts before insert", async () => {
    const state = {
      portfolioId: "portfolio-1",
      rows: [] as DbPortfolioContributionRow[],
    };

    await expect(
      createPortfolioContribution(
        createMockClient(state),
        "user-1",
        {
          entryType: "contribution",
          amount: 0,
          currency: "EUR",
          entryDate: "2026-07-27",
        },
        "EUR",
      ),
    ).rejects.toThrow("Amount must be greater than zero.");
  });

  it("scopes created rows to the authenticated user id", async () => {
    const state = {
      portfolioId: "portfolio-1",
      rows: [] as DbPortfolioContributionRow[],
    };

    const saved = await createPortfolioContribution(
      createMockClient(state),
      "user-1",
      {
        entryType: "contribution",
        amount: 500,
        currency: "EUR",
        entryDate: "2026-07-27",
        source: "opening_balance",
      },
      "EUR",
    );

    expect(saved.userId).toBe("user-1");
    expect(saved.source).toBe("opening_balance");
    expect(state.rows).toHaveLength(1);
  });
});
