import Link from "next/link";

import {
  appDashboardDarkMetaClass,
  appHeroMetricLabelClass,
} from "@/components/layout/appSurface";
import { PORTFOLIO_HISTORY_PATH } from "@/lib/navigation/appRoutes";
import { canonicalPortfolioActivityEvents } from "@/lib/client/canonicalPortfolioActivity";
import type { PortfolioTimelineEvent } from "@/lib/services/portfolio/timeline/types";

const ACTIVITY_PREVIEW_LIMIT = 5;

function formatActivityDate(value: string): string {
  const parsed = Date.parse(`${value}T12:00:00Z`);
  if (!Number.isFinite(parsed)) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

export function PortfolioActivity({
  events,
  formatEur,
}: {
  events: readonly PortfolioTimelineEvent[];
  formatEur: (value: number) => string;
}) {
  const canonical = canonicalPortfolioActivityEvents(events).slice(
    0,
    ACTIVITY_PREVIEW_LIMIT,
  );

  return (
    <section className="min-w-0" data-testid="portfolio-activity">
      <p className={appHeroMetricLabelClass}>Activity</p>
      <p className={`mt-1 ${appDashboardDarkMetaClass}`}>
        Recent money in and out from your recorded history.
      </p>

      {canonical.length === 0 ? (
        <p className={`mt-3 text-[14px] ${appDashboardDarkMetaClass}`}>
          No recorded deposits or withdrawals yet.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-white/10">
          {canonical.map((event) => (
            <li
              key={event.id}
              className="flex min-w-0 items-baseline justify-between gap-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-[14px] font-semibold text-white">
                  {event.title}
                </p>
                <p className={`text-[12px] ${appDashboardDarkMetaClass}`}>
                  {formatActivityDate(event.date)}
                </p>
              </div>
              {event.amount != null ? (
                <p
                  className={`shrink-0 text-[14px] font-semibold tabular-nums ${
                    event.amount >= 0 ? "text-emerald-300" : "text-rose-300"
                  }`}
                >
                  {event.amount >= 0 ? "+" : "−"}
                  {formatEur(Math.abs(event.amount))}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <Link
        href={PORTFOLIO_HISTORY_PATH}
        className="mt-3 inline-flex min-h-11 items-center text-[14px] font-medium text-white/70 underline-offset-2 hover:text-white hover:underline"
      >
        View Portfolio History →
      </Link>
    </section>
  );
}
