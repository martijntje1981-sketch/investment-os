/**
 * Shared public Explore destinations for guests and marketing discovery.
 */

export const PUBLIC_EXPLORE_PATH = "/explore";

export const PUBLIC_EXPLORE_DESTINATIONS = [
  {
    href: "/perspectives",
    title: "Perspectives",
    description:
      "Curated investor and market video perspectives — browse general market intelligence without signing in.",
    cta: "Open Perspectives",
  },
  {
    href: "/market-pulse",
    title: "Market Pulse",
    description:
      "Track commodities, crypto and broad market moves with live charts and context.",
    cta: "Open Market Pulse",
  },
  {
    href: "/news",
    title: "News",
    description:
      "General market news and Markets Today — add holdings later to prioritise what matters to you.",
    cta: "Open News",
  },
  {
    href: "/supported-instruments",
    title: "Supported Instruments",
    description:
      "See which stocks, ETFs and crypto Tobailey can price and track today.",
    cta: "View instruments",
  },
] as const;
