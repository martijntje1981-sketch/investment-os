import { createHash } from "node:crypto";

import type { GoalSettings, StoredPortfolioHolding } from "@/lib/types/portfolioStorage";
import type { SavedImportMapping } from "@/lib/services/import/mappingMemory";
import { resolveHoldingIdForSync } from "@/lib/services/portfolio/holdingUniqueness";
import { hashPayload } from "@/lib/services/portfolio/idempotencyCore";
export { approxEqual, hashPayload } from "@/lib/services/portfolio/idempotencyCore";
export {
  describePersistedVerificationMismatch,
  findPersistedVerificationMismatches,
  normalizeHoldingForPersistedVerification,
  normalizeHoldingsForPersistedVerification,
  portfoliosPersistedMatch,
} from "@/lib/services/portfolio/persistedVerification";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

/** Deterministic holding id for legacy local ids that are not UUIDs. */
export function resolveRemoteHoldingId(
  userId: string,
  localId: string,
): string {
  if (isUuid(localId)) return localId.toLowerCase();

  const hash = createHash("sha256")
    .update(`investment-os:holding:${userId}:${localId}`)
    .digest("hex");

  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    `4${hash.slice(13, 16)}`,
    `a${hash.slice(17, 20)}`,
    hash.slice(20, 32),
  ].join("-");
}

export function buildMigrationIdempotencyKey(
  userId: string,
  localFingerprint: string,
): string {
  return `migrate:${userId}:${localFingerprint}`;
}

export function buildSyncIdempotencyKey(
  userId: string,
  requestId: string,
): string {
  return `sync:${userId}:${requestId}`;
}

export function buildHoldingLedgerIdempotencyKey(
  prefix: "migrate" | "sync",
  holdingId: string,
  quantity: number,
  purchasePrice: number,
): string {
  const qty = quantity.toFixed(8);
  const price = purchasePrice.toFixed(8);
  return `${prefix}:ledger:${holdingId}:${qty}:${price}`;
}

type FingerprintHolding = {
  id: string;
  symbol: string;
  quantity: number;
  purchasePrice: number;
  assetType: string;
  currency: string;
  isin: string | null;
  providerSymbol: string | null;
};

function normalizeSymbol(value: unknown): string {
  return String(value ?? "").trim().toUpperCase();
}

function normalizeOptionalSymbol(value: unknown): string | null {
  const normalized = normalizeSymbol(value);
  return normalized || null;
}

function roundFingerprintNumber(value: number): number {
  return Number(value.toFixed(8));
}

/** Stable user-owned identity for a holding — ignores runtime ids and market data. */
export function holdingContentIdentity(
  holding: StoredPortfolioHolding,
): string {
  if (holding.assetType === "cash") {
    return `cash:${normalizeSymbol(holding.symbol || holding.currency || "EUR")}`;
  }

  if (holding.assetType === "crypto") {
    return `crypto:id:${String(holding.id).toLowerCase()}`;
  }

  return `investment:symbol:${normalizeSymbol(holding.symbol)}`;
}

type ContentFingerprintHolding = {
  identity: string;
  quantity: number;
  purchasePrice: number;
  assetType: "cash" | "investment" | "crypto";
  currency: string;
  pairCurrency?: string;
  pricingStatus?: string;
  tradingPair?: string;
  platform?: string | null;
  currentManualPrice?: number | null;
  manualCurrentValue?: number | null;
};

/** Normalizes holdings for stable portfolio-content comparison. */
export function normalizeHoldingsForContentFingerprint(
  holdings: StoredPortfolioHolding[],
): ContentFingerprintHolding[] {
  return holdings
    .map((holding) => {
      if (holding.assetType === "cash") {
        return {
          identity: holdingContentIdentity(holding),
          quantity: roundFingerprintNumber(Number(holding.quantity) || 0),
          purchasePrice: 1,
          assetType: "cash" as const,
          currency: normalizeSymbol(holding.currency ?? "EUR"),
        };
      }

      if (holding.assetType === "crypto") {
        return {
          identity: holdingContentIdentity(holding),
          quantity: roundFingerprintNumber(Number(holding.quantity) || 0),
          purchasePrice: roundFingerprintNumber(Number(holding.purchasePrice) || 0),
          assetType: "crypto" as const,
          currency: normalizeSymbol(holding.portfolioCurrency ?? holding.currency ?? "EUR"),
          pairCurrency: normalizeSymbol(holding.pairCurrency ?? "EUR"),
          pricingStatus: holding.pricingStatus ?? "needs_review",
          tradingPair: String(holding.tradingPair ?? ""),
          platform: holding.platform ?? null,
          currentManualPrice:
            holding.currentManualPrice != null &&
            Number.isFinite(holding.currentManualPrice) &&
            holding.currentManualPrice > 0
              ? roundFingerprintNumber(holding.currentManualPrice)
              : null,
          manualCurrentValue:
            holding.manualCurrentValue != null &&
            Number.isFinite(holding.manualCurrentValue) &&
            holding.manualCurrentValue > 0
              ? roundFingerprintNumber(holding.manualCurrentValue)
              : null,
        };
      }

      return {
        identity: holdingContentIdentity(holding),
        quantity: roundFingerprintNumber(Number(holding.quantity) || 0),
        purchasePrice: roundFingerprintNumber(Number(holding.purchasePrice) || 0),
        assetType: "investment" as const,
        currency: normalizeSymbol(holding.currency ?? "EUR"),
      };
    })
    .sort((a, b) => a.identity.localeCompare(b.identity));
}

