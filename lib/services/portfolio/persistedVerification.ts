import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";
import { resolveHoldingIdForSync } from "@/lib/services/portfolio/holdingUniqueness";
import { hashPayload, approxEqual } from "@/lib/services/portfolio/idempotencyCore";

export type PersistedVerificationHolding = {
  id: string;
  assetType: "cash" | "investment" | "crypto";
  name: string;
  symbol: string;
  quantity: number;
  currency: string;
  purchasePrice: number;
  pairCurrency?: string;
  tradingPair?: string;
  pricingStatus?: string;
  platform?: string | null;
  currentManualPrice?: number | null;
  manualCurrentValue?: number | null;
  providerAssetId?: string | null;
  providerId?: string | null;
  providerName?: string | null;
  priceUpdatedAt?: string | null;
  providerSymbol?: string | null;
  isin?: string | null;
};

function normalizeSymbol(value: unknown): string {
  return String(value ?? "").trim().toUpperCase();
}

function normalizeOptionalString(value: unknown): string | null {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeProviderSymbol(value: unknown): string | null {
  const normalized = normalizeSymbol(value);
  return normalized || null;
}

function normalizeIsinForVerification(value: unknown): string | null {
  if (value == null) return null;
  const normalized = String(value).trim().toUpperCase();
  return /^[A-Z0-9]{12}$/.test(normalized) ? normalized : null;
}

function roundQuantity(value: number): number {
  return Number(value.toFixed(8));
}

function normalizeManualPrice(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? roundQuantity(parsed) : null;
}

function resolveVerificationId(
  userId: string,
  holding: StoredPortfolioHolding,
): string {
  return resolveHoldingIdForSync(userId, holding).toLowerCase();
}

function normalizePersistedHolding(
  holding: StoredPortfolioHolding,
  userId: string,
  includeInstrumentFields: boolean,
): PersistedVerificationHolding {
  const id = resolveVerificationId(userId, holding);
  const symbol = normalizeSymbol(holding.symbol);
  const name =
    String(holding.name ?? holding.symbol ?? "").trim() || symbol;

  if (holding.assetType === "cash") {
    const currency = normalizeSymbol(holding.currency ?? holding.symbol ?? "EUR");
    return {
      id,
      assetType: "cash",
      name,
      symbol: currency,
      quantity: roundQuantity(Number(holding.quantity) || 0),
      currency,
      purchasePrice: 1,
    };
  }

  if (holding.assetType === "crypto") {
    const portfolioCurrency = normalizeSymbol(
      holding.portfolioCurrency ?? holding.currency ?? "EUR",
    );
    const pairCurrency = normalizeSymbol(holding.pairCurrency ?? "EUR");
    return {
      id,
      assetType: "crypto",
      name,
      symbol,
      quantity: roundQuantity(Number(holding.quantity) || 0),
      currency: portfolioCurrency,
      purchasePrice: roundQuantity(Number(holding.purchasePrice) || 0),
      pairCurrency,
      tradingPair:
        normalizeOptionalString(holding.tradingPair) ??
        `${symbol}/${pairCurrency}`,
      pricingStatus: holding.pricingStatus ?? "needs_review",
      platform: normalizeOptionalString(holding.platform),
      currentManualPrice: normalizeManualPrice(holding.currentManualPrice),
      manualCurrentValue: normalizeManualPrice(holding.manualCurrentValue),
      providerAssetId: normalizeOptionalString(holding.providerAssetId),
      providerId: normalizeOptionalString(holding.providerId),
      providerName: normalizeOptionalString(holding.providerName),
      priceUpdatedAt: normalizeOptionalString(holding.priceUpdatedAt),
    };
  }

  const base: PersistedVerificationHolding = {
    id,
    assetType: "investment",
    name,
    symbol,
    quantity: roundQuantity(Number(holding.quantity) || 0),
    currency: normalizeSymbol(holding.currency ?? "EUR"),
    purchasePrice: roundQuantity(Number(holding.purchasePrice) || 0),
  };

  if (includeInstrumentFields) {
    return {
      ...base,
      providerSymbol: normalizeProviderSymbol(holding.providerSymbol),
      isin: normalizeIsinForVerification(holding.isin),
    };
  }

  return base;
}

function holdingsEqual(
  expected: PersistedVerificationHolding,
  actual: PersistedVerificationHolding,
): boolean {
  return hashPayload(expected) === hashPayload(actual);
}

/** Canonical persisted fields for post-write sync verification. */
export function normalizeHoldingForPersistedVerification(
  holding: StoredPortfolioHolding,
  userId: string,
  includeInstrumentFields = false,
): PersistedVerificationHolding {
  return normalizePersistedHolding(holding, userId, includeInstrumentFields);
}

export function normalizeHoldingsForPersistedVerification(
  holdings: StoredPortfolioHolding[],
  userId: string,
): PersistedVerificationHolding[] {
  return holdings
    .map((holding) =>
      normalizePersistedHolding(
        holding,
        userId,
        Boolean(holding.providerSymbol?.trim()),
      ),
    )
    .sort((a, b) => a.id.localeCompare(b.id));
}

export type PersistedVerificationMismatch = {
  id: string;
  symbol: string;
  assetType: string;
  field: string;
  expected: unknown;
  actual: unknown;
};

export function findPersistedVerificationMismatches(
  written: StoredPortfolioHolding[],
  readBack: StoredPortfolioHolding[],
  userId: string,
): PersistedVerificationMismatch[] {
  const mismatches: PersistedVerificationMismatch[] = [];
  const readById = new Map(
    readBack.map((holding) => [
      resolveVerificationId(userId, holding),
      holding,
    ]),
  );

  const writtenIds = written
    .map((holding) => resolveVerificationId(userId, holding))
    .sort();
  const readBackIds = readBack
    .map((holding) => resolveVerificationId(userId, holding))
    .sort();

  if (writtenIds.join("|") !== readBackIds.join("|")) {
    mismatches.push({
      id: "*",
      symbol: "*",
      assetType: "*",
      field: "holdingIds",
      expected: writtenIds,
      actual: readBackIds,
    });
    return mismatches;
  }

  for (const item of written) {
    const id = resolveVerificationId(userId, item);
    const remote = readById.get(id);
    if (!remote) {
      mismatches.push({
        id,
        symbol: item.symbol,
        assetType: item.assetType ?? "investment",
        field: "presence",
        expected: "present",
        actual: "missing",
      });
      continue;
    }

    const includeInstrumentFields = Boolean(item.providerSymbol?.trim());
    const expected = normalizePersistedHolding(item, userId, includeInstrumentFields);
    const actual = normalizePersistedHolding(
      remote,
      userId,
      includeInstrumentFields,
    );

    if (holdingsEqual(expected, actual)) {
      continue;
    }

    for (const field of Object.keys(expected) as Array<
      keyof PersistedVerificationHolding
    >) {
      if (expected[field] !== actual[field]) {
        mismatches.push({
          id,
          symbol: item.symbol,
          assetType: item.assetType ?? "investment",
          field,
          expected: expected[field],
          actual: actual[field],
        });
      }
    }
  }

  return mismatches;
}

export function describePersistedVerificationMismatch(
  written: StoredPortfolioHolding[],
  readBack: StoredPortfolioHolding[],
  userId: string,
): string | null {
  const mismatches = findPersistedVerificationMismatches(
    written,
    readBack,
    userId,
  );
  if (mismatches.length === 0) return null;

  return mismatches
    .slice(0, 3)
    .map((item) => {
      if (item.field === "holdingIds") {
        return "holding set mismatch";
      }
      return `${item.symbol} (${item.assetType}) ${item.field}: expected ${JSON.stringify(item.expected)} got ${JSON.stringify(item.actual)}`;
    })
    .join("; ");
}

/**
 * Compares intended final portfolio state against ledger-derived remote read-back.
 * Uses resolved holding IDs and semantic field normalization.
 */
export function portfoliosPersistedMatch(
  written: StoredPortfolioHolding[],
  readBack: StoredPortfolioHolding[],
  userId: string,
): boolean {
  return (
    findPersistedVerificationMismatches(written, readBack, userId).length === 0
  );
}

/** Exported for tests comparing ledger-derived numeric fields. */
export function persistedQuantitiesMatch(
  expected: number,
  actual: number,
): boolean {
  return approxEqual(expected, actual);
}
