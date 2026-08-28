import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import {
  appDarkCardClass,
  appDashboardDarkBodyClass,
  appDashboardDarkMetaClass,
  appHeroMetricLabelClass,
} from "@/components/layout/appSurface";
import type { DashboardPersonalIntelligenceView } from "@/lib/client/dashboardPersonalIntelligence";
import {
  ON_TRACK_HUB_PATH,
  WHAT_HAPPENED_HUB_PATH,
  WHAT_MATTERS_HUB_PATH,
  WHATS_AHEAD_HUB_PATH,
} from "@/lib/navigation/appRoutes";

const HUB_LINKS = [
  { href: WHAT_HAPPENED_HUB_PATH, label: "What happened" },
  { href: WHAT_MATTERS_HUB_PATH, label: "What matters" },
  { href: ON_TRACK_HUB_PATH, label: "On track" },
  { href: WHATS_AHEAD_HUB_PATH, label: "What’s ahead" },
] as const;

const actionClass =
  "inline-flex min-h-11 items-center gap-1 text-[14px] font-semibold text-brand underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40";

export function DashboardPersonalIntelligence({
  view,
}: {
  view: DashboardPersonalIntelligenceView;
}) {
  const quiet = view.kind === "quiet";

  return (
    <section
      className={`${appDarkCardClass} min-w-0 overflow-x-clip`}
      data-testid="dashboard-personal-intelligence"
      data-kind={view.kind}
      aria-labelledby="personal-intelligence-heading"
    >
      <div className="px-4 py-4 sm:px-5">
        <p className={appHeroMetricLabelClass} id="personal-intelligence-heading">
          Personal intelligence
        </p>
        {view.kind === "change" && view.windowLabel ? (
          <p className={`mt-0.5 ${appDashboardDarkMetaClass}`}>{view.windowLabel}</p>
        ) : null}
        {view.kind === "looking_ahead" && view.modeledDisclaimer ? (
          <p className={`mt-0.5 ${appDashboardDarkMetaClass}`}>
            {view.modeledDisclaimer}
          </p>
        ) : (
          <p className={`mt-0.5 ${appDashboardDarkMetaClass}`}>
            Only what adds to today’s holding moves
          </p>
        )}

        <p className="mt-3 text-[1.125rem] font-semibold leading-snug tracking-[-0.02em] text-white sm:text-[1.25rem]">
          {view.title}
        </p>
        {view.support ? (
          <p
            className={`mt-1.5 ${quiet ? appDashboardDarkBodyClass : appDashboardDarkMetaClass}`}
          >
            {view.support}
          </p>
        ) : null}

        {view.kind === "looking_ahead" && view.eventLabel ? (
          <p className={`mt-2 ${appDashboardDarkMetaClass}`}>
            Next relevant event · {view.eventLabel}
          </p>
        ) : null}

        {view.kind === "quiet" ? (
          <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1">
            {HUB_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className={actionClass}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <Link href={view.href} className={`${actionClass} mt-3`}>
            {view.hrefLabel}
            <ArrowUpRight className="h-4 w-4" aria-hidden />
          </Link>
        )}
      </div>
    </section>
  );
}
