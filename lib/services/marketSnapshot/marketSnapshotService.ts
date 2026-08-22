/**
 * Shared server-side market snapshot refresh and metadata.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import {
  getAmsterdamClock,
  resolveSnapshotSlotForCron,
  type MarketSnapshotSlot,
} from "@/lib/services/marketSnapshot/amsterdamSchedule";
import {
  estimateFxProviderCalls,
  filterProviderSymbolsForSnapshotSlot,
} from "@/lib/services/marketSnapshot/snapshotSymbolFilter";
import {
  assertCanSpendEodhdCalls,
} from "@/lib/services/marketData/eodhdDailyQuota";
import {
  loadPricesForTargets,
  resetPriceServiceStateForTests,
} from "@/lib/services/prices/priceService";
import { resolveDefaultWatchlist } from "@/lib/services/prices/resolvePriceTargets";
import { resolveQuoteCurrencyForProviderSymbol } from "@/lib/services/instruments/quoteCurrency";
import type { PriceHoldingInput, ResolvedPriceTarget } from "@/lib/services/prices/types";
import { getPriceServiceMetricsSnapshot } from "@/lib/services/prices/observability";

export type MarketSnapshotMetadata = {
  lastRefreshedAt: string | null;
  lastSlot: MarketSnapshotSlot | null;
  lastAmsterdamDate: string | null;
  status: "completed" | "failed" | "running" | null;
  symbolsReceived: number;
};

export type MarketSnapshotRunResult = {
  ok: boolean;
  skipped: boolean;
  reason?: string;
  slot?: MarketSnapshotSlot;
  amsterdamDate?: string;
  symbolsRequested?: number;
  symbolsReceived?: number;
  providerCalls?: number;
  error?: string;
};

type SnapshotRunRow = {
  id: string;
  slot: MarketSnapshotSlot;
  amsterdam_date: string;
  status: "running" | "completed" | "failed";
  started_at: string;
  completed_at: string | null;
  symbols_requested: number;
  symbols_received: number;
  provider_calls: number;
  last_error: string | null;
};

const RUN_STALE_MS = 1000 * 60 * 15;

let memorySnapshotRuns = new Map<string, SnapshotRunRow>();

function snapshotRunKey(slot: MarketSnapshotSlot, amsterdamDate: string): string {
  return `${slot}:${amsterdamDate}`;
}

export function resetMarketSnapshotRunsForTests(): void {
  memorySnapshotRuns = new Map();
}

function dedupeProviderSymbols(symbols: string[]): string[] {
  return [
    ...new Set(
      symbols
        .map((symbol) => symbol.trim().toUpperCase())
        .filter(Boolean),
    ),
  ];
}

export async function collectSnapshotProviderSymbols(): Promise<string[]> {
  const admin = createAdminClient();
  const symbols = new Set<string>();

  if (admin) {
    const { data, error } = await admin
      .from("holdings")
      .select(
        "asset_type, deleted_at, holding_instrument_mappings(provider_symbol)",
      )
      .is("deleted_at", null)
      .eq("asset_type", "investment");

    if (!error && Array.isArray(data)) {
      for (const row of data) {
        const mappings = row.holding_instrument_mappings as
          | { provider_symbol?: string | null }
          | Array<{ provider_symbol?: string | null }>
          | null;
        const mappingList = Array.isArray(mappings)
          ? mappings
          : mappings
            ? [mappings]
            : [];

        for (const mapping of mappingList) {
          const providerSymbol = String(mapping.provider_symbol ?? "").trim();
          if (providerSymbol) {
            symbols.add(providerSymbol.toUpperCase());
          }
        }
      }
    }
  }

  const watchlist = await resolveDefaultWatchlist();
  for (const target of watchlist) {
    if (target.providerSymbol) {
      symbols.add(target.providerSymbol.toUpperCase());
    }
  }

  return dedupeProviderSymbols([...symbols]);
}

function targetsFromProviderSymbols(symbols: string[]): ResolvedPriceTarget[] {
  return symbols.flatMap((providerSymbol) => {
    const currency = resolveQuoteCurrencyForProviderSymbol(providerSymbol);
    if (!currency) {
      return [];
    }

    return [{
      symbol: providerSymbol.split(".")[0] ?? providerSymbol,
      providerSymbol,
      isin: null,
      name: providerSymbol,
      currency,
    }];
  });
}

export function holdingsFromProviderSymbols(
  symbols: string[],
): PriceHoldingInput[] {
  return symbols.map((providerSymbol) => ({
    symbol: providerSymbol.split(".")[0] ?? providerSymbol,
    name: providerSymbol,
    providerSymbol,
  }));
}

async function readSnapshotRun(
  slot: MarketSnapshotSlot,
  amsterdamDate: string,
): Promise<SnapshotRunRow | null> {
  const admin = createAdminClient();
  if (!admin) {
    return memorySnapshotRuns.get(snapshotRunKey(slot, amsterdamDate)) ?? null;
  }

  const { data, error } = await admin
    .from("market_snapshot_runs")
    .select("*")
    .eq("slot", slot)
    .eq("amsterdam_date", amsterdamDate)
    .maybeSingle();

  if (error || !data) return null;
  return data as SnapshotRunRow;
}

async function tryBeginSnapshotRun(input: {
  slot: MarketSnapshotSlot;
  amsterdamDate: string;
}): Promise<"acquired" | "already_completed" | "in_progress"> {
  const admin = createAdminClient();
  const existing = await readSnapshotRun(input.slot, input.amsterdamDate);
  if (existing?.status === "completed") {
    return "already_completed";
  }

  if (existing?.status === "running") {
    const startedAt = Date.parse(existing.started_at);
    if (Number.isFinite(startedAt) && Date.now() - startedAt < RUN_STALE_MS) {
      return "in_progress";
    }
  }

  const now = new Date().toISOString();
  const row: SnapshotRunRow = {
    id: "memory-run",
    slot: input.slot,
    amsterdam_date: input.amsterdamDate,
    status: "running",
    started_at: now,
    completed_at: null,
    symbols_requested: 0,
    symbols_received: 0,
    provider_calls: 0,
    last_error: null,
  };

  if (!admin) {
    memorySnapshotRuns.set(snapshotRunKey(input.slot, input.amsterdamDate), row);
    return "acquired";
  }

  const { error } = await admin.from("market_snapshot_runs").upsert(
    {
      slot: input.slot,
      amsterdam_date: input.amsterdamDate,
      status: "running",
      started_at: now,
      completed_at: null,
      symbols_requested: 0,
      symbols_received: 0,
      provider_calls: 0,
      last_error: null,
      updated_at: now,
    },
    { onConflict: "slot,amsterdam_date" },
  );

  if (error) {
    const retry = await readSnapshotRun(input.slot, input.amsterdamDate);
    if (retry?.status === "completed") {
      return "already_completed";
    }
    if (retry?.status === "running") {
      return "in_progress";
    }
  }

  return "acquired";
}

async function finalizeSnapshotRun(input: {
  slot: MarketSnapshotSlot;
  amsterdamDate: string;
  status: "completed" | "failed";
  symbolsRequested: number;
  symbolsReceived: number;
  providerCalls: number;
  lastError?: string | null;
}): Promise<void> {
  const admin = createAdminClient();
  const now = new Date().toISOString();

  if (!admin) {
    memorySnapshotRuns.set(snapshotRunKey(input.slot, input.amsterdamDate), {
      id: "memory-run",
      slot: input.slot,
      amsterdam_date: input.amsterdamDate,
      status: input.status,
      started_at: now,
      completed_at: now,
      symbols_requested: input.symbolsRequested,
      symbols_received: input.symbolsReceived,
      provider_calls: input.providerCalls,
      last_error: input.lastError ?? null,
    });
    return;
  }

  await admin
    .from("market_snapshot_runs")
    .update({
      status: input.status,
      completed_at: now,
      symbols_requested: input.symbolsRequested,
      symbols_received: input.symbolsReceived,
      provider_calls: input.providerCalls,
      last_error: input.lastError ?? null,
      updated_at: now,
    })
    .eq("slot", input.slot)
    .eq("amsterdam_date", input.amsterdamDate);
}

export async function getMarketSnapshotMetadata(): Promise<MarketSnapshotMetadata> {
  const admin = createAdminClient();
  if (!admin) {
    return {
      lastRefreshedAt: null,
      lastSlot: null,
      lastAmsterdamDate: null,
      status: null,
      symbolsReceived: 0,
    };
  }

  const { data, error } = await admin
    .from("market_snapshot_runs")
    .select("*")
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return {
      lastRefreshedAt: null,
      lastSlot: null,
      lastAmsterdamDate: null,
      status: null,
      symbolsReceived: 0,
    };
  }

  const row = data as SnapshotRunRow;
  return {
    lastRefreshedAt: row.completed_at,
    lastSlot: row.slot,
    lastAmsterdamDate: row.amsterdam_date,
    status: row.status,
    symbolsReceived: row.symbols_received,
  };
}

export async function runScheduledMarketSnapshot(input?: {
  now?: Date;
  windowHint?: "eu" | "us" | null;
  slot?: MarketSnapshotSlot | null;
}): Promise<MarketSnapshotRunResult> {
  const now = input?.now ?? new Date();
  const clock = getAmsterdamClock(now);
  const slot =
    input?.slot ??
    resolveSnapshotSlotForCron(now, input?.windowHint ?? null);

  if (!slot) {
    return {
      ok: true,
      skipped: true,
      reason: "Outside scheduled Amsterdam refresh window.",
    };
  }

  const begin = await tryBeginSnapshotRun({
    slot,
    amsterdamDate: clock.date,
  });

  if (begin === "already_completed") {
    return {
      ok: true,
      skipped: true,
      reason: "Snapshot already refreshed for this slot today.",
      slot,
      amsterdamDate: clock.date,
    };
  }

  if (begin === "in_progress") {
    return {
      ok: true,
      skipped: true,
      reason: "Snapshot refresh already in progress.",
      slot,
      amsterdamDate: clock.date,
    };
  }

  const allSymbols = await collectSnapshotProviderSymbols();
  const symbols = filterProviderSymbolsForSnapshotSlot(allSymbols, slot);

  if (symbols.length === 0) {
    await finalizeSnapshotRun({
      slot,
      amsterdamDate: clock.date,
      status: "completed",
      symbolsRequested: 0,
      symbolsReceived: 0,
      providerCalls: 0,
    });
    return {
      ok: true,
      skipped: false,
      slot,
      amsterdamDate: clock.date,
      symbolsRequested: 0,
      symbolsReceived: 0,
      providerCalls: 0,
    };
  }

  const estimatedCalls =
    symbols.length + estimateFxProviderCalls(symbols);

  try {
    await assertCanSpendEodhdCalls(estimatedCalls);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Insufficient EODHD daily budget.";
    await finalizeSnapshotRun({
      slot,
      amsterdamDate: clock.date,
      status: "failed",
      symbolsRequested: symbols.length,
      symbolsReceived: 0,
      providerCalls: 0,
      lastError: message,
    });
    return {
      ok: false,
      skipped: false,
      slot,
      amsterdamDate: clock.date,
      symbolsRequested: symbols.length,
      symbolsReceived: 0,
      providerCalls: 0,
      error: message,
    };
  }

  const metricsBefore = getPriceServiceMetricsSnapshot();

  try {
    const payload = await loadPricesForTargets(
      targetsFromProviderSymbols(symbols),
      { forceRefresh: true },
    );

    const providerCalls =
      (payload.metrics?.providerCalls ?? getPriceServiceMetricsSnapshot().providerCalls) -
      metricsBefore.providerCalls;

    await finalizeSnapshotRun({
      slot,
      amsterdamDate: clock.date,
      status: "completed",
      symbolsRequested: symbols.length,
      symbolsReceived: payload.received,
      providerCalls,
    });

    return {
      ok: true,
      skipped: false,
      slot,
      amsterdamDate: clock.date,
      symbolsRequested: symbols.length,
      symbolsReceived: payload.received,
      providerCalls,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Market snapshot refresh failed.";

    await finalizeSnapshotRun({
      slot,
      amsterdamDate: clock.date,
      status: "failed",
      symbolsRequested: symbols.length,
      symbolsReceived: 0,
      providerCalls:
        getPriceServiceMetricsSnapshot().providerCalls - metricsBefore.providerCalls,
      lastError: message,
    });

    return {
      ok: false,
      skipped: false,
      slot,
      amsterdamDate: clock.date,
      symbolsRequested: symbols.length,
      symbolsReceived: 0,
      error: message,
    };
  }
}

export function resetMarketSnapshotServiceForTests(): void {
  resetMarketSnapshotRunsForTests();
  resetPriceServiceStateForTests();
}
