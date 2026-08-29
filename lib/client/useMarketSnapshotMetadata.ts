"use client";

import { useEffect, useState } from "react";

import {
  fetchMarketSnapshotMetadata,
  type MarketSnapshotMetadata,
} from "@/lib/client/marketSnapshotSync";

export function useMarketSnapshotMetadata(enabled = true) {
  const [metadata, setMetadata] = useState<MarketSnapshotMetadata | null>(null);

  useEffect(() => {
    if (!enabled) {
      setMetadata(null);
      return;
    }

    let cancelled = false;

    void fetchMarketSnapshotMetadata().then((result) => {
      if (!cancelled) {
        setMetadata(result);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return {
    metadata,
    lastRefreshedAt: metadata?.lastRefreshedAt ?? null,
  };
}
