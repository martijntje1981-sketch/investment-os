import type { GoalSettings, StoredPortfolioHolding } from "@/lib/types/portfolioStorage";
import type { SavedImportMapping } from "@/lib/services/import/mappingMemory";
import {
  buildMigrationIdempotencyKey,
  hashPayload,
  portfolioContentFingerprint,
  portfolioFingerprint,
} from "@/lib/services/portfolio/idempotency";
import { describePersistedVerificationMismatch } from "@/lib/services/portfolio/persistedVerification";
import { portfoliosPersistedMatch } from "@/lib/services/portfolio/persistedVerification";
import { buildSyncPreview, sanitizeLocalHoldings } from "@/lib/services/portfolio/mappers";
import { isSuspiciousCashOnlyShrink } from "@/lib/services/portfolio/portfolioPersistenceGuard";
import {
  isStaleVersionRpcError,
  type PortfolioRepository,
} from "@/lib/services/portfolio/repository";
import { verifyPersistedPortfolioSnapshot } from "@/lib/services/portfolio/syncVerification";
import type {
  PortfolioMigrateRequest,
  PortfolioSyncRequest,
  RemotePortfolioSnapshot,
} from "@/lib/services/portfolio/types";
import { SYNC_ERROR_CODES } from "@/lib/services/portfolio/types";

const SYNC_VERIFICATION_FAILED_MESSAGE =
  "Cloud sync could not be verified. Your latest changes may not have reached every device yet.";

export class PortfolioSyncError extends Error {
  code: string;
  snapshot?: RemotePortfolioSnapshot;

  constructor(
    code: string,
    message: string,
    snapshot?: RemotePortfolioSnapshot,
  ) {
    super(message);
    this.code = code;
    this.snapshot = snapshot;
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
    const snapshot = await repo.fetchSnapshot(userId, request.portfolioId);
    if (portfoliosPersistedMatch(holdings, snapshot.holdings, userId)) {
      return snapshot;
    }
  }

  const remoteBefore = await repo.fetchSnapshot(userId, request.portfolioId);
  const eventDiagnostics = {
    portfolioId: request.portfolioId ?? remoteBefore.portfolioId,
    baseVersion: request.baseVersion ?? remoteBefore.syncVersion,
    clientId: request.clientId ?? null,
    holdingCount: holdings.length,
    contentFingerprint: portfolioContentFingerprint(holdings, goal).slice(0, 16),
  };

  if (remoteBefore.holdingCount > 0) {
    const localFingerprint = portfolioFingerprint(holdings, userId);
    const remoteFingerprint = portfolioFingerprint(
      remoteBefore.holdings,
      userId,
    );

    if (localFingerprint === remoteFingerprint) {
      await repo.markMigrationCompleted(userId);
      await repo.recordSyncEvent(userId, "migrate", idempotencyKey, payloadHash, "completed", {
        ...eventDiagnostics,
        resultingVersion: remoteBefore.syncVersion,
      });
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
      request.portfolioId,
      {
        baseVersion: request.baseVersion ?? remoteBefore.syncVersion,
        clientId: request.clientId,
        idempotencyKey,
        payloadHash,
      },
    );
  } catch (error) {
    await repo.recordSyncEvent(
      userId,
      "migrate",
      idempotencyKey,
      payloadHash,
      "failed",
      { ...eventDiagnostics, errorCode: SYNC_ERROR_CODES.PROVIDER_FAILURE },
    );
    throw error;
  }

  if (
    !(await verifyPersistedPortfolioSnapshot(
      repo,
      userId,
      holdings,
      snapshot,
    ))
  ) {
    const mismatch = describePersistedVerificationMismatch(
      holdings,
      snapshot.holdings,
      userId,
    );
    await repo.recordSyncEvent(
      userId,
      "migrate",
      idempotencyKey,
      payloadHash,
      "failed",
      {
        ...eventDiagnostics,
        resultingVersion: snapshot.syncVersion,
        errorCode: SYNC_ERROR_CODES.SYNC_VERIFICATION_FAILED,
      },
    );
    throw new PortfolioSyncError(
      SYNC_ERROR_CODES.SYNC_VERIFICATION_FAILED,
      mismatch
        ? `${SYNC_VERIFICATION_FAILED_MESSAGE} (${mismatch})`
        : SYNC_VERIFICATION_FAILED_MESSAGE,
    );
  }

