/**
 * Product information architecture — one mental model for More, Explore, and profile.
 * Routes stay unchanged; grouping and labels create cohesion.
 */

import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BookOpen,
  CircleHelp,
  Compass,
  FileUp,
  History,
  ListChecks,
  Newspaper,
  Settings,
  Sparkles,
  Target,
  Waves,
} from "lucide-react";

import {
  DISCOVER_HUB_PATH,
  GOALS_PATH,
  HELP_CENTRE_PATH,
  MARKET_PULSE_PATH,
  PERSPECTIVES_PATH,
  PORTFOLIO_HEALTH_PATH,
  PORTFOLIO_HISTORY_PATH,
  REVIEW_PATH,
  SETTINGS_PATH,
  SUPPORTED_INSTRUMENTS_PATH,
  UPLOAD_PATH,
} from "@/lib/navigation/appRoutes";
import { NEWS_MARKETS_TODAY_HREF } from "@/lib/navigation/discoverDestinations";
import {
  ON_TRACK_HUB_PATH,
  WHAT_HAPPENED_HUB_PATH,
  WHAT_MATTERS_HUB_PATH,
  WHATS_AHEAD_HUB_PATH,
} from "@/lib/navigation/appRoutes";

export type ArchitectureLink = {
  href: string;
  label: string;
  description?: string;
  icon: LucideIcon;
};

export type ArchitectureGroup = {
  id: string;
  title: string;
  links: readonly ArchitectureLink[];
};

/**
 * Mobile More sheet groups.
 * Primary destinations (Dashboard, Portfolio, News, Analysis) stay in the bar.
 */
export const APP_ARCHITECTURE_GROUPS: readonly ArchitectureGroup[] = [
  {
    id: "today",
    title: "Today",
    links: [
      {
        href: REVIEW_PATH,
        label: "Your Review",
        description: "What happened today, this week and this month",
        icon: BookOpen,
      },
      {
        href: NEWS_MARKETS_TODAY_HREF,
        label: "Markets Today",
        description: "Global market briefing",
        icon: Newspaper,
      },
    ],
  },
  {
    id: "my-portfolio",
    title: "My portfolio",
    links: [
      {
        href: PORTFOLIO_HISTORY_PATH,
        label: "Portfolio History",
        description: "How your portfolio developed over time",
        icon: History,
      },
      {
        href: GOALS_PATH,
        label: "Goals",
        description: "Am I on track?",
        icon: Target,
      },
      {
        href: UPLOAD_PATH,
        label: "Import holdings",
        description: "Add holdings from a file",
        icon: FileUp,
      },
    ],
  },
  {
    id: "understand",
    title: "Understand",
    links: [
      {
        href: WHAT_HAPPENED_HUB_PATH,
        label: "What happened?",
        description: "Performance and what moved your portfolio",
        icon: History,
      },
      {
        href: WHAT_MATTERS_HUB_PATH,
        label: "What matters now?",
        description: "Attention and portfolio-linked intelligence",
        icon: Sparkles,
      },
      {
        href: ON_TRACK_HUB_PATH,
        label: "Am I on track?",
        description: "Goals, progress and Reality Check",
        icon: Target,
      },
      {
        href: WHATS_AHEAD_HUB_PATH,
        label: "What’s ahead?",
        description: "Scenarios, resilience and consensus",
        icon: ListChecks,
      },
      {
        href: PORTFOLIO_HEALTH_PATH,
        label: "Portfolio Scorecard",
        description: "Strengths, structure and resilience",
        icon: Activity,
      },
    ],
  },
  {
    id: "markets",
    title: "Markets",
    links: [
      {
        href: MARKET_PULSE_PATH,
        label: "Market Pulse",
        description: "Markets linked to your holdings",
        icon: Waves,
      },
      {
        href: PERSPECTIVES_PATH,
        label: "Perspectives",
        description: "Why today’s news matters",
        icon: Sparkles,
      },
    ],
  },
  {
    id: "resources",
    title: "Resources",
    links: [
      {
        href: DISCOVER_HUB_PATH,
        label: "Ideas",
        description: "Themes tailored to your portfolio",
        icon: Compass,
      },
      {
        href: SUPPORTED_INSTRUMENTS_PATH,
        label: "Supported Instruments",
        description: "What Tobailey can track",
        icon: ListChecks,
      },
      {
        href: HELP_CENTRE_PATH,
        label: "Help Centre",
        description: "Answers, calmly organised",
        icon: CircleHelp,
      },
      {
        href: SETTINGS_PATH,
        label: "Settings",
        description: "Account, reports and preferences",
        icon: Settings,
      },
    ],
  },
] as const;

/** Flat list for tests and uniqueness checks. */
export function flattenArchitectureLinks(): ArchitectureLink[] {
  return APP_ARCHITECTURE_GROUPS.flatMap((group) => [...group.links]);
}

/** Canonical page purpose one-liners for Related strips and copy alignment. */
export const PAGE_PURPOSE = {
  dashboard: "How is my portfolio doing today?",
  portfolio: "What do I own?",
  history: "How did my portfolio develop over time?",
  analysis: "How is my portfolio positioned, and what could change the picture?",
  scorecard: "What are my strengths and weaknesses?",
  goals: "Am I on track?",
  review: "What happened today, this week and this month?",
  news: "What happened in the market today?",
  perspectives: "Why does today’s news matter?",
  marketPulse: "Which markets are shaping my portfolio?",
  ideas: "Where can I learn more?",
} as const;
