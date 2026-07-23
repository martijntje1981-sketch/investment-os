/**
 * Central wrapper for outbound EODHD HTTP calls — enforces shared daily budget.
 */

import {
  assertEodhdApiAvailable,
  markEodhdDailyQuotaExhausted,
  recordEodhdApiCalls,
} from "@/lib/services/marketData/eodhdDailyQuota";
import { normalizeProviderError } from "@/lib/services/marketData/providerErrors";

export async function executeEodhdApiCall<T>(
  operation: () => Promise<T>,
  options?: { estimatedCost?: number; recordCost?: number },
): Promise<T> {
  const estimatedCost = options?.estimatedCost ?? 1;
  const recordCost = options?.recordCost ?? estimatedCost;

  await assertEodhdApiAvailable(estimatedCost);

  try {
    const result = await operation();
    await recordEodhdApiCalls(recordCost);
    return result;
  } catch (error) {
    const normalized = normalizeProviderError(error);
    if (normalized.kind === "quota_exhausted") {
      await markEodhdDailyQuotaExhausted();
    }
    throw error;
  }
}
