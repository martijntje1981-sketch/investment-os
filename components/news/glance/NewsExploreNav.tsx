"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ChevronRight,
  Landmark,
  Newspaper,
  PlayCircle,
  Search,
  Sparkles,
  Waves,
  CalendarDays,
  BriefcaseBusiness,
  Bitcoin,
} from "lucide-react";

import {
  appDashboardDarkMetaClass,
  appHeroMetricLabelClass,
} from "@/components/layout/appSurface";
import { NEWS_EXPLORE_DESTINATIONS } from "@/lib/services/newsGlance";
import { NEWS_EXPLORE_MOBILE_COMPACT_TITLES } from "@/components/news/glance/newsExploreCatalog";

type ExploreItem = {
  href: string;
  title: string;
  explanation: string;
  icon: LucideIcon;
};

type ExploreGroup = {
  label: string;
  items: readonly ExploreItem[];
};

const EXPLORE_GROUPS: readonly ExploreGroup[] = [
  {
    label: "For you",
    items: [
      {
        href: NEWS_EXPLORE_DESTINATIONS.holdings,
        title: "Holdings news",
        explanation: "Direct and contextual holding coverage",
        icon: BriefcaseBusiness,
      },
      {
        href: NEWS_EXPLORE_DESTINATIONS.marketBrief,
        title: "Market brief",
        explanation: "Verified headlines in one brief",
        icon: Newspaper,
      },
      {
        href: NEWS_EXPLORE_DESTINATIONS.marketsToday,
        title: "Markets Today",
        explanation: "Global pulse and regions",
        icon: Waves,
      },
      {
        href: NEWS_EXPLORE_DESTINATIONS.search,
        title: "Search",
        explanation: "Full feed, filters and categories",
        icon: Search,
      },
    ],
  },
  {
    label: "Context",
    items: [
      {
        href: NEWS_EXPLORE_DESTINATIONS.macro,
        title: "Macro",
        explanation: "Rates, policy and geopolitics",
        icon: Landmark,
      },
      {
        href: NEWS_EXPLORE_DESTINATIONS.crypto,
        title: "Crypto",
        explanation: "Crypto region when applicable",
        icon: Bitcoin,
      },
      {
        href: NEWS_EXPLORE_DESTINATIONS.videos,
        title: "Videos",
        explanation: "Trusted market channels",
        icon: PlayCircle,
      },
      {
        href: NEWS_EXPLORE_DESTINATIONS.perspectives,
        title: "Perspectives",
        explanation: "Why today’s news can matter",
        icon: Sparkles,
      },
    ],
  },
  {
    label: "More",
    items: [
      {
        href: NEWS_EXPLORE_DESTINATIONS.marketPulse,
        title: "Market Pulse",
        explanation: "Markets linked to your portfolio",
        icon: Waves,
      },
      {
        href: NEWS_EXPLORE_DESTINATIONS.events,
        title: "Events",
        explanation: "Verified calendar items",
        icon: CalendarDays,
      },
    ],
  },
] as const;

function ExploreTile({ item }: { item: ExploreItem }) {
  const Icon = item.icon;

  return (
    <li>
      <Link
        href={item.href}
        className="flex min-h-[56px] items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-2.5 py-2 transition hover:border-white/18 hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
      >
        <Icon className="h-4 w-4 shrink-0 text-white/50" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-semibold leading-tight text-white">
            {item.title}
          </span>
          <span
            className={`mt-0.5 block text-[12px] leading-snug ${appDashboardDarkMetaClass}`}
          >
            {item.explanation}
          </span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-white/30" aria-hidden />
      </Link>
    </li>
  );
}

function ExploreGroupList({ groups }: { groups: readonly ExploreGroup[] }) {
  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/40">
            {group.label}
          </p>
          <ul className="grid grid-cols-2 gap-1.5 lg:grid-cols-4">
            {group.items.map((item) => (
              <ExploreTile key={`${group.label}-${item.title}`} item={item} />
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function NewsExploreNav() {
  const [expanded, setExpanded] = useState(false);
  const compactItems = useMemo(() => {
    const allItems = EXPLORE_GROUPS.flatMap((group) => [...group.items]);
    return NEWS_EXPLORE_MOBILE_COMPACT_TITLES.map((title) => {
      const item = allItems.find((row) => row.title === title);
      if (!item) {
        throw new Error(`Missing compact Explore item: ${title}`);
      }
      return item;
    });
  }, []);

  return (
    <nav
      id="explore-news"
      aria-label="Explore News"
      className="min-w-0"
      data-testid="news-explore"
      data-expanded={expanded ? "true" : "false"}
    >
      <p className={appHeroMetricLabelClass}>Explore News</p>
      <p
        className={`mt-1 max-w-[calc(100%-3.25rem)] sm:max-w-none ${appDashboardDarkMetaClass}`}
      >
        Full feed, filters and existing news intelligence.
      </p>

      <div
        className={expanded ? "mt-3 hidden" : "mt-3 lg:hidden"}
        data-testid="news-explore-compact"
      >
        <ul className="grid grid-cols-2 gap-1.5">
          {compactItems.map((item) => (
            <ExploreTile key={`compact-${item.title}`} item={item} />
          ))}
        </ul>
      </div>

      <div
        className={expanded ? "mt-3" : "mt-3 hidden lg:block"}
        data-testid="news-explore-full"
      >
        <ExploreGroupList groups={EXPLORE_GROUPS} />
      </div>

      <button
        type="button"
        className="mt-3 inline-flex min-h-11 items-center text-[14px] font-medium text-white/70 underline-offset-2 hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 lg:hidden"
        aria-expanded={expanded}
        data-testid="news-explore-toggle"
        onClick={() => setExpanded((value) => !value)}
      >
        {expanded ? "Show fewer" : "Show all"}
      </button>
    </nav>
  );
}
