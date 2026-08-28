import Link from "next/link";

import { appSectionLabelClass, appSectionMetaClass } from "@/components/layout/appSurface";
import {
  ANALYSIS_PATH,
  GOALS_PATH,
  MARKET_PULSE_PATH,
  NEWS_PATH,
  ON_TRACK_HUB_PATH,
  PERSPECTIVES_PATH,
  PORTFOLIO_HEALTH_PATH,
  PORTFOLIO_HISTORY_PATH,
  REVIEW_PATH,
  WHAT_HAPPENED_HUB_PATH,
  WHAT_MATTERS_HUB_PATH,
  WHATS_AHEAD_HUB_PATH,
} from "@/lib/navigation/appRoutes";
import { DASHBOARD_DEEP_LINKS } from "@/lib/navigation/deepLinks";

const PRIMARY_LINKS = [
  { href: ANALYSIS_PATH, label: "Analysis" },
  { href: NEWS_PATH, label: "News" },
  { href: GOALS_PATH, label: "Goals" },
  { href: REVIEW_PATH, label: "Reports" },
  { href: PORTFOLIO_HISTORY_PATH, label: "Portfolio history" },
] as const;

const MORE_LINKS = [
  { href: WHAT_HAPPENED_HUB_PATH, label: "What happened" },
  { href: WHAT_MATTERS_HUB_PATH, label: "What matters" },
  { href: ON_TRACK_HUB_PATH, label: "On track" },
  { href: WHATS_AHEAD_HUB_PATH, label: "What’s ahead" },
  { href: MARKET_PULSE_PATH, label: "Market Pulse" },
  { href: PERSPECTIVES_PATH, label: "Perspectives" },
  { href: PORTFOLIO_HEALTH_PATH, label: "Scorecard" },
  { href: DASHBOARD_DEEP_LINKS.cashIntelligence, label: "Cash" },
] as const;

function LinkRow({
  links,
}: {
  links: readonly { href: string; label: string }[];
}) {
  return (
    <ul className="flex flex-wrap items-center gap-x-3 gap-y-1">
      {links.map((link, index) => (
        <li key={link.href} className="inline-flex items-center gap-3">
          {index > 0 ? (
            <span className="text-slate-300" aria-hidden>
              ·
            </span>
          ) : null}
          <Link
            href={link.href}
            className="inline-flex min-h-[44px] items-center text-[14px] font-semibold text-brand-navy underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
          >
            {link.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function DashboardSecondaryNav() {
  return (
    <nav
      aria-label="More in Tobailey"
      className="min-w-0"
      data-testid="dashboard-secondary-nav"
      data-zone="explore-more"
    >
      <p className={appSectionLabelClass}>More</p>
      <p className={`mt-1 ${appSectionMetaClass}`}>
        Analysis, news, goals and reports stay available here.
      </p>
      <div className="mt-2">
        <LinkRow links={PRIMARY_LINKS} />
      </div>
      <div className="mt-1">
        <LinkRow links={MORE_LINKS} />
      </div>
    </nav>
  );
}
