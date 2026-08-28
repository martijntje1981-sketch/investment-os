import type { ReactNode } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BadgeEuro,
  CalendarDays,
  ChevronRight,
  Compass,
  FlaskConical,
  HelpCircle,
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
import { ANALYSIS_EXPLORE_DESTINATIONS } from "@/lib/services/analysisGlance";

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
        href: ANALYSIS_EXPLORE_DESTINATIONS.allocation,
        title: "Allocation",
        explanation: "Valued holdings and weights",
        icon: Layers3,
      },
      {
        href: ANALYSIS_EXPLORE_DESTINATIONS.exposure,
        title: "Exposure",
        explanation: "How the mix is classified",
        icon: PieChart,
      },
      {
        href: ANALYSIS_EXPLORE_DESTINATIONS.concentration,
        title: "Concentration",
        explanation: "Largest positions and spread",
        icon: ScanLine,
      },
      {
        href: ANALYSIS_EXPLORE_DESTINATIONS.xray,
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
        href: ANALYSIS_EXPLORE_DESTINATIONS.performance,
        title: "Performance",
        explanation: "Return and contribution",
        icon: Activity,
      },
      {
        href: ANALYSIS_EXPLORE_DESTINATIONS.attribution,
        title: "Performance attribution",
        explanation: "What moved the result",
        icon: PieChart,
      },
      {
        href: ANALYSIS_EXPLORE_DESTINATIONS.history,
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
        href: ANALYSIS_EXPLORE_DESTINATIONS.crypto,
        title: "Crypto intelligence",
        explanation: "Classified crypto sleeve",
        icon: Sparkles,
      },
      {
        href: ANALYSIS_EXPLORE_DESTINATIONS.bonds,
        title: "Bonds & Rates",
        explanation: "Fixed income context",
        icon: Landmark,
      },
      {
        href: ANALYSIS_EXPLORE_DESTINATIONS.cash,
        title: "Cash intelligence",
        explanation: "Cash and allocation",
        icon: BadgeEuro,
      },
      {
        href: ANALYSIS_EXPLORE_DESTINATIONS.dividends,
        title: "Dividend intelligence",
        explanation: "Income policy and estimates",
        icon: BadgeEuro,
      },
      {
        href: ANALYSIS_EXPLORE_DESTINATIONS.consensus,
        title: "Market consensus",
        explanation: "Analyst context when available",
        icon: Sparkles,
      },
    ],
  },
  {
    label: "Planning & risk",
    items: [
      {
        href: ANALYSIS_EXPLORE_DESTINATIONS.scenarios,
        title: "Scenarios",
        explanation: "Modeled stress tests",
        icon: Compass,
      },
      {
        href: ANALYSIS_EXPLORE_DESTINATIONS.scorecard,
        title: "Resilience / Scorecard",
        explanation: "Daily, weekly and monthly pulse",
        icon: Waves,
      },
      {
        href: ANALYSIS_EXPLORE_DESTINATIONS.goals,
        title: "Goals",
        explanation: "Progress and plan",
        icon: Target,
      },
      {
        href: ANALYSIS_EXPLORE_DESTINATIONS.whatIf,
        title: "What-if",
        explanation: "Goal sensitivity",
        icon: FlaskConical,
      },
    ],
  },
  {
    label: "Evidence",
    items: [
      {
        href: ANALYSIS_EXPLORE_DESTINATIONS.whatHappened,
        title: "What happened?",
        explanation: "Changes since last look",
        icon: Activity,
      },
      {
        href: ANALYSIS_EXPLORE_DESTINATIONS.whatMatters,
        title: "What matters?",
        explanation: "What deserves attention",
        icon: Sparkles,
      },
      {
        href: ANALYSIS_EXPLORE_DESTINATIONS.onTrack,
        title: "On track?",
        explanation: "Goal and plan",
        icon: ListChecks,
      },
      {
        href: ANALYSIS_EXPLORE_DESTINATIONS.whatsAhead,
        title: "What’s ahead?",
        explanation: "Outlook and scenarios",
        icon: Compass,
      },
      {
        href: ANALYSIS_EXPLORE_DESTINATIONS.reports,
        title: "Reports",
        explanation: "Weekly and monthly reviews",
        icon: CalendarDays,
      },
      {
        href: ANALYSIS_EXPLORE_DESTINATIONS.methodology,
        title: "Methodology",
        explanation: "Data limitations and how it works",
        icon: HelpCircle,
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
        Deeper models and evidence, one destination at a time.
      </p>

      <div className="mt-3 space-y-4">
        {EXPLORE_GROUPS.map((group) => (
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
      {tools ? <div className="mt-4">{tools}</div> : null}
    </nav>
  );
}
