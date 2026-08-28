import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import {
  appDashboardLightCardClass,
  appSectionBodyClass,
  appSectionLabelClass,
  appSectionMetaClass,
  appTextLinkClass,
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

export function DashboardPersonalIntelligence({
  view,
}: {
  view: DashboardPersonalIntelligenceView;
}) {
  const quiet = view.kind === "quiet";

  return (
    <section
      className={`${appDashboardLightCardClass} min-w-0 overflow-x-clip`}
      data-testid="dashboard-personal-intelligence"
      data-kind={view.kind}
      aria-labelledby="personal-intelligence-heading"
    >
      <div className="px-4 py-4 sm:px-5">
        <p className={appSectionLabelClass} id="personal-intelligence-heading">
          Personal intelligence
        </p>
        {view.kind === "change" && view.windowLabel ? (
          <p className={`mt-0.5 ${appSectionMetaClass}`}>{view.windowLabel}</p>
        ) : null}
        {view.kind === "looking_ahead" && view.modeledDisclaimer ? (
          <p className={`mt-0.5 ${appSectionMetaClass}`}>
            {view.modeledDisclaimer}
          </p>
        ) : (
          <p className={`mt-0.5 ${appSectionMetaClass}`}>
            Only what adds to today’s holding moves
          </p>
        )}

        <p className="mt-3 text-[1.05rem] font-semibold leading-snug text-slate-950">
          {view.title}
        </p>
        {view.support ? (
          <p className={`mt-1.5 ${quiet ? appSectionBodyClass : appSectionMetaClass}`}>
            {view.support}
          </p>
        ) : null}

        {view.kind === "looking_ahead" && view.eventLabel ? (
          <p className={`mt-2 ${appSectionMetaClass}`}>
            Next relevant event · {view.eventLabel}
          </p>
        ) : null}

        {view.kind === "quiet" ? (
          <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1">
            {HUB_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={`inline-flex min-h-11 items-center ${appTextLinkClass}`}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <Link
            href={view.href}
            className={`${appTextLinkClass} mt-3 inline-flex min-h-11 items-center gap-1`}
          >
            {view.hrefLabel}
            <ArrowUpRight className="h-4 w-4" aria-hidden />
          </Link>
        )}
      </div>
    </section>
  );
}
