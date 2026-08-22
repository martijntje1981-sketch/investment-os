"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";

import { discoverCacheKey } from "@/lib/client/portfolioStorageKeys";
import { isNewsCacheFresh, readNewsCache } from "@/lib/client/portfolioNews";
import {
  buildDiscoverSnapshot,
  DISCOVER_SNAPSHOT_TTL_MS,
} from "@/lib/services/discover/buildDiscoverSnapshot";
import type { DiscoverSnapshot } from "@/lib/services/discover/types";
import { buildInvestmentIntelligence } from "@/lib/services/news/investmentIntelligence";
import { portfolioContentFingerprint } from "@/lib/services/portfolio/idempotency";
import type { GoalSettings, StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

type DiscoverCachePayload = {
  snapshot: DiscoverSnapshot;
  cachedAt: string;
};

type DiscoverBuildRequest = {
  userSub: string | null;
  holdings: StoredPortfolioHolding[];
  goal: GoalSettings | null;
};

type DiscoverStoreState = {
  snapshot: DiscoverSnapshot | null;
  isLoading: boolean;
  error: string | null;
};

const memoryCache = new Map<string, DiscoverCachePayload>();
const inFlightBuilds = new Map<string, Promise<DiscoverSnapshot>>();
const subscribers = new Set<() => void>();

let storeState: DiscoverStoreState = {
  snapshot: null,
  isLoading: false,
  error: null,
};

let lastRequestKey = "";

function emitChange() {
  for (const subscriber of subscribers) {
    subscriber();
  }
}

function setStoreState(next: DiscoverStoreState) {
  storeState = next;
  emitChange();
}

function subscribe(listener: () => void) {
  subscribers.add(listener);
  return () => {
    subscribers.delete(listener);
  };
}

function getSnapshotState(): DiscoverStoreState {
  return storeState;
}

function buildRequestKey(request: DiscoverBuildRequest): string {
  const fingerprint = portfolioContentFingerprint(request.holdings, request.goal);
  return `${request.userSub ?? "anonymous"}:${fingerprint}`;
}

function readDiscoverCache(
  userSub: string,
  portfolioFingerprint: string,
): DiscoverCachePayload | null {
  const memoryKey = discoverCacheKey(userSub, portfolioFingerprint);
  const fromMemory = memoryCache.get(memoryKey);
  if (fromMemory) return fromMemory;

  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(memoryKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DiscoverCachePayload;
    if (!parsed.snapshot || !parsed.cachedAt) return null;
    memoryCache.set(memoryKey, parsed);
    return parsed;
  } catch {
    return null;
  }
}

function writeDiscoverCache(
  userSub: string,
  portfolioFingerprint: string,
  snapshot: DiscoverSnapshot,
): void {
  const payload: DiscoverCachePayload = {
    snapshot,
    cachedAt: new Date().toISOString(),
  };
  const memoryKey = discoverCacheKey(userSub, portfolioFingerprint);
  memoryCache.set(memoryKey, payload);

  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(memoryKey, JSON.stringify(payload));
  } catch {
    // Ignore quota failures; memory cache still serves this session.
  }
}

function isDiscoverCacheFresh(cachedAt: string | undefined): boolean {
  if (!cachedAt) return false;
  const age = Date.now() - new Date(cachedAt).getTime();
  return Number.isFinite(age) && age >= 0 && age < DISCOVER_SNAPSHOT_TTL_MS;
}

function resolveNewsContext(userSub: string | null) {
  if (!userSub) {
    return {
      newsPayload: null,
      intelligence: null,
      intelligenceFromCache: false,
      newsStale: true,
    };
  }

  const cached = readNewsCache(userSub);
  if (!cached) {
    return {
      newsPayload: null,
      intelligence: null,
      intelligenceFromCache: false,
      newsStale: true,
    };
  }

  const newsStale = !isNewsCacheFresh(cached.cachedAt);
  const intelligence = buildInvestmentIntelligence(cached.response);

  return {
    newsPayload: cached.response,
    intelligence,
    intelligenceFromCache: true,
    newsStale,
  };
}

