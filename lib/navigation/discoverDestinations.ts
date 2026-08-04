/**
 * Shared Discover destinations for desktop header, mobile More menu,
 * and profile menu grouping. One href per page — no duplicates.
 */

import type { LucideIcon } from "lucide-react";
import {
  Compass,
  History,
  ListChecks,
  Newspaper,
  Sparkles,
  Waves,
} from "lucide-react";

import { PORTFOLIO_HISTORY_PATH } from "@/lib/navigation/appRoutes";

export const NEWS_PATH = "/news";
export const NEWS_MARKETS_TODAY_HREF = "/news#markets-today";
export const MARKET_PULSE_PATH = "/market-pulse";
export const PERSPECTIVES_PATH = "/perspectives";
export const SUPPORTED_INSTRUMENTS_PATH = "/supported-instruments";
export const DISCOVER_HUB_PATH = "/discover";

export type DiscoverDestination = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
};

/** High-value secondary pages — shown in Discover / More. */
export const DISCOVER_DESTINATIONS: readonly DiscoverDestination[] = [
  {
    href: NEWS_MARKETS_TODAY_HREF,
    label: "Markets Today",
    description: "Global market briefing",
    icon: Newspaper,
  },
  {
    href: MARKET_PULSE_PATH,
    label: "Market Pulse",
    description: "Live markets linked to your portfolio",
    icon: Waves,
  },
  {
    href: PERSPECTIVES_PATH,
    label: "Perspectives",
    description: "Curated investor viewpoints",
    icon: Sparkles,
  },
  {
    href: PORTFOLIO_HISTORY_PATH,
    label: "Portfolio History",
    description: "Contributions, withdrawals and exports",
    icon: History,
  },
  {
    href: SUPPORTED_INSTRUMENTS_PATH,
    label: "Supported Instruments",
    description: "Check what Tobailey supports",
    icon: ListChecks,
  },
  {
    href: DISCOVER_HUB_PATH,
    label: "Discover",
    description: "Ideas tailored to your portfolio",
    icon: Compass,
  },
] as const;

/** Paths that belong under the mobile More tab (active-state matching). */
export const MORE_NAV_PATH_PREFIXES: readonly string[] = [
  PORTFOLIO_HISTORY_PATH,
  MARKET_PULSE_PATH,
  PERSPECTIVES_PATH,
  SUPPORTED_INSTRUMENTS_PATH,
  DISCOVER_HUB_PATH,
  "/goals",
  "/upload",
  "/settings",
  "/portfolio-health",
  "/events",
  "/faq",
  "/pricing",
  "/explore",
];

export function isDiscoverHrefActive(
  pathname: string,
  href: string,
): boolean {
  const pathOnly = href.split("#")[0] ?? href;
  if (pathOnly === NEWS_PATH && href.includes("#markets-today")) {
    return pathname === NEWS_PATH || pathname.startsWith(`${NEWS_PATH}/`);
  }
  return pathname === pathOnly || pathname.startsWith(`${pathOnly}/`);
}

export function isMoreNavPathActive(pathname: string | null | undefined): boolean {
  const path = pathname ?? "";
  if (!path) return false;
  // News stays a primary bottom-nav destination — not "More".
  if (path === NEWS_PATH || path.startsWith(`${NEWS_PATH}/`)) {
    return false;
  }
  return MORE_NAV_PATH_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}
