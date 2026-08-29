"use client";

import { useEffect, useState } from "react";

import { DashboardUpcomingEventsCard } from "@/components/events/DashboardUpcomingEventsCard";
import { usePortfolioDividends } from "@/lib/client/usePortfolioDividends";
import { useUserPortfolio } from "@/lib/client/useUserPortfolio";
import { shouldRenderDashboardUpcomingEventsWidget } from "@/lib/services/events/availability";
import { selectDashboardWeekEvents } from "@/lib/services/events";
import type { CalendarEvent } from "@/lib/services/events/types";

export function DashboardUpcomingEventsWidget() {
  const { holdings, portfolioReady, userSub } = useUserPortfolio();
  const { quotes: dividendQuotes } = usePortfolioDividends(
    holdings,
    userSub,
    holdings.length > 0,
  );
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [state, setState] = useState<
    | "live"
    | "empty"
    | "provider_unavailable"
    | "configuration_missing"
    | "loading"
  >("loading");

  useEffect(() => {
    if (!portfolioReady) return;
    let cancelled = false;

    async function load() {
      setState("loading");
      try {
        const response = await fetch("/api/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            holdings,
            dividendQuotes: dividendQuotes ?? [],
          }),
        });
        const data = (await response.json()) as {
          success?: boolean;
          events?: CalendarEvent[];
          state?:
            | "live"
            | "empty"
            | "provider_unavailable"
            | "configuration_missing";
        };
        if (!response.ok || !data.success) {
          throw new Error("Failed");
        }
        if (cancelled) return;
        const weekEvents = selectDashboardWeekEvents(data.events ?? [], 5);
        setEvents(weekEvents);
        setState(
          weekEvents.length > 0
            ? "live"
            : data.state === "configuration_missing"
              ? "configuration_missing"
              : data.state === "provider_unavailable"
                ? "provider_unavailable"
                : "empty",
        );
      } catch {
        if (!cancelled) {
          setEvents([]);
          setState("provider_unavailable");
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [dividendQuotes, holdings, portfolioReady]);

  if (!portfolioReady) return null;
  if (!shouldRenderDashboardUpcomingEventsWidget(state)) return null;

  return <DashboardUpcomingEventsCard events={events} state={state} />;
}
