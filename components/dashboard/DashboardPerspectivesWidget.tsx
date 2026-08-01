"use client";

import { useEffect, useState } from "react";

import { DashboardPerspectivesCard } from "@/components/perspectives/DashboardPerspectivesCard";
import { selectDashboardPerspectives } from "@/lib/services/perspectives/groupPerspectives";
import type { PerspectiveVideo } from "@/lib/services/perspectives/types";

export function DashboardPerspectivesWidget() {
  const [videos, setVideos] = useState<PerspectiveVideo[]>([]);
  const [state, setState] = useState<
    "live" | "empty" | "provider_unavailable" | "loading"
  >("loading");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState("loading");
      try {
        const response = await fetch("/api/perspectives");
        const data = (await response.json()) as {
          success?: boolean;
          videos?: PerspectiveVideo[];
          state?: "live" | "empty" | "provider_unavailable";
        };
        if (!response.ok || data.success === false) {
          throw new Error("Failed");
        }
        if (cancelled) return;
        const selected = selectDashboardPerspectives(data.videos ?? [], 2);
        setVideos(selected);
        setState(
          selected.length > 0
            ? "live"
            : data.state === "provider_unavailable"
              ? "provider_unavailable"
              : "empty",
        );
      } catch {
        if (!cancelled) {
          setVideos([]);
          setState("provider_unavailable");
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return <DashboardPerspectivesCard videos={videos} state={state} />;
}
