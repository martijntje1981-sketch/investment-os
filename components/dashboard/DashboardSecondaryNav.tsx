import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BadgeEuro,
  BookOpen,
  CalendarDays,
  ChevronRight,
  Compass,
  History,
  ListChecks,
  Newspaper,
  ScanLine,
  Sparkles,
  Target,
  Waves,
} from "lucide-react";

import { appDashboardDarkMetaClass, appHeroMetricLabelClass } from "@/components/layout/appSurface";
import {
  ANALYSIS_PATH,
  GOALS_PATH,
  MARKET_PULSE_PATH,
  NEWS_PATH,
  ON_TRACK_HUB_PATH,
  PERSPECTIVES_PATH,
  PORTFOLIO_HISTORY_PATH,
  REVIEW_PATH,
  WHAT_HAPPENED_HUB_PATH,
  WHAT_MATTERS_HUB_PATH,
  WHATS_AHEAD_HUB_PATH,
} from "@/lib/navigation/appRoutes";
import { DASHBOARD_DEEP_LINKS } from "@/lib/navigation/deepLinks";

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
    label: "Core depth",
    items: [
      {
        href: ANALYSIS_PATH,
        title: "Analysis",
        explanation: "Allocation, risk & portfolio structure",
        icon: ScanLine,
      },
      {
        href: NEWS_PATH,
        title: "News",
        explanation: "All portfolio and market news",
        icon: Newspaper,
      },
      {
        href: GOALS_PATH,
        title: "Goals",
        explanation: "Progress & projections",
        icon: Target,
      },
      {
        href: PORTFOLIO_HISTORY_PATH,
        title: "History",
        explanation: "Performance & changes",
        icon: History,
      },
      {
        href: REVIEW_PATH,
        title: "Reports",
        explanation: "Weekly and monthly reviews",
        icon: CalendarDays,
      },
    ],
  },
  {
    label: "Intelligence",
    items: [
      {
        href: WHAT_HAPPENED_HUB_PATH,
        title: "What happened?",
        explanation: "Changes since last look",
        icon: Activity,
      },
      {
        href: WHAT_MATTERS_HUB_PATH,
        title: "What matters?",
        explanation: "What deserves attention",
        icon: Sparkles,
      },
      {
        href: ON_TRACK_HUB_PATH,
        title: "On track?",
        explanation: "Goal and plan",
        icon: ListChecks,
      },
      {
        href: WHATS_AHEAD_HUB_PATH,
        title: "What’s ahead?",
        explanation: "Outlook & scenarios",
        icon: Compass,
      },
    ],
  },
  {
    label: "More insight",
    items: [
      {
        href: DASHBOARD_DEEP_LINKS.scorecard,
        title: "Scorecard",
        explanation: "Daily, weekly & monthly pulse",
        icon: Waves,
      },
      {
        href: PERSPECTIVES_PATH,
        title: "Perspectives",
        explanation: "External views",
        icon: BookOpen,
      },
      {
        href: DASHBOARD_DEEP_LINKS.cashIntelligence,
        title: "Cash intelligence",
        explanation: "Cash and allocation",
        icon: BadgeEuro,
      },
      {
        href: MARKET_PULSE_PATH,
        title: "Market Pulse",
        explanation: "Markets around your holdings",
        icon: Activity,
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
        className="flex min-h-[52px] items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-2.5 py-2 transition hover:border-white/18 hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
      >
        <Icon className="h-4 w-4 shrink-0 text-white/50" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-semibold leading-tight text-white">
            {item.title}
          </span>
          <span className={`mt-0.5 block text-[12px] leading-snug ${appDashboardDarkMetaClass}`}>
            {item.explanation}
          </span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-white/30" aria-hidden />
      </Link>
    </li>
  );
}

export function DashboardSecondaryNav() {
  return (
    <nav
      id="explore-tobailey"
      aria-label="Explore Tobailey"
      className="min-w-0"
      data-testid="dashboard-secondary-nav"
      data-zone="explore-tobailey"
    >
      <p className={appHeroMetricLabelClass}>Explore Tobailey</p>
      <p className={`mt-1 max-w-[calc(100%-3.25rem)] sm:max-w-none ${appDashboardDarkMetaClass}`}>
        Deeper analysis, evidence, history and tools when you want them.
      </p>

      <div className="mt-3 space-y-4">
        {EXPLORE_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/40">
              {group.label}
            </p>
            <ul className="grid grid-cols-2 gap-1.5 lg:grid-cols-3">
              {group.items.map((item) => (
                <ExploreTile key={item.href} item={item} />
              ))}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}
