import type { ReactNode } from "react";

import { BackToDashboardLink } from "@/components/layout/BackToDashboardLink";
import {
  appHeroShellClass,
  appPageHeroActionsClass,
  appPageHeroSubtitleClass,
  appPageHeroTitleClass,
} from "@/components/layout/appSurface";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function PageHero({
  title,
  subtitle,
  actions,
  stats,
  visual,
  backToDashboard = false,
  embedded = false,
  variant = "default",
  id,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  stats?: ReactNode;
  /** Optional full-width visual below the title block (e.g. goal trajectory). */
  visual?: ReactNode;
  /** Shows a secondary link back to the dashboard — omit on the dashboard itself. */
  backToDashboard?: boolean;
  /** When true, omits outer shell — for use inside a shared hero container. */
  embedded?: boolean;
  /** Dashboard uses a calmer, roomier hero treatment without changing copy or data. */
  variant?: "default" | "dashboard";
  /** Optional stable deep-link anchor (e.g. Goals progress). */
  id?: string;
}) {
  const actionContent =
    backToDashboard || actions ? (
      <>
        {backToDashboard ? <BackToDashboardLink /> : null}
        {actions}
      </>
    ) : null;
  const hasAside = Boolean(actionContent || stats);
  const isDashboard = variant === "dashboard";

  return (
    <section
      id={id}
      aria-labelledby="app-page-hero-title"
      className={cn(
        id ? "scroll-mt-24" : null,
        "min-w-0 text-slate-950",
        embedded
          ? isDashboard
            ? "px-5 py-7 sm:px-7 sm:py-8 md:px-8 md:py-9"
            : "px-4 py-5 sm:px-6 sm:py-6"
          : cn(
              appHeroShellClass,
              "px-4 py-4 sm:px-5 sm:py-4",
              "lg:px-6 lg:py-[1.125rem]",
            ),
        hasAside
          ? "lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start lg:justify-between lg:gap-x-6"
          : "lg:flex lg:flex-col lg:justify-start",
      )}
    >
      <div
        className={cn(
          "min-w-0",
          hasAside && "lg:col-start-1 lg:row-start-1 lg:self-start",
        )}
      >
        <h1
          id="app-page-hero-title"
          className={appPageHeroTitleClass}
        >
          {title}
        </h1>
        {subtitle ? (
          <p className={appPageHeroSubtitleClass}>{subtitle}</p>
        ) : null}
        {visual ? <div className="mt-5 min-w-0">{visual}</div> : null}
      </div>

      {actionContent ? (
        <div
          className={cn(
            appPageHeroActionsClass,
            "lg:col-start-2 lg:row-start-1 lg:self-start",
          )}
        >
          {actionContent}
        </div>
      ) : null}

      {stats ? (
        <div
          className={cn(
            "mt-4 min-w-0 border-t border-cyan-200/70 pt-4",
            "lg:col-start-2 lg:row-start-1 lg:mt-0 lg:w-full lg:max-w-md lg:border-t-0 lg:pt-0 lg:justify-self-end lg:self-start",
            "[&>div]:lg:grid-cols-2",
            Boolean(actionContent) &&
              "lg:col-span-2 lg:row-start-2 lg:max-w-none lg:border-t lg:border-cyan-200/70 lg:pt-4 lg:justify-self-stretch",
          )}
        >
          {stats}
        </div>
      ) : null}
    </section>
  );
}