/** Stable fingerprint of user-owned portfolio content (excludes market/sync metadata). */
export function portfolioContentFingerprint(
  holdings: StoredPortfolioHolding[],
  goal?: GoalSettings | null,
): string {
  return hashPayload({
    holdings: normalizeHoldingsForContentFingerprint(holdings),
    goal: goalFingerprint(goal),
  });
}

export function portfoliosContentMatch(
  localHoldings: StoredPortfolioHolding[],
  remoteHoldings: StoredPortfolioHolding[],
  localGoal?: GoalSettings | null,
  remoteGoal?: GoalSettings | null,
): boolean {
  return (
    portfolioContentFingerprint(localHoldings, localGoal) ===
    portfolioContentFingerprint(remoteHoldings, remoteGoal)
  );
}

function holdingsPersistedContentEqual(
  expected: StoredPortfolioHolding,
  actual: StoredPortfolioHolding,
): boolean {
  const includeInstrumentFields =
    expected.assetType === "investment" &&
    Boolean(expected.providerSymbol?.trim());
  return (
    hashPayload(normalizeSingleForSyncVerification(expected, includeInstrumentFields)) ===
    hashPayload(normalizeSingleForSyncVerification(actual, includeInstrumentFields))
  );
}

/** True when every remote holding matches a local holding with the same business identity. */
export function portfolioRemoteHoldingsAreSubsetOfLocal(
  localHoldings: StoredPortfolioHolding[],
  remoteHoldings: StoredPortfolioHolding[],
): boolean {
  const localByIdentity = new Map(
    localHoldings.map((holding) => [holdingContentIdentity(holding), holding]),
  );

  for (const remoteHolding of remoteHoldings) {
    const localHolding = localByIdentity.get(holdingContentIdentity(remoteHolding));
    if (!localHolding) {
      return false;
    }
    if (!holdingsPersistedContentEqual(localHolding, remoteHolding)) {
      return false;
    }
  }

  return true;
}

/** Local portfolio has only extra crypto rows compared with remote. */
export function localHasPendingCryptoUpload(
  localHoldings: StoredPortfolioHolding[],
  remoteHoldings: StoredPortfolioHolding[],
): boolean {
  const remoteIdentities = new Set(
    remoteHoldings.map((holding) => holdingContentIdentity(holding)),
  );
  const extras = localHoldings.filter(
    (holding) => !remoteIdentities.has(holdingContentIdentity(holding)),
  );

  return (
    extras.length > 0 &&
    extras.every((holding) => holding.assetType === "crypto") &&
    portfolioRemoteHoldingsAreSubsetOfLocal(localHoldings, remoteHoldings)
  );
}

type SyncVerificationHolding = ContentFingerprintHolding & {
  providerSymbol?: string | null;
  isin?: string | null;
};

function normalizeIsinForVerification(value: unknown): string | null {
  if (value == null) return null;
  const normalized = String(value).trim().toUpperCase();
  return /^[A-Z0-9]{12}$/.test(normalized) ? normalized : null;
}

