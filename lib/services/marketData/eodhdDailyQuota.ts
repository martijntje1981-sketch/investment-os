/**
 * Shared persistent daily EODHD API budget — one API key, all endpoints.
 */

import { EodhdProviderError } from "@/lib/services/instruments/eodhdClient";
import { getAmsterdamClock } from "@/lib/services/marketSnapshot/amsterdamSchedule";
import {
  isProviderCircuitOpen,
  recordProviderCircuitFailure,
  recordProviderCircuitSuccess,
  resetProviderCircuitForTests,
} from "@/lib/services/marketData/providerCircuitBreaker";
import { createAdminClient } from "@/lib/supabase/admin";

/** Unified provider id — daily quota is shared across quotes, news, dividends, analyst, FX. */
export const EODHD_API_PROVIDER_ID = "eodhd-api";

export const EODHD_DAILY_LIMIT =
  Number.parseInt(process.env.EODHD_DAILY_LIMIT ?? "100000", 10) || 100000;

export const EODHD_RECOVERY_RESERVE =
  Number.parseInt(process.env.EODHD_RECOVERY_RESERVE ?? "4", 10) || 4;

type UsageRow = {
  usage_date: string;
  calls_used: number;
};

let memoryUsage: { date: string; callsUsed: number } | null = null;

export function getAmsterdamUsageDate(now = new Date()): string {
  return getAmsterdamClock(now).date;
}

function readMemoryUsage(date: string): number {
  if (!memoryUsage || memoryUsage.date !== date) {
    return 0;
  }
  return memoryUsage.callsUsed;
}

function writeMemoryUsage(date: string, callsUsed: number): void {
  memoryUsage = { date, callsUsed };
}

async function readPersistedUsage(date: string): Promise<number> {
  const admin = createAdminClient();
  if (!admin) {
    return readMemoryUsage(date);
  }

  const { data, error } = await admin
    .from("eodhd_daily_usage")
    .select("calls_used")
    .eq("usage_date", date)
    .maybeSingle();

  if (error || !data) {
    return 0;
  }

  return Number((data as UsageRow).calls_used) || 0;
}

async function writePersistedUsage(date: string, callsUsed: number): Promise<void> {
  const admin = createAdminClient();
  if (!admin) {
    writeMemoryUsage(date, callsUsed);
    return;
  }

  const now = new Date().toISOString();
  await admin.from("eodhd_daily_usage").upsert(
    {
      usage_date: date,
      calls_used: callsUsed,
      updated_at: now,
    },
    { onConflict: "usage_date" },
  );
}

export async function getEodhdDailyUsage(now = new Date()): Promise<{
  usageDate: string;
  callsUsed: number;
  dailyLimit: number;
  recoveryReserve: number;
  spendableRemaining: number;
}> {
  const usageDate = getAmsterdamUsageDate(now);
  const callsUsed = await readPersistedUsage(usageDate);
  const spendableRemaining = Math.max(
    0,
    EODHD_DAILY_LIMIT - callsUsed - EODHD_RECOVERY_RESERVE,
  );

  return {
    usageDate,
    callsUsed,
    dailyLimit: EODHD_DAILY_LIMIT,
    recoveryReserve: EODHD_RECOVERY_RESERVE,
    spendableRemaining,
  };
}

async function clearStaleEodhdQuotaCircuitIfBudgetAvailable(
  now = new Date(),
): Promise<void> {
  if (!isProviderCircuitOpen(EODHD_API_PROVIDER_ID, now.getTime())) {
    return;
  }

  const budget = await getEodhdDailyUsage(now);
  if (budget.spendableRemaining > 0) {
    recordProviderCircuitSuccess(EODHD_API_PROVIDER_ID);
  }
}

export async function canSpendEodhdCalls(
  estimatedCalls: number,
  now = new Date(),
): Promise<boolean> {
  if (estimatedCalls <= 0) {
    return true;
  }

  const budget = await getEodhdDailyUsage(now);
  return estimatedCalls <= budget.spendableRemaining;
}

export async function assertCanSpendEodhdCalls(
  estimatedCalls: number,
  now = new Date(),
): Promise<void> {
  if (estimatedCalls <= 0) {
    return;
  }

  const budget = await getEodhdDailyUsage(now);
  if (estimatedCalls > budget.spendableRemaining) {
    throw new Error(
      `EODHD daily budget insufficient: need ${estimatedCalls}, ${budget.spendableRemaining} spendable remaining (${budget.callsUsed}/${budget.dailyLimit} used, ${budget.recoveryReserve} reserved).`,
    );
  }
}

export async function recordEodhdApiCalls(
  count: number,
  now = new Date(),
): Promise<number> {
  if (count <= 0) {
    return (await getEodhdDailyUsage(now)).callsUsed;
  }

  const usageDate = getAmsterdamUsageDate(now);
  const current = await readPersistedUsage(usageDate);
  const next = Math.min(EODHD_DAILY_LIMIT, current + count);
  await writePersistedUsage(usageDate, next);

  if (next >= EODHD_DAILY_LIMIT - EODHD_RECOVERY_RESERVE) {
    recordProviderCircuitFailure(
      EODHD_API_PROVIDER_ID,
      new EodhdProviderError(402, "EODHD daily API budget exhausted"),
    );
  } else {
    recordProviderCircuitSuccess(EODHD_API_PROVIDER_ID);
  }

  return next;
}

export async function markEodhdDailyQuotaExhausted(now = new Date()): Promise<void> {
  const usageDate = getAmsterdamUsageDate(now);
  await writePersistedUsage(usageDate, EODHD_DAILY_LIMIT);
  recordProviderCircuitFailure(
    EODHD_API_PROVIDER_ID,
    new EodhdProviderError(402, "EODHD returned daily quota exhaustion (402)"),
  );
}

export function isEodhdDailyBudgetBlocked(now = new Date()): boolean {
  if (isProviderCircuitOpen(EODHD_API_PROVIDER_ID, now.getTime())) {
    return true;
  }
  return false;
}

export async function isEodhdDailyBudgetExhausted(
  now = new Date(),
): Promise<boolean> {
  if (isEodhdDailyBudgetBlocked(now)) {
    return true;
  }
  const budget = await getEodhdDailyUsage(now);
  return budget.spendableRemaining <= 0;
}

export async function assertEodhdApiAvailable(
  estimatedCalls = 1,
  now = new Date(),
): Promise<void> {
  await clearStaleEodhdQuotaCircuitIfBudgetAvailable(now);

  if (isEodhdDailyBudgetBlocked(now)) {
    throw new Error("EODHD daily API budget is exhausted for today.");
  }
  await assertCanSpendEodhdCalls(estimatedCalls, now);
}

export function getEodhdDailyBudgetBlockReason(): string | null {
  if (!isEodhdDailyBudgetBlocked()) {
    return null;
  }
  return "EODHD daily API budget is exhausted for today.";
}

export function resetEodhdDailyQuotaForTests(): void {
  memoryUsage = null;
  resetProviderCircuitForTests(EODHD_API_PROVIDER_ID);
}
