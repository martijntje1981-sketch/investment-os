"use client";

import { useCallback, useEffect, useState } from "react";

import type { OfficialRatesSnapshot } from "@/lib/services/officialRates";

type OfficialRatesApiResponse = {
  success: boolean;
  snapshot?: OfficialRatesSnapshot;
  error?: string;
};

export function useOfficialRates(enabled = true) {
  const [snapshot, setSnapshot] = useState<OfficialRatesSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!enabled) {
      setSnapshot(null);
      setError(null);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/official-rates", {
        method: "GET",
      });
      const payload = (await response.json()) as OfficialRatesApiResponse;
      if (!payload.success || !payload.snapshot) {
        throw new Error(payload.error ?? "Official rates unavailable");
      }
      setSnapshot(payload.snapshot);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Official rates unavailable");
    } finally {
      setIsLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { snapshot, isLoading, error, reload };
}
