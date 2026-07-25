import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";

import { cryptoFormHasHorizontalOverflowMarkup } from "@/lib/services/portfolio/cryptoHolding";
import { normalizeHoldingForSave } from "@/lib/client/portfolioPricing";
import {
  readPortfolioFromStorage,
  writePortfolioToStorage,
} from "@/lib/client/userPortfolioStorage";
import {
  createEmptyCryptoDraft,
  mergeHoldingOnSave,
  prepareCryptoHoldingForSave,
  validateCryptoHoldingForSave,
} from "@/lib/services/portfolio/cryptoHolding";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

const USER = "crypto-phase1-user";

function investment(
  overrides: Partial<StoredPortfolioHolding> = {},
): StoredPortfolioHolding {
  return {
    id: overrides.id ?? "equity-1",
    symbol: overrides.symbol ?? "STRC",
    name: overrides.name ?? "MicroStrategy",
    quantity: overrides.quantity ?? 10,
    purchasePrice: overrides.purchasePrice ?? 100,
    currentPrice: overrides.currentPrice ?? 120,
    currency: "EUR",
    assetType: "investment",
    providerSymbol: overrides.providerSymbol ?? "STRC.AS",
    exchange: overrides.exchange ?? "AS",
  };
}

function cryptoDraft(
  overrides: Partial<StoredPortfolioHolding> = {},
): StoredPortfolioHolding {
  const base = createEmptyCryptoDraft();
  return {
    ...base,
    ...overrides,
    assetType: "crypto",
  };
}

describe("cryptoHolding validation and preparation", () => {
  it("saves BTC/EUR", () => {
    const saved = prepareCryptoHoldingForSave(
      cryptoDraft({
        name: "Bitcoin",
        symbol: "BTC",
        quantity: 0.5,
        pairCurrency: "EUR",
      }),
    );

    expect(saved.assetType).toBe("crypto");
    expect(saved.symbol).toBe("BTC");
    expect(saved.pairCurrency).toBe("EUR");
    expect(saved.tradingPair).toBe("BTC/EUR");
    expect(saved.portfolioCurrency).toBe("EUR");
    expect(saved.pricingStatus).toBe("price_unavailable");
    expect(saved.currentPrice).toBe(0);
    expect(saved.providerSymbol).toBe(null);
  });

  it("saves BTC/USDC", () => {
    const saved = prepareCryptoHoldingForSave(
      cryptoDraft({
        name: "Bitcoin",
        symbol: "BTC",
        quantity: 1,
        pairCurrency: "USDC",
      }),
    );

    expect(saved.tradingPair).toBe("BTC/USDC");
    expect(saved.pairCurrency).toBe("USDC");
  });

  it("keeps USDC distinct from USD", () => {
    const usdc = prepareCryptoHoldingForSave(
      cryptoDraft({
        name: "Bitcoin",
        symbol: "BTC",
        quantity: 1,
        pairCurrency: "USDC",
      }),
    );
    const usd = prepareCryptoHoldingForSave(
      cryptoDraft({
        name: "Bitcoin",
        symbol: "BTC",
        quantity: 1,
        pairCurrency: "USD",
      }),
    );

    expect(usdc.pairCurrency).toBe("USDC");
    expect(usd.pairCurrency).toBe("USD");
    expect(usdc.tradingPair).toBe("BTC/USDC");
    expect(usd.tradingPair).toBe("BTC/USD");
    expect(usdc.tradingPair).not.toBe(usd.tradingPair);
  });

  it("saves unknown token with needs_review pricing status", () => {
    const saved = prepareCryptoHoldingForSave(
      cryptoDraft({
        name: "Mystery Coin",
        symbol: "MYST",
        quantity: 1000,
        pairCurrency: "EUR",
      }),
    );

    expect(saved.pricingStatus).toBe("needs_review");
    expect(saved.providerName).toBe(null);
    expect(saved.providerId).toBe(null);
  });

  it("accepts small decimal amounts", () => {
    const result = validateCryptoHoldingForSave(
      cryptoDraft({
        name: "Bitcoin",
        symbol: "BTC",
        quantity: 0.0000125,
        pairCurrency: "EUR",
      }),
    );

    expect(result.ok).toBe(true);
  });

  it("rejects zero and negative amounts", () => {
    const zero = validateCryptoHoldingForSave(
      cryptoDraft({ name: "Bitcoin", symbol: "BTC", quantity: 0, pairCurrency: "EUR" }),
    );
    const negative = validateCryptoHoldingForSave(
      cryptoDraft({ name: "Bitcoin", symbol: "BTC", quantity: -1, pairCurrency: "EUR" }),
    );

    expect(zero.ok).toBe(false);
    expect(negative.ok).toBe(false);
    if (!zero.ok) {
      expect(zero.fieldErrors.amount).toBeTruthy();
    }
  });

  it("recognizes Bitcoin from XBT symbol", () => {
    const saved = prepareCryptoHoldingForSave(
      cryptoDraft({
        name: "Bitcoin",
        symbol: "XBT",
        quantity: 1,
        pairCurrency: "EUR",
      }),
    );

    expect(saved.symbol).toBe("BTC");
    expect(saved.name).toBe("Bitcoin");
  });
});

