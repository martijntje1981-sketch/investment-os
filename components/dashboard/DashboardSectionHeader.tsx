import {
  appDashboardDarkMutedClass,
  appSectionSubtitleClass,
  appSectionTitleClass,
} from "@/components/layout/appSurface";
import type { ReactNode } from "react";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type DashboardSectionHeaderVariant = "default" | "feature" | "holdings" | "compact";

/** Shared dashboard section header with surface-aware presence. */
export function DashboardSectionHeader({
  title,
  subtitle,
  icon,
  iconToneClassName = "bg-violet-50 text-violet-700 ring-1 ring-violet-100",
  trailing,
  bordered = true,
  className,
  titleId,
  variant = "default",
}: {
  title: string;
  subtitle?: ReactNode;
  icon?: ReactNode;
  iconToneClassName?: string;
  trailing?: ReactNode;
  bordered?: boolean;
  className?: string;
  titleId?: string;
  variant?: DashboardSectionHeaderVariant;
}) {
  const isFeature = variant === "feature";
  const isHoldings = variant === "holdings";

  return (
    <div
      className={cn(
        "flex min-w-0 items-start justify-between gap-4",
        bordered &&
          (isFeature
            ? "border-b border-white/10"
            : isHoldings
              ? "border-b border-slate-200/80"
              : "border-b border-slate-100"),
        isFeature
          ? "bg-white/[0.03] px-4 py-5 md:px-6 md:py-5"
          : isHoldings
            ? "bg-gradient-to-r from-slate-50/90 to-white px-4 py-5 md:px-6 md:py-5"
            : variant === "compact"
              ? "px-4 py-4 md:px-5 md:py-4"
              : "bg-slate-50/50 px-4 py-5 md:px-6 md:py-5",
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-3.5 md:gap-4">
        {icon ? (
          <div
            className={cn(
              "flex shrink-0 items-center justify-center rounded-2xl shadow-sm",
              isFeature
                ? "h-11 w-11 bg-violet-500/20 text-violet-200 ring-1 ring-violet-400/25"
                : isHoldings
                  ? "h-11 w-11 bg-white text-slate-700 ring-1 ring-slate-200/90"
                  : "h-10 w-10",
              !isFeature && !isHoldings && iconToneClassName,
            )}
          >
            {icon}
          </div>
        ) : null}
        <div className="min-w-0 pt-0.5">
          <h2
            id={titleId}
            className={cn(
              appSectionTitleClass,
              isFeature && "text-white",
            )}
          >
            {title}
          </h2>
          {subtitle ? (
            <div
              className={cn(
                "mt-1.5",
                isFeature
                  ? appDashboardDarkMutedClass
                  : appSectionSubtitleClass,
              )}
            >
              {subtitle}
            </div>
          ) : null}
        </div>
      </div>
      {trailing ? <div className="shrink-0 pt-0.5">{trailing}</div> : null}
    </div>
  );
}