function normalizeSingleForSyncVerification(
  holding: StoredPortfolioHolding,
  includeInstrumentFields: boolean,
): SyncVerificationHolding {
  if (holding.assetType === "cash") {
    return {
      identity: holdingContentIdentity(holding),
      quantity: roundFingerprintNumber(Number(holding.quantity) || 0),
      purchasePrice: 1,
      assetType: "cash",
      currency: normalizeSymbol(holding.currency ?? "EUR"),
    };
  }

  if (holding.assetType === "crypto") {
    return {
      identity: holdingContentIdentity(holding),
      quantity: roundFingerprintNumber(Number(holding.quantity) || 0),
      purchasePrice: roundFingerprintNumber(Number(holding.purchasePrice) || 0),
      assetType: "crypto",
      currency: normalizeSymbol(holding.portfolioCurrency ?? holding.currency ?? "EUR"),
      pairCurrency: normalizeSymbol(holding.pairCurrency ?? "EUR"),
      pricingStatus: holding.pricingStatus ?? "needs_review",
      tradingPair: String(holding.tradingPair ?? ""),
      platform: holding.platform ?? null,
      currentManualPrice:
        holding.currentManualPrice != null &&
        Number.isFinite(holding.currentManualPrice) &&
        holding.currentManualPrice > 0
          ? roundFingerprintNumber(holding.currentManualPrice)
          : null,
      manualCurrentValue:
        holding.manualCurrentValue != null &&
        Number.isFinite(holding.manualCurrentValue) &&
        holding.manualCurrentValue > 0
          ? roundFingerprintNumber(holding.manualCurrentValue)
          : null,
    };
  }

  const base: SyncVerificationHolding = {
    identity: holdingContentIdentity(holding),
    quantity: roundFingerprintNumber(Number(holding.quantity) || 0),
    purchasePrice: roundFingerprintNumber(Number(holding.purchasePrice) || 0),
    assetType: "investment",
    currency: normalizeSymbol(holding.currency ?? "EUR"),
  };

  if (includeInstrumentFields) {
    return {
      ...base,
      providerSymbol: normalizeOptionalSymbol(holding.providerSymbol),
      isin: normalizeIsinForVerification(holding.isin),
    };
  }

  return base;
}

/** Canonical persisted fields for post-write sync verification. */
export function normalizeHoldingsForSyncVerification(
  holdings: StoredPortfolioHolding[],
): SyncVerificationHolding[] {
  return holdings
    .map((holding) =>
      normalizeSingleForSyncVerification(
        holding,
        Boolean(holding.providerSymbol?.trim()),
      ),
    )
    .sort((a, b) => a.identity.localeCompare(b.identity));
}

export function portfolioSyncVerificationFingerprint(
  holdings: StoredPortfolioHolding[],
): string {
  return hashPayload(normalizeHoldingsForSyncVerification(holdings));
}

/** @internal Exported for sync verification tests. */
export function normalizeHoldingForSyncVerification(
  holding: StoredPortfolioHolding,
  includeInstrumentFields = false,
): SyncVerificationHolding {
  return normalizeSingleForSyncVerification(holding, includeInstrumentFields);
}

function normalizeForFingerprint(
  holdings: StoredPortfolioHolding[],
  userId?: string,
): FingerprintHolding[] {
  return holdings
    .map((holding) => ({
      id: userId
        ? resolveHoldingIdForSync(userId, holding)
        : holding.id,
      symbol: String(holding.symbol ?? "")
        .trim()
        .toUpperCase(),
      quantity: Number(holding.quantity) || 0,
      purchasePrice: Number(holding.purchasePrice) || 0,
      assetType: holding.assetType === "cash" ? "cash" : holding.assetType === "crypto" ? "crypto" : "investment",
      currency: String(holding.currency ?? "EUR").toUpperCase(),
      isin: holding.isin
        ? String(holding.isin).trim().toUpperCase()
        : null,
      providerSymbol: holding.providerSymbol
        ? String(holding.providerSymbol).trim()
        : null,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function portfolioFingerprint(
  holdings: StoredPortfolioHolding[],
  userId?: string,
): string {
  return hashPayload(normalizeForFingerprint(holdings, userId));
}

export function goalFingerprint(goal: GoalSettings | null | undefined): string {
  if (!goal) return "none";
  return hashPayload({
    targetValue: goal.targetValue,
    targetYear: goal.targetYear,
    monthlyContribution: goal.monthlyContribution,
    expectedAnnualReturn: goal.expectedAnnualReturn,
    passiveIncomeTarget: goal.passiveIncomeTarget ?? null,
  });
}

export function importMappingsFingerprint(
  mappings: SavedImportMapping[],
): string {
  const normalized = mappings
    .map((mapping) => ({
      lookupKey: mapping.lookupKey,
      providerSymbol: mapping.providerSymbol,
      symbol: mapping.symbol,
      isin: mapping.isin,
      exchange: mapping.exchange,
    }))
    .sort((a, b) => a.lookupKey.localeCompare(b.lookupKey));
  return hashPayload(normalized);
}

export function isUniqueViolation(error: { code?: string; message?: string }): boolean {
  return error.code === "23505";
}
