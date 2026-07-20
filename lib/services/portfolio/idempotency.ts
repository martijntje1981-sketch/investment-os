import { createHash } from "node:crypto";

import type { GoalSettings, StoredPortfolioHolding } from "@/lib/types/portfolioStorage";
import type { SavedImportMapping } from "@/lib/services/import/mappingMemory";

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

function normalizeForFingerprint(
  holdings: StoredPortfolioHolding[],
  userId?: string,
): FingerprintHolding[] {
  return holdings
    .map((holding) => ({
      id: userId
        ? resolveRemoteHoldingId(userId, holding.id)
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
