import { describe, expect, it } from "vitest";

import {
  filterExploreLinksForEventsAvailability,
  shouldIncludeUpcomingEventsNavLink,
  shouldRenderDashboardUpcomingEventsWidget,
  shouldShowUpcomingEventsSurfaces,
} from "@/lib/services/events/availability";

describe("upcoming events availability gate", () => {
  it("hides dashboard widget only for configuration_missing", () => {
    expect(shouldRenderDashboardUpcomingEventsWidget("configuration_missing")).toBe(
      false,
    );
    expect(shouldRenderDashboardUpcomingEventsWidget("loading")).toBe(true);
    expect(shouldRenderDashboardUpcomingEventsWidget("empty")).toBe(true);
    expect(shouldRenderDashboardUpcomingEventsWidget("provider_unavailable")).toBe(
      true,
    );
    expect(shouldRenderDashboardUpcomingEventsWidget("live")).toBe(true);
  });

  it("hides Explore nav while pending or configuration_missing", () => {
    expect(shouldIncludeUpcomingEventsNavLink("pending")).toBe(false);
    expect(shouldIncludeUpcomingEventsNavLink(null)).toBe(false);
    expect(shouldIncludeUpcomingEventsNavLink("configuration_missing")).toBe(false);
    expect(shouldIncludeUpcomingEventsNavLink("provider_unavailable")).toBe(true);
    expect(shouldIncludeUpcomingEventsNavLink("empty")).toBe(true);
    expect(shouldIncludeUpcomingEventsNavLink("live")).toBe(true);
  });

  it("filters /events out of Explore links when gated", () => {
    const links = [
      { href: "/news", label: "News" },
      { href: "/events", label: "Upcoming Events" },
      { href: "/discover", label: "Discover" },
    ];

    expect(
      filterExploreLinksForEventsAvailability(links, "configuration_missing").map(
        (link) => link.href,
      ),
    ).toEqual(["/news", "/discover"]);

    expect(
      filterExploreLinksForEventsAvailability(links, "live").map((link) => link.href),
    ).toEqual(["/news", "/events", "/discover"]);
  });

  it("treats configuration_missing as the only surface-off state", () => {
    expect(shouldShowUpcomingEventsSurfaces("configuration_missing")).toBe(false);
    expect(shouldShowUpcomingEventsSurfaces("empty")).toBe(true);
    expect(shouldShowUpcomingEventsSurfaces(undefined)).toBe(true);
  });
});
