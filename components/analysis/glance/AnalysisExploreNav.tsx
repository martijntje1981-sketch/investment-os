import type { ReactNode } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BadgeEuro,
  CalendarDays,
  ChevronRight,
  Compass,
  History,
  Landmark,
  Layers3,
  ListChecks,
  PieChart,
  ScanLine,
  Sparkles,
  Target,
  Waves,
} from "lucide-react";

import {
  appDashboardDarkMetaClass,
  appHeroMetricLabelClass,
} from "@/components/layout/appSurface";
import {
  ANALYSIS_PATH,
  GOALS_PATH,
  ON_TRACK_HUB_PATH,
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
    label: "Structure",
    items: [
      {
        href: DASHBOARD_DEEP_LINKS.portfolioAllocation,
        title: "Allocation",
        explanation: "Valued holdings and weights",
        icon: Layers3,
      },
      {
        href: DASHBOARD_DEEP_LINKS.portfolioExposure,
        title: "Exposure",
        explanation: "How the mix is classified",
        icon: PieChart,
      },
      {
        href: `${ANALYSIS_PATH}#portfolio-concentration`,
        title: "Concentration",
        explanation: "Largest positions and spread",
        icon: ScanLine,
      },
      {
        href: DASHBOARD_DEEP_LINKS.portfolioXray,
        title: "Portfolio X-Ray",
        explanation: "Look-through when available",
        icon: ScanLine,
      },
    ],
  },
  {
    label: "Performance",
    items: [
      {
        href: DASHBOARD_DEEP_LINKS.portfolioPerformance,
        title: "Performance",
        explanation: "Return and contribution",
        icon: Activity,
      },
      {
        href: `${ANALYSIS_PATH}#performance-attribution`,
        title: "Performance attribution",
        explanation: "What moved the result",
        icon: PieChart,
      },
      {
        href: PORTFOLIO_HISTORY_PATH,
        title: "Portfolio History",
        explanation: "Timeline and evolution",
        icon: History,
      },
    ],
  },
  {
    label: "Markets & assets",
    items: [
      {
        href: `${ANALYSIS_PATH}#crypto-intelligence`,
        title: "Crypto intelligence",
        explanation: "Classified crypto sleeve",
        icon: Sparkles,
      },
      {
        href: DASHBOARD_DEEP_LINKS.bondsRates,
        title: "Bonds & Rates",
        explanation: "Fixed income context",
        icon: Landmark,
      },
      {
        href: DASHBOARD_DEEP_LINKS.cashIntelligence,
        title: "Cash intelligence",
        explanation: "Cash and allocation",
        icon: BadgeEuro,
      },
      {
        href: DASHBOARD_DEEP_LINKS.dividendIntelligence,
        title: "Dividend intelligence",
        explanation: "Income policy and estimates",
        icon: BadgeEuro,
      },
    ],
  },
  {
    label: "Planning & risk",
    items: [
      {
        href: DASHBOARD_DEEP_LINKS.scenarioStress,
        title: "Scenarios",
        explanation: "Modeled stress tests",
        icon: Compass,
      },
      {
        href: DASHBOARD_DEEP_LINKS.scorecard,
        title: "Resilience / Scorecard",
        explanation: "Daily, weekly and monthly pulse",
        icon: Waves,
      },
      {
        href: GOALS_PATH,
        title: "Goals",
        explanation: "Progress and what-if",
        icon: Target,
      },
    ],
  },
  {
    label: "Evidence",
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
        explanation: "Outlook and scenarios",
        icon: Compass,
      },
      {
        href: REVIEW_PATH,
        title: "Reports",
        explanation: "Weekly and monthly reviews",
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
        className="flex min-h-[52px] items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-2.5 py-2 transition hover:border-white/18 hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
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

export function AnalysisExploreNav({
  tools,
}: {
  tools?: ReactNode;
}) {
  return (
    <nav
      id="explore-analysis"
      aria-label="Explore Analysis"
      className="min-w-0"
      data-testid="analysis-explore"
    >
      <p className={appHeroMetricLabelClass}>Explore Analysis</p>
      <p
        className={`mt-1 max-w-[calc(100%-3.25rem)] sm:max-w-none ${appDashboardDarkMetaClass}`}
      >
        Evidence, models and deeper portfolio analysis when you want it.
      </p>

      <div className="mt-3 space-y-4">
        {EXPLORE_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/40">
              {group.label}
            </p>
            <ul className="grid grid-cols-2 gap-1.5 lg:grid-cols-3">
              {group.items.map((item) => (
                <ExploreTile key={`${group.label}-${item.title}`} item={item} />
              ))}
            </ul>
          </div>
        ))}
      </div>
      {tools ? <div className="mt-4">{tools}</div> : null}
    </nav>
  );
}