  await repo.markMigrationCompleted(userId);
  await repo.recordSyncEvent(
    userId,
    "migrate",
    idempotencyKey,
    payloadHash,
    "completed",
    { ...eventDiagnostics, resultingVersion: snapshot.syncVersion },
  );
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
    const snapshot = await repo.fetchSnapshot(userId, request.portfolioId);
    if (portfoliosPersistedMatch(holdings, snapshot.holdings, userId)) {
      return snapshot;
    }
  }

  const remoteBefore = await repo.fetchSnapshot(userId, request.portfolioId);
  const eventDiagnostics = {
    portfolioId: request.portfolioId ?? remoteBefore.portfolioId,
    baseVersion: request.baseVersion ?? null,
    clientId: request.clientId ?? null,
    holdingCount: holdings.length,
    contentFingerprint: portfolioContentFingerprint(
      holdings,
      goal ?? null,
    ).slice(0, 16),
  };

  if (
    typeof request.baseVersion !== "number" ||
    !Number.isFinite(request.baseVersion)
  ) {
    await repo.recordSyncEvent(
      userId,
      "sync",
      request.idempotencyKey,
      hashPayload({
        holdings,
        goal,
        importMappings,
        idempotencyKey: request.idempotencyKey,
      }),
      "failed",
      { ...eventDiagnostics, errorCode: SYNC_ERROR_CODES.STALE_VERSION },
    );
    throw new PortfolioSyncError(
      SYNC_ERROR_CODES.STALE_VERSION,
      "Cloud portfolio has changed. Rehydrate before saving.",
      remoteBefore,
    );
  }

  if (request.baseVersion !== remoteBefore.syncVersion) {
    await repo.recordSyncEvent(
      userId,
      "sync",
      request.idempotencyKey,
      hashPayload({
        holdings,
        goal,
        importMappings,
        idempotencyKey: request.idempotencyKey,
      }),
      "failed",
      {
        ...eventDiagnostics,
        resultingVersion: remoteBefore.syncVersion,
        errorCode: SYNC_ERROR_CODES.STALE_VERSION,
      },
    );
    throw new PortfolioSyncError(
      SYNC_ERROR_CODES.STALE_VERSION,
      "Cloud portfolio has changed. Rehydrate before saving.",
      remoteBefore,
    );
  }

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
      request.portfolioId,
      {
        baseVersion: request.baseVersion,
        clientId: request.clientId,
        idempotencyKey: request.idempotencyKey,
        payloadHash,
      },
    );
  } catch (error) {
    if (isStaleVersionRpcError(error)) {
      const current = await repo.fetchSnapshot(userId, request.portfolioId);
      await repo.recordSyncEvent(
        userId,
        "sync",
        request.idempotencyKey,
        payloadHash,
        "failed",
        {
          ...eventDiagnostics,
          resultingVersion: current.syncVersion,
          errorCode: SYNC_ERROR_CODES.STALE_VERSION,
        },
      );
      throw new PortfolioSyncError(
        SYNC_ERROR_CODES.STALE_VERSION,
        "Cloud portfolio has changed. Rehydrate before saving.",
        current,
      );
    }
    await repo.recordSyncEvent(
      userId,
      "sync",
      request.idempotencyKey,
      payloadHash,
      "failed",
      { ...eventDiagnostics, errorCode: SYNC_ERROR_CODES.PROVIDER_FAILURE },
    );
    throw error;
  }

  if (
    !(await verifyPersistedPortfolioSnapshot(
      repo,
      userId,
      holdings,
      snapshot,
    ))
  ) {
    const mismatch = describePersistedVerificationMismatch(
      holdings,
      snapshot.holdings,
      userId,
    );
    await repo.recordSyncEvent(
      userId,
      "sync",
      request.idempotencyKey,
      payloadHash,
      "failed",
      {
        ...eventDiagnostics,
        resultingVersion: snapshot.syncVersion,
        errorCode: SYNC_ERROR_CODES.SYNC_VERIFICATION_FAILED,
      },
    );
    throw new PortfolioSyncError(
      SYNC_ERROR_CODES.SYNC_VERIFICATION_FAILED,
      mismatch
        ? `${SYNC_VERIFICATION_FAILED_MESSAGE} (${mismatch})`
        : SYNC_VERIFICATION_FAILED_MESSAGE,
    );
  }

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
