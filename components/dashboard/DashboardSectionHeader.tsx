import type { ReactNode } from "react";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

/** Shared dashboard section header — matches AI Portfolio Insight typography. */
export function DashboardSectionHeader({
  title,
  subtitle,
  icon,
  iconToneClassName = "bg-violet-50 text-violet-700",
  trailing,
  bordered = true,
  className,
  titleId,
}: {
  title: string;
  subtitle?: ReactNode;
  icon?: ReactNode;
  iconToneClassName?: string;
  trailing?: ReactNode;
  bordered?: boolean;
  className?: string;
  titleId?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-start justify-between gap-4",
        bordered && "border-b border-slate-100",
        "px-4 py-5 md:px-6 md:py-5",
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        {icon ? (
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl",
              iconToneClassName,
            )}
          >
            {icon}
          </div>
        ) : null}
        <div className="min-w-0">
          <h2
            id={titleId}
            className="text-lg font-black tracking-[-0.03em] text-slate-950 md:text-xl"
          >
            {title}
          </h2>
          {subtitle ? (
            <div className="mt-1 text-sm leading-relaxed text-slate-500">
              {subtitle}
            </div>
          ) : null}
        </div>
      </div>
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
    </div>
  );
}
