"use client";

import { useEffect, useState } from "react";

import { shouldIncludeUpcomingEventsNavLink } from "@/lib/services/events/availability";
import type { EventsDataState } from "@/lib/types/newsContent";

/**
 * Resolves whether Explore should list Upcoming Events.
 * Hidden while the check is pending or the API reports configuration_missing.
 */
export function useUpcomingEventsNavVisible(): boolean {
  const [state, setState] = useState<EventsDataState | "pending">("pending");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/events");
        const data = (await response.json()) as {
          success?: boolean;
          state?: EventsDataState;
        };
        if (cancelled) return;
        if (!response.ok || data.success === false || !data.state) {
          // Network/API failure: keep the entry so /events can show provider error UI.
          setState("provider_unavailable");
          return;
        }
        setState(data.state);
      } catch {
        if (!cancelled) setState("provider_unavailable");
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return shouldIncludeUpcomingEventsNavLink(state);
}
