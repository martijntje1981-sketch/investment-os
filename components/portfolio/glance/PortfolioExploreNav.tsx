"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import {
  appDashboardDarkMetaClass,
  appHeroMetricLabelClass,
} from "@/components/layout/appSurface";
import {
  PORTFOLIO_EXPLORE_GROUPS,
  PORTFOLIO_EXPLORE_MOBILE_COMPACT_TITLES,
  type PortfolioExploreItem,
} from "@/components/portfolio/glance/portfolioExploreCatalog";

function ExploreTile({ item }: { item: PortfolioExploreItem }) {
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

export function PortfolioExploreNav({ tools }: { tools?: ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  const compactItems = useMemo(() => {
    const allItems = PORTFOLIO_EXPLORE_GROUPS.flatMap((group) => [...group.items]);
    return PORTFOLIO_EXPLORE_MOBILE_COMPACT_TITLES.map((title) => {
      const item = allItems.find((row) => row.title === title);
      if (!item) {
        throw new Error(`Missing compact Explore item: ${title}`);
      }
      return item;
    });
  }, []);

  return (
    <nav
      aria-label="Explore Portfolio"
      className="min-w-0"
      data-testid="portfolio-explore"
      data-expanded={expanded ? "true" : "false"}
    >
      <p className={appHeroMetricLabelClass}>Explore</p>
      <p
        className={`mt-1 max-w-[calc(100%-3.25rem)] sm:max-w-none ${appDashboardDarkMetaClass}`}
      >
        History, allocation, reports, and money in & out.
      </p>

      <div
        className={expanded ? "mt-3 hidden" : "mt-3 lg:hidden"}
        data-testid="portfolio-explore-compact"
      >
        <ul className="grid grid-cols-2 gap-1.5">
          {compactItems.map((item) => (
            <ExploreTile key={`compact-${item.title}`} item={item} />
          ))}
        </ul>
      </div>

      <div
        className={expanded ? "mt-3" : "mt-3 hidden lg:block"}
        data-testid="portfolio-explore-full"
      >
        <div className="space-y-4">
          {PORTFOLIO_EXPLORE_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/40">
                {group.label}
              </p>
              <ul className="grid grid-cols-2 gap-1.5 lg:grid-cols-4">
                {group.items.map((item) => (
                  <ExploreTile
                    key={`${group.label}-${item.title}`}
                    item={item}
                  />
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {tools ? <div className="mt-3">{tools}</div> : null}

      <button
        type="button"
        className="mt-3 inline-flex min-h-11 items-center text-[14px] font-medium text-white/70 underline-offset-2 hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 lg:hidden"
        aria-expanded={expanded}
        data-testid="portfolio-explore-toggle"
        onClick={() => setExpanded((value) => !value)}
      >
        {expanded ? "Show fewer" : "Show all"}
      </button>
    </nav>
  );
}
