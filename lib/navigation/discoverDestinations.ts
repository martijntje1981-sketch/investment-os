/**
 * Shared Explore destinations for desktop header, mobile More menu,
 * and profile menu grouping. One href per page — no duplicates.
 *
 * Grouped IA lives in productArchitecture.ts — this flat list remains for
 * compact desktop Explore menus and active-state helpers.
 */

import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Compass,
  History,
  ListChecks,
  Newspaper,
  Sparkles,
  Waves,
} from "lucide-react";

import {
  DISCOVER_HUB_PATH,
  MARKET_PULSE_PATH,
  NEWS_PATH,
  PERSPECTIVES_PATH,
  PORTFOLIO_HISTORY_PATH,
  REVIEW_PATH,
  SUPPORTED_INSTRUMENTS_PATH,
} from "@/lib/navigation/appRoutes";

export {
  DISCOVER_HUB_PATH,
  MARKET_PULSE_PATH,
  NEWS_PATH,
  PERSPECTIVES_PATH,
  SUPPORTED_INSTRUMENTS_PATH,
};

export const NEWS_MARKETS_TODAY_HREF = `${NEWS_PATH}#markets-today`;

export type DiscoverDestination = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
};

/** High-value secondary pages — shown in compact Explore menus. */
export const DISCOVER_DESTINATIONS: readonly DiscoverDestination[] = [
  {
    href: REVIEW_PATH,
    label: "Your Review",
    description: "Today, this week and this month",
    icon: BookOpen,
  },
  {
    href: NEWS_MARKETS_TODAY_HREF,
    label: "Markets Today",
    description: "Global market briefing",
    icon: Newspaper,
  },
  {
    href: MARKET_PULSE_PATH,
    label: "Market Pulse",
    description: "Markets linked to your portfolio",
    icon: Waves,
  },
  {
    href: PERSPECTIVES_PATH,
    label: "Perspectives",
    description: "Why today’s news matters",
    icon: Sparkles,
  },
  {
    href: PORTFOLIO_HISTORY_PATH,
    label: "Portfolio History",
    description: "How your portfolio developed over time",
    icon: History,
  },
  {
    href: SUPPORTED_INSTRUMENTS_PATH,
    label: "Supported Instruments",
    description: "What Tobailey can track",
    icon: ListChecks,
  },
  {
    href: DISCOVER_HUB_PATH,
    label: "Ideas",
    description: "Themes tailored to your portfolio",
    icon: Compass,
  },
] as const;

/** Paths that belong under the mobile More tab (active-state matching). */
export const MORE_NAV_PATH_PREFIXES: readonly string[] = [
  REVIEW_PATH,
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
