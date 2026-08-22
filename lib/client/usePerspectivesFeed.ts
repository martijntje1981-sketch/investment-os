"use client";

import { useEffect, useMemo, useState } from "react";

import type { PerspectiveVideo } from "@/lib/services/perspectives/types";

type PerspectivesFeedState =
  | "live"
  | "empty"
  | "provider_unavailable"
  | "loading";

type PerspectivesFeedResult = {
  videos: PerspectiveVideo[];
  state: PerspectivesFeedState;
};

type CacheEntry = {
  key: string;
  promise: Promise<PerspectivesFeedResult> | null;
  result: PerspectivesFeedResult | null;
};

const cache: CacheEntry = {
  key: "",
  promise: null,
  result: null,
};

async function fetchPerspectivesFeed(): Promise<PerspectivesFeedResult> {
  const response = await fetch("/api/perspectives");
  const data = (await response.json()) as {
    success?: boolean;
    videos?: PerspectiveVideo[];
    state?: "live" | "empty" | "provider_unavailable";
  };
  if (!response.ok || data.success === false) {
    throw new Error("Failed");
  }
  const videos = data.videos ?? [];
  return {
    videos,
    state:
      videos.length > 0
        ? "live"
        : data.state === "provider_unavailable"
          ? "provider_unavailable"
          : "empty",
  };
}

/**
 * Shared client cache for the existing Perspectives endpoint.
 * Multiple dashboard consumers reuse one in-flight request — no extra polling.
 */
export function usePerspectivesFeed(holdingsKey: string): PerspectivesFeedResult {
  const [result, setResult] = useState<PerspectivesFeedResult>(
    cache.key === holdingsKey && cache.result
      ? cache.result
      : { videos: [], state: "loading" },
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (cache.key === holdingsKey && cache.result) {
        setResult(cache.result);
        return;
      }
      if (cache.key === holdingsKey && cache.promise) {
        try {
          const shared = await cache.promise;
          if (!cancelled) setResult(shared);
        } catch {
          if (!cancelled) {
            setResult({ videos: [], state: "provider_unavailable" });
          }
        }
        return;
      }

      cache.key = holdingsKey;
      cache.promise = fetchPerspectivesFeed()
        .then((next) => {
          cache.result = next;
          cache.promise = null;
          return next;
        })
        .catch((error: unknown) => {
          cache.promise = null;
          cache.result = { videos: [], state: "provider_unavailable" };
          throw error;
        });

      setResult({ videos: [], state: "loading" });
      try {
        const next = await cache.promise;
        if (!cancelled) setResult(next);
      } catch {
        if (!cancelled) {
          setResult({ videos: [], state: "provider_unavailable" });
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [holdingsKey]);

  return useMemo(() => result, [result]);
}