export function getDiscoverSnapshotSync(
  request: DiscoverBuildRequest,
): DiscoverSnapshot | null {
  if (!request.userSub || request.holdings.length === 0) {
    return null;
  }

  const portfolioFingerprint = portfolioContentFingerprint(
    request.holdings,
    request.goal,
  );
  const cached = readDiscoverCache(request.userSub, portfolioFingerprint);
  if (cached && isDiscoverCacheFresh(cached.cachedAt)) {
    return cached.snapshot;
  }

  return null;
}

export async function getDiscoverSnapshot(
  request: DiscoverBuildRequest,
): Promise<DiscoverSnapshot> {
  const portfolioFingerprint = portfolioContentFingerprint(
    request.holdings,
    request.goal,
  );
  const requestKey = buildRequestKey(request);
  const userSub = request.userSub;

  if (userSub) {
    const cached = readDiscoverCache(userSub, portfolioFingerprint);
    if (cached && isDiscoverCacheFresh(cached.cachedAt)) {
      return cached.snapshot;
    }
  }

  const existing = inFlightBuilds.get(requestKey);
  if (existing) {
    return existing;
  }

  const buildPromise = Promise.resolve().then(() => {
    const newsContext = resolveNewsContext(userSub);
    const snapshot = buildDiscoverSnapshot({
      holdings: request.holdings,
      portfolioFingerprint,
      newsPayload: newsContext.newsPayload,
      intelligence: newsContext.intelligence,
      intelligenceFromCache: newsContext.intelligenceFromCache,
      newsStale: newsContext.newsStale,
    });

    if (userSub) {
      writeDiscoverCache(userSub, portfolioFingerprint, snapshot);
    }

    return snapshot;
  });

  inFlightBuilds.set(requestKey, buildPromise);

  try {
    return await buildPromise;
  } finally {
    inFlightBuilds.delete(requestKey);
  }
}

export async function ensureDiscoverSnapshot(
  request: DiscoverBuildRequest,
): Promise<DiscoverSnapshot> {
  const requestKey = buildRequestKey(request);
  if (requestKey === lastRequestKey && storeState.snapshot && !storeState.isLoading) {
    return storeState.snapshot;
  }

  lastRequestKey = requestKey;
  setStoreState({ ...storeState, isLoading: true, error: null });

  try {
    const snapshot = await getDiscoverSnapshot(request);
    setStoreState({ snapshot, isLoading: false, error: null });
    return snapshot;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Discover snapshot unavailable.";
    setStoreState({ snapshot: storeState.snapshot, isLoading: false, error: message });
    throw error;
  }
}

export function useDiscoverSnapshot(input: {
  userSub: string | null;
  holdings: StoredPortfolioHolding[];
  goal: GoalSettings | null;
  enabled?: boolean;
}) {
  const request = useMemo(
    () => ({
      userSub: input.userSub,
      holdings: input.holdings,
      goal: input.goal,
    }),
    [input.goal, input.holdings, input.userSub],
  );

  const state = useSyncExternalStore(subscribe, getSnapshotState, getSnapshotState);

  useEffect(() => {
    if (!input.enabled || !input.userSub || input.holdings.length === 0) {
      return;
    }

    void ensureDiscoverSnapshot(request);
  }, [input.enabled, input.holdings.length, input.userSub, request]);

  const syncSnapshot = useMemo(
    () => getDiscoverSnapshotSync(request),
    [request],
  );

  return {
    snapshot: state.snapshot ?? syncSnapshot,
    isLoading: state.isLoading,
    error: state.error,
    reload: () => ensureDiscoverSnapshot(request),
  };
}

/** Test-only helpers */
export function __resetDiscoverSnapshotStoreForTests() {
  memoryCache.clear();
  inFlightBuilds.clear();
  lastRequestKey = "";
  storeState = { snapshot: null, isLoading: false, error: null };
  emitChange();
}

export function __getDiscoverInFlightCountForTests(): number {
  return inFlightBuilds.size;
}
