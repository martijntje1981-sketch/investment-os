import { describe, expect, it } from "vitest";

import {
  mapDbHoldingToStored,
  mapStoredHoldingToDbInsert,
  sanitizeLocalHoldings,
} from "@/lib/services/portfolio/mappers";
import {
  describePersistedVerificationMismatch,
  portfoliosPersistedMatch,
} from "@/lib/services/portfolio/persistedVerification";
import { buildCryptoHoldingMetadata } from "@/lib/services/portfolio/cryptoDbMetadata";
import type { DbHoldingRow } from "@/lib/services/portfolio/types";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const PORTFOLIO_ID = "22222222-2222-4222-8222-222222222222";

function dbRowFromStored(
  holding: StoredPortfolioHolding,
  index: number,
): DbHoldingRow {
  if (holding.assetType === "crypto") {
    const insert = mapStoredHoldingToDbInsert(
      holding,
      USER_ID,
      PORTFOLIO_ID,
      index,
      holding.id,
    );
    return {
      ...insert,
      quantity: holding.quantity,
      average_cost: holding.purchasePrice,
      created_at: holding.createdAt ?? "2026-07-25T08:00:00.000Z",
      updated_at: holding.updatedAt ?? "2026-07-25T08:00:00.000Z",
      last_market_price: null,
      last_market_price_at: null,
      previous_close: null,
      metadata: insert.metadata ?? buildCryptoHoldingMetadata(holding),
    } as DbHoldingRow;
  }

  return {
    id: holding.id,
    portfolio_id: PORTFOLIO_ID,
    user_id: USER_ID,
    asset_type: holding.assetType === "cash" ? "cash" : "investment",
    symbol: holding.symbol,
    name: holding.name,
    quantity: holding.quantity,
    average_cost: holding.assetType === "cash" ? 1 : holding.purchasePrice,
    currency: "EUR",
    sort_order: index,
    created_at: "2026-07-25T08:00:00.000Z",
    updated_at: "2026-07-25T08:00:00.000Z",
    deleted_at: null,
    metadata: {},
    last_market_price: null,
    last_market_price_at: null,
    previous_close: null,
    holding_instrument_mappings: holding.providerSymbol
      ? {
          holding_id: holding.id,
          isin: holding.isin ?? null,
          exchange: holding.exchange ?? null,
          provider_symbol: holding.providerSymbol,
          instrument_name: holding.instrumentName ?? holding.name,
          match_method: holding.matchMethod ?? "manual",
          match_confidence: 1,
          match_warnings: [],
          quote_currency: holding.quoteCurrency ?? null,
          confirmed_at: "2026-07-25T08:00:00.000Z",
        }
      : null,
  };
}

function simulateLedgerReadBack(
  written: StoredPortfolioHolding[],
): StoredPortfolioHolding[] {
  return written.map((holding, index) =>
    mapDbHoldingToStored(dbRowFromStored(holding, index), holding.id),
  );
}

