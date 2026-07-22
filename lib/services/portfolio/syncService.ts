import type { GoalSettings, StoredPortfolioHolding } from "@/lib/types/portfolioStorage";
import type { SavedImportMapping } from "@/lib/services/import/mappingMemory";
import {
  buildMigrationIdempotencyKey,
  hashPayload,
  portfolioFingerprint,
} from "@/lib/services/portfolio/idempotency";
import { buildSyncPreview, sanitizeLocalHoldings } from "@/lib/services/portfolio/mappers";
import { isSuspiciousCashOnlyShrink } from "@/lib/services/portfolio/portfolioPersistenceGuard";
import type { PortfolioRepository } from "@/lib/services/portfolio/repository";
import type {
  PortfolioMigrateRequest,
  PortfolioSyncRequest,
  RemotePortfolioSnapshot,
} from "@/lib/services/portfolio/types";
import { SYNC_ERROR_CODES } from "@/lib/services/portfolio/types";

function verifySnapshotMatchesRequest(
  snapshot: RemotePortfolioSnapshot,
  holdings: StoredPortfolioHolding[],
  userId: string,
): boolean {
  return (
    portfolioFingerprint(snapshot.holdings, userId) ===
    portfolioFingerprint(holdings, userId)
  );
}

export class PortfolioSyncError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export async function migrateLocalPortfolio(
  repo: PortfolioRepository,
  userId: string,
  request: PortfolioMigrateRequest,
  goal: GoalSettings | null,
  importMappings: SavedImportMapping[],
): Promise<RemotePortfolioSnapshot> {
  const holdings = sanitizeLocalHoldings(request.holdings);
  if (holdings.length === 0) {
    throw new PortfolioSyncError(
      SYNC_ERROR_CODES.VALIDATION,
      "No valid local holdings to migrate.",
    );
  }

  const idempotencyKey =
    request.idempotencyKey ||
    buildMigrationIdempotencyKey(userId, request.localFingerprint);
  const payloadHash = hashPayload({
    holdings,
    goal,
    importMappings,
    version: request.localFingerprint,
  });

  const existingEvent = await repo.findCompletedSyncEvent(
    userId,
    idempotencyKey,
  );
  if (existingEvent?.status === "completed") {
    return repo.fetchSnapshot(userId);
  }

  const remoteBefore = await repo.fetchSnapshot(userId);
  if (remoteBefore.holdingCount > 0) {
    const localFingerprint = portfolioFingerprint(holdings, userId);
    const remoteFingerprint = portfolioFingerprint(
      remoteBefore.holdings,
      userId,
    );

    if (localFingerprint === remoteFingerprint) {
      await repo.markMigrationCompleted(userId);
      await repo.recordSyncEvent(userId, "migrate", idempotencyKey, payloadHash);
      return remoteBefore;
    }

    throw new PortfolioSyncError(
      SYNC_ERROR_CODES.CONFLICT,
      "Remote portfolio already contains holdings.",
    );
  }

  let snapshot: RemotePortfolioSnapshot;
  try {
    snapshot = await repo.applySnapshot(
      userId,
      holdings,
      goal,
      importMappings,
      "migrate",
    );
  } catch (error) {
    await repo.recordSyncEvent(
      userId,
      "migrate",
      idempotencyKey,
      payloadHash,
      "failed",
    );
    throw error;
  }

  if (!verifySnapshotMatchesRequest(snapshot, holdings, userId)) {
    await repo.recordSyncEvent(
      userId,
      "migrate",
      idempotencyKey,
      payloadHash,
      "failed",
    );
    throw new PortfolioSyncError(
      SYNC_ERROR_CODES.PROVIDER_FAILURE,
      "Migration verification failed after remote write.",
    );
  }

  await repo.markMigrationCompleted(userId);
  await repo.recordSyncEvent(userId, "migrate", idempotencyKey, payloadHash);
  return snapshot;
}

export async function syncPortfolioSnapshot(
  repo: PortfolioRepository,
  userId: string,
  request: PortfolioSyncRequest,
  goal: GoalSettings | null | undefined,
  importMappings: SavedImportMapping[] | undefined,
): Promise<RemotePortfolioSnapshot> {
  const holdings = sanitizeLocalHoldings(request.holdings);

  const existingEvent = await repo.findCompletedSyncEvent(
    userId,
    request.idempotencyKey,
  );
  if (existingEvent?.status === "completed") {
    const snapshot = await repo.fetchSnapshot(userId);
    if (verifySnapshotMatchesRequest(snapshot, holdings, userId)) {
      return snapshot;
    }
  }

  const remoteBefore = await repo.fetchSnapshot(userId);
  if (
    remoteBefore.holdingCount > 0 &&
    isSuspiciousCashOnlyShrink(remoteBefore.holdings, holdings)
  ) {
    throw new PortfolioSyncError(
      SYNC_ERROR_CODES.PARTIAL_SAVE,
      "Refusing partial portfolio save that would remove all investments while keeping cash.",
    );
  }

  const payloadHash = hashPayload({
    holdings,
    goal,
    importMappings,
    idempotencyKey: request.idempotencyKey,
  });

  let snapshot: RemotePortfolioSnapshot;
  try {
    snapshot = await repo.applySnapshot(
      userId,
      holdings,
      goal,
      importMappings,
      "sync",
    );
  } catch (error) {
    await repo.recordSyncEvent(
      userId,
      "sync",
      request.idempotencyKey,
      payloadHash,
      "failed",
    );
    throw error;
  }

  if (!verifySnapshotMatchesRequest(snapshot, holdings, userId)) {
    await repo.recordSyncEvent(
      userId,
      "sync",
      request.idempotencyKey,
      payloadHash,
      "failed",
    );
    throw new PortfolioSyncError(
      SYNC_ERROR_CODES.PROVIDER_FAILURE,
      "Sync verification failed after remote write.",
    );
  }

  await repo.recordSyncEvent(
    userId,
    "sync",
    request.idempotencyKey,
    payloadHash,
  );
  return snapshot;
}

export function buildMigrationPreview(
  holdings: StoredPortfolioHolding[],
  goal: GoalSettings | null,
  importMappings: SavedImportMapping[],
  userId: string,
) {
  return buildSyncPreview(holdings, goal, importMappings, userId);
}