describe("cryptoHolding persistence safety", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("does not overwrite equities when adding crypto", () => {
    const equity = investment();
    writePortfolioToStorage(USER, [equity]);

    const crypto = prepareCryptoHoldingForSave(
      cryptoDraft({
        id: "crypto-1",
        name: "Bitcoin",
        symbol: "BTC",
        quantity: 0.1,
        pairCurrency: "EUR",
      }),
    );

    const next = mergeHoldingOnSave(readPortfolioFromStorage(USER), crypto);
    writePortfolioToStorage(USER, next);

    const stored = readPortfolioFromStorage(USER);
    expect(stored).toHaveLength(2);
    expect(stored.some((row) => row.symbol === "STRC" && row.assetType === "investment")).toBe(true);
    expect(stored.some((row) => row.symbol === "BTC" && row.assetType === "crypto")).toBe(true);
  });

  it("does not remove existing crypto when adding another", () => {
    const btc = prepareCryptoHoldingForSave(
      cryptoDraft({
        id: "btc",
        name: "Bitcoin",
        symbol: "BTC",
        quantity: 0.1,
        pairCurrency: "EUR",
      }),
    );
    const eth = prepareCryptoHoldingForSave(
      cryptoDraft({
        id: "eth",
        name: "Ethereum",
        symbol: "ETH",
        quantity: 2,
        pairCurrency: "USDC",
      }),
    );

    writePortfolioToStorage(USER, [btc]);
    const next = mergeHoldingOnSave(readPortfolioFromStorage(USER), eth);
    writePortfolioToStorage(USER, next);

    const stored = readPortfolioFromStorage(USER);
    expect(stored).toHaveLength(2);
    expect(stored.map((row) => row.symbol).sort()).toEqual(["BTC", "ETH"]);
  });

  it("retains holdings after refresh", () => {
    const saved = prepareCryptoHoldingForSave(
      cryptoDraft({
        id: "sol-1",
        name: "Solana",
        symbol: "SOL",
        quantity: 12.5,
        pairCurrency: "EUR",
        platform: "Ledger",
      }),
    );

    writePortfolioToStorage(USER, [saved]);
    const reloaded = readPortfolioFromStorage(USER);

    expect(reloaded).toHaveLength(1);
    expect(reloaded[0]?.assetType).toBe("crypto");
    expect(reloaded[0]?.symbol).toBe("SOL");
    expect(reloaded[0]?.quantity).toBe(12.5);
    expect(reloaded[0]?.platform).toBe("Ledger");
    expect(reloaded[0]?.pairCurrency).toBe("EUR");
  });

  it("updates only the selected holding on edit", () => {
    const btc = prepareCryptoHoldingForSave(
      cryptoDraft({
        id: "btc",
        name: "Bitcoin",
        symbol: "BTC",
        quantity: 1,
        pairCurrency: "EUR",
      }),
    );
    const eth = prepareCryptoHoldingForSave(
      cryptoDraft({
        id: "eth",
        name: "Ethereum",
        symbol: "ETH",
        quantity: 2,
        pairCurrency: "EUR",
      }),
    );

    writePortfolioToStorage(USER, [btc, eth]);

    const editedBtc = prepareCryptoHoldingForSave({
      ...btc,
      quantity: 3,
      platform: "Kraken",
    });
    const next = mergeHoldingOnSave(readPortfolioFromStorage(USER), editedBtc);
    writePortfolioToStorage(USER, next);

    const stored = readPortfolioFromStorage(USER);
    expect(stored.find((row) => row.id === "btc")?.quantity).toBe(3);
    expect(stored.find((row) => row.id === "btc")?.platform).toBe("Kraken");
    expect(stored.find((row) => row.id === "eth")?.quantity).toBe(2);
  });

  it("removes only the selected holding on delete", () => {
    const holdings = [
      prepareCryptoHoldingForSave(
        cryptoDraft({ id: "btc", name: "Bitcoin", symbol: "BTC", quantity: 1, pairCurrency: "EUR" }),
      ),
      prepareCryptoHoldingForSave(
        cryptoDraft({ id: "eth", name: "Ethereum", symbol: "ETH", quantity: 2, pairCurrency: "EUR" }),
      ),
    ];
    writePortfolioToStorage(USER, holdings);

    const afterDelete = readPortfolioFromStorage(USER).filter((row) => row.id !== "btc");
    writePortfolioToStorage(USER, afterDelete);

    const stored = readPortfolioFromStorage(USER);
    expect(stored).toHaveLength(1);
    expect(stored[0]?.symbol).toBe("ETH");
  });

  it("does not create duplicates on double submit", () => {
    const draft = prepareCryptoHoldingForSave(
      cryptoDraft({
        id: "btc",
        name: "Bitcoin",
        symbol: "BTC",
        quantity: 1,
        pairCurrency: "EUR",
      }),
    );

    let holdings: StoredPortfolioHolding[] = [];
    holdings = mergeHoldingOnSave(holdings, draft);
    holdings = mergeHoldingOnSave(holdings, draft);

    expect(holdings).toHaveLength(1);
    expect(holdings[0]?.id).toBe("btc");
  });

  it("does not silently merge duplicate positions with different ids", () => {
    const first = prepareCryptoHoldingForSave(
      cryptoDraft({
        id: "btc-a",
        name: "Bitcoin",
        symbol: "BTC",
        quantity: 1,
        pairCurrency: "EUR",
      }),
    );
    const second = prepareCryptoHoldingForSave(
      cryptoDraft({
        id: "btc-b",
        name: "Bitcoin",
        symbol: "BTC",
        quantity: 2,
        pairCurrency: "EUR",
      }),
    );

    let holdings = mergeHoldingOnSave([], first);
    holdings = mergeHoldingOnSave(holdings, second);

    expect(holdings).toHaveLength(2);
  });

  it("keeps draft values when validation fails before save", () => {
    const draft = cryptoDraft({
      name: "Mystery Coin",
      symbol: "MYST",
      quantity: 0,
      pairCurrency: "EUR",
    });
    const before = { ...draft };

    const result = validateCryptoHoldingForSave(draft);
    expect(result.ok).toBe(false);
    expect(draft).toEqual(before);
  });

  it("routes crypto through normalizeHoldingForSave", () => {
    const saved = normalizeHoldingForSave(
      cryptoDraft({
        name: "Bitcoin",
        symbol: "btc",
        quantity: 0.25,
        pairCurrency: "USDT",
      }),
    );

    expect(saved.assetType).toBe("crypto");
    expect(saved.symbol).toBe("BTC");
    expect(saved.tradingPair).toBe("BTC/USDT");
  });
});

describe("AddCryptoHoldingForm mobile layout", () => {
  it("has no horizontal overflow patterns in markup", () => {
    const source = readFileSync(
      resolve(process.cwd(), "components/portfolio/AddCryptoHoldingForm.tsx"),
      "utf8",
    );

    expect(cryptoFormHasHorizontalOverflowMarkup(source)).toBe(false);
    expect(source).toMatch(/overflow-x-hidden/);
    expect(source).toMatch(/min-h-\[44px\]/);
  });
});
