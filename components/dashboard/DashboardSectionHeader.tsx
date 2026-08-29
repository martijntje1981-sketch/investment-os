import {
  appDashboardDarkMutedClass,
  appIntelligenceAccentIconWellClass,
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
  iconToneClassName = appIntelligenceAccentIconWellClass,
  trailing,
  bordered = true,
  className,
  titleId,
  variant = "default",
  density = "default",
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
  density?: "default" | "compact";
}) {
  const isFeature = variant === "feature";
  const isHoldings = variant === "holdings";
  const isCompact = density === "compact";

  return (
    <div
      className={cn(
        "flex min-w-0 items-start justify-between gap-3 md:gap-4",
        bordered &&
          (isFeature
            ? "border-b border-white/10"
            : isHoldings
              ? "border-b border-slate-200/80"
              : "border-b border-slate-100"),
        isFeature
          ? isCompact
            ? "bg-white/[0.03] px-3.5 py-2 sm:px-5 sm:py-2.5"
            : "bg-white/[0.03] px-4 py-5 md:px-6 md:py-5"
          : isHoldings
            ? "bg-gradient-to-r from-slate-50/90 to-white px-4 py-5 md:px-6 md:py-5"
            : variant === "compact"
              ? "px-4 py-4 md:px-5 md:py-4"
              : "bg-slate-50/50 px-4 py-5 md:px-6 md:py-5",
        className,
      )}
    >
      <div className={cn("flex min-w-0 items-start", isCompact ? "gap-2.5" : "gap-3.5 md:gap-4")}>
        {icon ? (
          <div
            className={cn(
              "flex shrink-0 items-center justify-center shadow-sm",
              isCompact ? "rounded-xl" : "rounded-2xl",
              isFeature
                ? isCompact
                  ? "h-8 w-8 bg-brand/20 text-brand ring-1 ring-brand/30"
                  : "h-11 w-11 bg-brand/20 text-brand ring-1 ring-brand/30"
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
                isCompact ? "mt-0.5" : "mt-1.5",
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
