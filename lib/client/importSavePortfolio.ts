/**
 * Persists imported holdings to cloud first, then local cache and optional price refresh.
 */

import {
  dispatchPortfolioUpdated,
  loadUserPortfolioHoldings,
  tryRefreshPortfolioPrices,
  type StoredPortfolioHolding,
} from "@/lib/client/portfolioPricing";
import { getOrCreateSyncClientId, pushPortfolioToRemote } from "@/lib/client/portfolioSyncApi";
import { applyRemoteSnapshotToLocalCache, readPortfolioSyncMeta } from "@/lib/client/portfolioSyncState";
import { readSavedUserGoal } from "@/lib/client/userGoalStorage";
import { readImportMappingsFromCache } from "@/lib/services/import/mappingMemory";

export type ImportSaveFailureStage = "cloud_save" | "local_cache";

export type ImportSaveResult =
  | { ok: true; priceWarning?: string }
  | { ok: false; stage: ImportSaveFailureStage; message: string };

export async function saveImportedPortfolio(input: {
  userSub: string;
  holdings: StoredPortfolioHolding[];
  newProviderSymbols?: string[];
  idempotencyKey?: string;
  portfolioId?: string | null;
}): Promise<ImportSaveResult> {
  const goal = readSavedUserGoal(input.userSub, input.portfolioId);
  const importMappings = readImportMappingsFromCache(input.userSub);

  const baseVersion = readPortfolioSyncMeta(input.userSub, input.portfolioId)
    .lastHydratedSyncVersion;
  if (typeof baseVersion !== "number") {
    return {
      ok: false,
      stage: "cloud_save",
      message: "Cloud portfolio must load before import can be saved.",
    };
  }

  const pushResult = await pushPortfolioToRemote({
    idempotencyKey:
      input.idempotencyKey ?? `import:${input.userSub}:${crypto.randomUUID()}`,
    holdings: input.holdings,
    goal,
    importMappings,
    portfolioId: input.portfolioId,
    baseVersion,
    clientId: getOrCreateSyncClientId(),
  });

  if (!pushResult.ok) {
    return {
      ok: false,
      stage: "cloud_save",
      message:
        "error" in pushResult
          ? pushResult.error
          : "Could not save your portfolio to the cloud.",
    };
  }

  try {
    const snapshotBook = pushResult.snapshot.portfolioId ?? null;
    if (
      input.portfolioId &&
      snapshotBook &&
      snapshotBook !== input.portfolioId
    ) {
      return {
        ok: false,
        stage: "local_cache",
        message: "Cloud save returned a different portfolio than the one being imported.",
      };
    }
    applyRemoteSnapshotToLocalCache(input.userSub, pushResult.snapshot, {
      preserveLocalPrices: input.holdings,
    });
    dispatchPortfolioUpdated(input.userSub);
  } catch (error) {
    return {
      ok: false,
      stage: "local_cache",
      message:
        error instanceof Error
          ? error.message
          : "Portfolio was saved to the cloud but could not update this device.",
    };
  }

  const snapshotPortfolioId =
    pushResult.snapshot.portfolioId ?? input.portfolioId ?? null;
  const priceResult = await tryRefreshPortfolioPrices(
    input.userSub,
    loadUserPortfolioHoldings(input.userSub, snapshotPortfolioId, {
      isPrimary: pushResult.snapshot.isPrimary === true,
    }),
    {
      onlyProviderSymbols: input.newProviderSymbols,
      skipIfCacheFresh: true,
    },
  );

  if (!priceResult.updated) {
    return {
      ok: true,
      priceWarning:
        "Holdings imported successfully. Live prices are temporarily unavailable.",
    };
  }

  return { ok: true };
}
