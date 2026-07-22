import { createHash } from "node:crypto";

import type { GoalSettings, StoredPortfolioHolding } from "@/lib/types/portfolioStorage";
import type { SavedImportMapping } from "@/lib/services/import/mappingMemory";
import { resolveHoldingIdForSync } from "@/lib/services/portfolio/holdingUniqueness";

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

export function hashPayload(value: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex")
    .slice(0, 32);
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
  const assetType = holding.assetType === "cash" ? "cash" : "investment";

  if (assetType === "cash") {
    return `cash:${normalizeSymbol(holding.symbol || holding.currency || "EUR")}`;
  }

  return `investment:symbol:${normalizeSymbol(holding.symbol)}`;
}

type ContentFingerprintHolding = {
  identity: string;
  quantity: number;
  purchasePrice: number;
  assetType: "cash" | "investment";
  currency: string;
};

/** Normalizes holdings for stable portfolio-content comparison. */
export function normalizeHoldingsForContentFingerprint(
  holdings: StoredPortfolioHolding[],
): ContentFingerprintHolding[] {
  return holdings
    .map((holding) => {
      const assetType: "cash" | "investment" =
        holding.assetType === "cash" ? "cash" : "investment";
      return {
        identity: holdingContentIdentity(holding),
        quantity: roundFingerprintNumber(Number(holding.quantity) || 0),
        purchasePrice: roundFingerprintNumber(
          assetType === "cash" ? 1 : Number(holding.purchasePrice) || 0,
        ),
        assetType,
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
  const assetType: "cash" | "investment" =
    holding.assetType === "cash" ? "cash" : "investment";
  const base: SyncVerificationHolding = {
    identity: holdingContentIdentity(holding),
    quantity: roundFingerprintNumber(Number(holding.quantity) || 0),
    purchasePrice: roundFingerprintNumber(
      assetType === "cash" ? 1 : Number(holding.purchasePrice) || 0,
    ),
    assetType,
    currency: normalizeSymbol(holding.currency ?? "EUR"),
  };

  if (includeInstrumentFields && assetType === "investment") {
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

/** Compares written vs read-back holdings using canonical business fields only. */
export function portfoliosPersistedMatch(
  written: StoredPortfolioHolding[],
  readBack: StoredPortfolioHolding[],
): boolean {
  const readByIdentity = new Map(
    readBack.map((holding) => [holdingContentIdentity(holding), holding]),
  );

  const writtenIdentities = written
    .map((holding) => holdingContentIdentity(holding))
    .sort();
  const readBackIdentities = readBack
    .map((holding) => holdingContentIdentity(holding))
    .sort();

  if (writtenIdentities.join("|") !== readBackIdentities.join("|")) {
    return false;
  }

  for (const item of written) {
    const identity = holdingContentIdentity(item);
    const remote = readByIdentity.get(identity);
    if (!remote) return false;

    const includeInstrumentFields = Boolean(item.providerSymbol?.trim());
    const expected = normalizeSingleForSyncVerification(
      item,
      includeInstrumentFields,
    );
    const actual = normalizeSingleForSyncVerification(
      remote,
      includeInstrumentFields,
    );

    if (hashPayload(expected) !== hashPayload(actual)) {
      return false;
    }
  }

  return true;
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
      assetType: holding.assetType === "cash" ? "cash" : "investment",
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

export function approxEqual(
  left: number,
  right: number,
  epsilon = 0.0000001,
): boolean {
  return Math.abs(left - right) <= epsilon;
}

export function isUniqueViolation(error: { code?: string; message?: string }): boolean {
  return error.code === "23505";
}
