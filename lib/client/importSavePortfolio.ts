/**
 * Persists imported holdings to cloud first, then local cache and optional price refresh.
 */

import {
  dispatchPortfolioUpdated,
  loadUserPortfolioHoldings,
  tryRefreshPortfolioPrices,
  type StoredPortfolioHolding,
} from "@/lib/client/portfolioPricing";
import { pushPortfolioToRemote } from "@/lib/client/portfolioSyncApi";
import { applyRemoteSnapshotToLocalCache } from "@/lib/client/portfolioSyncState";
import { readSavedUserGoal } from "@/lib/client/userGoalStorage";
import { readImportMappingsFromCache } from "@/lib/services/import/mappingMemory";

export type ImportSaveFailureStage = "cloud_save" | "local_cache";

export type ImportSaveResult =
  | { ok: true; priceWarning?: string }
  | { ok: false; stage: ImportSaveFailureStage; message: string };

export async function saveImportedPortfolio(input: {
  userSub: string;
  holdings: StoredPortfolioHolding[];
}): Promise<ImportSaveResult> {
  const goal = readSavedUserGoal(input.userSub);
  const importMappings = readImportMappingsFromCache(input.userSub);

  const pushResult = await pushPortfolioToRemote({
    idempotencyKey: `import:${input.userSub}:${crypto.randomUUID()}`,
    holdings: input.holdings,
    goal,
    importMappings,
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

  const priceResult = await tryRefreshPortfolioPrices(
    input.userSub,
    loadUserPortfolioHoldings(input.userSub),
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
