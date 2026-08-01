import type { EventsDataState } from "@/lib/types/newsContent";

/**
 * Temporary product gate: hide Discover surfaces for Upcoming Events while the
 * EODHD economic-events feed is not included on the current plan.
 * Direct `/events` remains available and shows the configuration message.
 */
export function shouldShowUpcomingEventsSurfaces(
  state: EventsDataState | null | undefined,
): boolean {
  return state !== "configuration_missing";
}

/** Dashboard widget: hide only for configuration_missing; keep loading/empty/error. */
export function shouldRenderDashboardUpcomingEventsWidget(
  state: EventsDataState | "loading",
): boolean {
  return state !== "configuration_missing";
}

/**
 * Explore nav: omit `/events` while pending or configuration_missing.
 * Pending hides the link until we know the feed is usable (avoids a flash).
 */
export function shouldIncludeUpcomingEventsNavLink(
  state: EventsDataState | "pending" | null | undefined,
): boolean {
  if (state == null || state === "pending") return false;
  return state !== "configuration_missing";
}

export function filterExploreLinksForEventsAvailability<
  T extends { href: string },
>(links: T[], state: EventsDataState | "pending" | null | undefined): T[] {
  if (shouldIncludeUpcomingEventsNavLink(state)) return links;
  return links.filter((link) => link.href !== "/events");
}
