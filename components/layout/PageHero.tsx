import type { ReactNode } from "react";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function PageHero({
  title,
  subtitle,
  actions,
  stats,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  stats?: ReactNode;
}) {
  const hasAside = Boolean(actions || stats);

  return (
    <section
      aria-labelledby="app-page-hero-title"
      className={cn(
        "min-w-0 rounded-[20px] border border-slate-800 bg-slate-950 text-white",
        "px-3.5 py-4 sm:rounded-[24px] sm:px-6 sm:py-6",
        "lg:min-h-[168px] lg:px-6 lg:py-6",
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
          className="text-xl font-black tracking-[-0.03em] sm:text-2xl lg:text-3xl"
        >
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400 sm:text-base">
            {subtitle}
          </p>
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