describe("persistedVerification mixed portfolio", () => {
  it("matches investment, cash, BTC/EUR and ETH/USDC after ledger read-back", () => {
    const btcId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const ethId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    const written = sanitizeLocalHoldings([
      {
        id: "cccccccc-cccc-4ccc-8ccc-cccccccccc01",
        symbol: "VWCE",
        name: "Vanguard FTSE All-World",
        quantity: 48,
        purchasePrice: 100,
        currentPrice: 105,
        currency: "EUR",
        assetType: "investment",
      },
      {
        id: "dddddddd-dddd-4ddd-8ddd-dddddddddd01",
        symbol: "EUR",
        name: "EUR Cash",
        quantity: 8000,
        purchasePrice: 1,
        currentPrice: 1,
        currency: "EUR",
        assetType: "cash",
      },
      {
        id: btcId,
        assetType: "crypto",
        symbol: "BTC",
        name: "Bitcoin",
        quantity: 0.25,
        purchasePrice: 42000,
        currentPrice: 0,
        currency: "EUR",
        pairCurrency: "EUR",
        pricingStatus: "price_unavailable",
        tradingPair: "BTC/EUR",
        platform: "Kraken",
      },
      {
        id: ethId,
        assetType: "crypto",
        symbol: "ETH",
        name: "Ethereum",
        quantity: 2.5,
        purchasePrice: 2800,
        currentPrice: 0,
        currency: "EUR",
        pairCurrency: "USDC",
        pricingStatus: "price_unavailable",
        tradingPair: "ETH/USDC",
        platform: "Kraken",
      },
    ]);

    const readBack = simulateLedgerReadBack(written);

    expect(portfoliosPersistedMatch(written, readBack, USER_ID)).toBe(true);
    expect(describePersistedVerificationMismatch(written, readBack, USER_ID)).toBeNull();
  });

  it("normalizes empty crypto platform to null like metadata persistence", () => {
    const holding = sanitizeLocalHoldings([
      {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        assetType: "crypto",
        symbol: "BTC",
        name: "Bitcoin",
        quantity: 0.25,
        purchasePrice: 42000,
        currentPrice: 0,
        currency: "EUR",
        pairCurrency: "EUR",
        pricingStatus: "price_unavailable",
        tradingPair: "BTC/EUR",
        platform: "",
      },
    ])[0]!;

    const readBack = simulateLedgerReadBack([holding]);
    expect(portfoliosPersistedMatch([holding], readBack, USER_ID)).toBe(true);
  });

  it("keeps USDC distinct from USD", () => {
    const usdc = sanitizeLocalHoldings([
      {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        assetType: "crypto",
        symbol: "ETH",
        name: "Ethereum",
        quantity: 1,
        purchasePrice: 0,
        currentPrice: 0,
        currency: "EUR",
        pairCurrency: "USDC",
        tradingPair: "ETH/USDC",
      },
    ])[0]!;
    const usd = sanitizeLocalHoldings([
      {
        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        assetType: "crypto",
        symbol: "ETH",
        name: "Ethereum",
        quantity: 1,
        purchasePrice: 0,
        currentPrice: 0,
        currency: "EUR",
        pairCurrency: "USD",
        tradingPair: "ETH/USD",
      },
    ])[0]!;

    const readBack = simulateLedgerReadBack([usdc, usd]);
    expect(portfoliosPersistedMatch([usdc, usd], readBack, USER_ID)).toBe(true);
    expect(readBack[0]?.pairCurrency).toBe("USDC");
    expect(readBack[1]?.pairCurrency).toBe("USD");
  });

  it("fails when crypto quantity differs materially", () => {
    const written = sanitizeLocalHoldings([
      {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        assetType: "crypto",
        symbol: "BTC",
        name: "Bitcoin",
        quantity: 0.25,
        purchasePrice: 42000,
        currentPrice: 0,
        currency: "EUR",
        pairCurrency: "EUR",
        tradingPair: "BTC/EUR",
      },
    ]);
    const readBack = simulateLedgerReadBack(written);
    readBack[0] = { ...readBack[0]!, quantity: 0.3 };

    expect(portfoliosPersistedMatch(written, readBack, USER_ID)).toBe(false);
    expect(describePersistedVerificationMismatch(written, readBack, USER_ID)).toContain(
      "quantity",
    );
  });

  it("fails when trading pair differs", () => {
    const written = sanitizeLocalHoldings([
      {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        assetType: "crypto",
        symbol: "BTC",
        name: "Bitcoin",
        quantity: 0.25,
        purchasePrice: 42000,
        currentPrice: 0,
        currency: "EUR",
        pairCurrency: "EUR",
        tradingPair: "BTC/EUR",
      },
    ]);
    const readBack = simulateLedgerReadBack(written);
    readBack[0] = { ...readBack[0]!, tradingPair: "BTC/USDC", pairCurrency: "USDC" };

    expect(portfoliosPersistedMatch(written, readBack, USER_ID)).toBe(false);
  });
});
