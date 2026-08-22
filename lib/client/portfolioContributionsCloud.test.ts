import { describe, expect, it } from "vitest";

import {
  createPortfolioContribution,
  listPortfolioContributions,
} from "@/lib/client/portfolioContributionsCloud";
import type { DbPortfolioContributionRow } from "@/lib/services/contributions/types";

type QueryResult<T> =
  | { data: T; error: null }
  | { data: null; error: { message: string } };

type HoldingRow = {
  id: string;
  symbol: string;
  user_id: string;
  asset_type: string;
  deleted_at: string | null;
};

function createMockClient(state: {
  portfolioId: string;
  rows: DbPortfolioContributionRow[];
  holdings?: HoldingRow[];
}) {
  let pendingHoldingId: string | null = null;
  let pendingHoldingUserId: string | null = null;

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

      if (table === "holdings") {
        return {
          select: () => ({
            eq: (column: string, value: string) => {
              if (column === "id") pendingHoldingId = value;
              if (column === "user_id") pendingHoldingUserId = value;
              return {
                eq: (column2: string, value2: string) => {
                  if (column2 === "id") pendingHoldingId = value2;
                  if (column2 === "user_id") pendingHoldingUserId = value2;
                  return {
                    is: () => ({
                      maybeSingle: async (): Promise<QueryResult<HoldingRow>> => {
                        const holding = (state.holdings ?? []).find(
                          (row) =>
                            row.id === pendingHoldingId &&
                            row.user_id === pendingHoldingUserId &&
                            row.deleted_at == null,
                        );
                        return { data: holding ?? null, error: null };
                      },
                    }),
                  };
                },
              };
            },
          }),
        };
      }

      if (table !== "portfolio_contributions") {
        throw new Error(`Unexpected table ${table}`);
      }

      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              order: () => ({
                order: async (): Promise<
                  QueryResult<DbPortfolioContributionRow[]>
                > => ({
                  data: [...state.rows].sort((left, right) => {
                    const dateCompare = right.entry_date.localeCompare(
                      left.entry_date,
                    );
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
        }),
        insert: (payload: Record<string, unknown>) => ({
          select: () => ({
            single: async (): Promise<
              QueryResult<DbPortfolioContributionRow>
            > => {
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
                entry_type:
                  payload.entry_type as DbPortfolioContributionRow["entry_type"],
                amount: payload.amount as number,
                currency: payload.currency as string,
                base_currency: payload.base_currency as string,
                base_amount: payload.base_amount as number,
                fx_rate_used: payload.fx_rate_used as number,
                entry_date: payload.entry_date as string,
                note: (payload.note as string | null) ?? null,
                source: payload.source as DbPortfolioContributionRow["source"],
                destination_type:
                  (payload.destination_type as "cash" | "holding" | undefined) ??
                  "cash",
                destination_holding_id:
                  (payload.destination_holding_id as string | null) ?? null,
                destination_holding_symbol:
                  (payload.destination_holding_symbol as string | null) ?? null,
                destination_quantity:
                  (payload.destination_quantity as number | null) ?? null,
                destination_price_per_unit:
                  (payload.destination_price_per_unit as number | null) ?? null,
                destination_fee:
                  (payload.destination_fee as number | null) ?? null,
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
          destination_type: "cash",
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
          destination_type: "cash",
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
    expect(entries[0]?.destinationType).toBe("cash");
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

  it("scopes created cash contribution rows to the authenticated user id", async () => {
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
        destinationType: "cash",
      },
      "EUR",
    );

    expect(saved.userId).toBe("user-1");
    expect(saved.source).toBe("opening_balance");
    expect(saved.destinationType).toBe("cash");
    expect(state.rows).toHaveLength(1);
  });

  it("rejects holding destinations that are not owned by the user", async () => {
    const state = {
      portfolioId: "portfolio-1",
      rows: [] as DbPortfolioContributionRow[],
      holdings: [
        {
          id: "holding-other",
          symbol: "VWCE",
          user_id: "someone-else",
          asset_type: "investment",
          deleted_at: null,
        },
      ],
    };

    await expect(
      createPortfolioContribution(
        createMockClient(state),
        "user-1",
        {
          entryType: "contribution",
          currency: "EUR",
          entryDate: "2026-08-04",
          destinationType: "holding",
          destinationHoldingId: "holding-other",
          destinationQuantity: 1,
          destinationPricePerUnit: 100,
        },
        "EUR",
        {
          allowedHoldings: [
            {
              id: "holding-other",
              symbol: "VWCE",
              name: "Vanguard",
              assetType: "investment",
            },
          ],
        },
      ),
    ).rejects.toThrow("Selected holding is not in your portfolio.");
  });

  it("saves an owned holding destination without mutating holdings", async () => {
    const state = {
      portfolioId: "portfolio-1",
      rows: [] as DbPortfolioContributionRow[],
      holdings: [
        {
          id: "holding-1",
          symbol: "VWCE",
          user_id: "user-1",
          asset_type: "investment",
          deleted_at: null,
        },
      ],
    };

    const saved = await createPortfolioContribution(
      createMockClient(state),
      "user-1",
      {
        entryType: "contribution",
        currency: "EUR",
        entryDate: "2026-08-04",
        destinationType: "holding",
        destinationHoldingId: "holding-1",
        destinationQuantity: 12.4,
        destinationPricePerUnit: 120.97,
        destinationFee: 2.5,
      },
      "EUR",
      {
        allowedHoldings: [
          {
            id: "holding-1",
            symbol: "VWCE",
            name: "Vanguard",
            assetType: "investment",
          },
        ],
      },
    );

    expect(saved.destinationType).toBe("holding");
    expect(saved.destinationHoldingSymbol).toBe("VWCE");
    expect(saved.amount).toBe(1502.53);
    expect(state.holdings[0]?.symbol).toBe("VWCE");
    expect(state.rows).toHaveLength(1);
  });
});
