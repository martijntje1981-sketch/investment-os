import type { ReactNode } from "react";

import { appPageTitleClass } from "@/components/layout/appSurface";

/** ~90% of appPageTitleClass (20px → 18px), white, medium — shared hero subtitle. */
const pageHeroSubtitleClass =
  "mt-2.5 max-w-2xl text-[18px] font-medium leading-relaxed tracking-[-0.015em] text-white";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function PageHero({
  title,
  subtitle,
  actions,
  stats,
  embedded = false,
  variant = "default",
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  stats?: ReactNode;
  /** When true, omits outer shell — for use inside a shared hero container. */
  embedded?: boolean;
  /** Dashboard uses a calmer, roomier hero treatment without changing copy or data. */
  variant?: "default" | "dashboard";
}) {
  const hasAside = Boolean(actions || stats);
  const isDashboard = variant === "dashboard";

  return (
    <section
      aria-labelledby="app-page-hero-title"
      className={cn(
        "min-w-0 text-white",
        embedded
          ? isDashboard
            ? "px-5 py-7 sm:px-7 sm:py-8 md:px-8 md:py-9"
            : "px-4 py-5 sm:px-6 sm:py-6"
          : cn(
              "rounded-[24px] border border-slate-800/90 bg-slate-950 shadow-[0_16px_48px_rgba(15,23,42,0.28)]",
              "px-4 py-5 sm:rounded-[28px] sm:px-6 sm:py-6",
              "lg:min-h-[168px] lg:px-6 lg:py-6",
            ),
        hasAside
          ? "lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start lg:gap-x-6"
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
          className={cn(
            appPageTitleClass,
            "text-white",
          )}
        >
          {title}
        </h1>
        {subtitle ? (
          <p className={pageHeroSubtitleClass}>{subtitle}</p>
        ) : null}
      </div>

      {actions ? (
        <div
          className={cn(
            "mt-4 flex min-w-0 flex-wrap gap-2",
            "lg:col-start-2 lg:row-start-1 lg:mt-0 lg:max-w-md lg:justify-end lg:self-start",
          )}
        >
          {actions}
        </div>
      ) : null}

      {stats ? (
        <div
          className={cn(
            "mt-4 min-w-0 border-t border-white/10 pt-4",
            "lg:col-start-2 lg:row-start-1 lg:mt-0 lg:w-full lg:max-w-md lg:border-t-0 lg:pt-0 lg:justify-self-end lg:self-start",
            "[&>div]:lg:grid-cols-2",
            Boolean(actions) &&
              "lg:col-span-2 lg:row-start-2 lg:max-w-none lg:border-t lg:border-white/10 lg:pt-4 lg:justify-self-stretch",
          )}
        >
          {stats}
        </div>
      ) : null}
    </section>
  );
}
