"use client";

import { useId, type ReactNode } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";

import {
  appCardPaddingClass,
  appDashboardLightCardClass,
  appSectionMetaClass,
  appTextLinkClass,
} from "@/components/layout/appSurface";
import { DashboardSectionHeader } from "@/components/dashboard/DashboardSectionHeader";
import { useDashboardSectionExpanded } from "@/lib/client/useDashboardSectionExpanded";

type ExpandableDashboardSectionProps = {
  sectionKey: string;
  title: string;
  titleId?: string;
  subtitle?: string;
  icon?: ReactNode;
  iconToneClassName?: string;
  /** One-line Level 1 summary always visible. */
  summary?: ReactNode;
  /** Compact Level 1 preview (always visible). */
  preview: ReactNode;
  /** Level 2 content revealed on expand. */
  expandedContent?: ReactNode;
  /** Deep link to Level 3 dedicated page. */
  deepLink?: { href: string; label: string };
  expandLabel?: string;
  collapseLabel?: string;
  /** When false, section stays always-compact (no toggle). */
  expandable?: boolean;
  loading?: boolean;
  className?: string;
};

/**
 * Restrained progressive-disclosure shell for Dashboard sections.
 * Expand and deep-link actions stay separate; no nested disclosure.
 */
export function ExpandableDashboardSection({
  sectionKey,
  title,
  titleId,
  subtitle,
  icon,
  iconToneClassName,
  summary,
  preview,
  expandedContent,
  deepLink,
  expandLabel = "Show more",
  collapseLabel = "Show less",
  expandable = true,
  loading = false,
  className,
}: ExpandableDashboardSectionProps) {
  const contentId = useId();
  const resolvedTitleId = titleId ?? `${sectionKey}-heading`;
  const canExpand = expandable && Boolean(expandedContent);
  const { expanded, setExpanded } = useDashboardSectionExpanded(
    sectionKey,
    false,
  );

  return (
    <section
      aria-labelledby={resolvedTitleId}
      aria-busy={loading || undefined}
      className={`min-w-0 ${appDashboardLightCardClass} ${className ?? ""}`}
      data-dashboard-section={sectionKey}
      data-expanded={canExpand ? expanded : undefined}
    >
      <DashboardSectionHeader
        titleId={resolvedTitleId}
        variant="compact"
        title={title}
        subtitle={subtitle}
        icon={icon}
        iconToneClassName={iconToneClassName}
        bordered={false}
        trailing={
          deepLink ? (
            <Link href={deepLink.href} className={appTextLinkClass}>
              {deepLink.label}
            </Link>
          ) : undefined
        }
      />

      <div className={`${appCardPaddingClass} space-y-3 pt-0`}>
        {summary ? (
          <div className={appSectionMetaClass}>{summary}</div>
        ) : null}

        <div id={contentId}>{preview}</div>

        {canExpand && expanded ? (
          <div data-expanded-panel={sectionKey}>{expandedContent}</div>
        ) : null}

        {canExpand ? (
          <button
            type="button"
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg px-1 text-sm font-semibold text-slate-700 underline-offset-4 transition hover:text-slate-950 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2"
            aria-expanded={expanded}
            aria-controls={contentId}
            onClick={() => setExpanded(!expanded)}
          >
            <ChevronDown
              className={`h-4 w-4 shrink-0 transition-transform duration-150 motion-reduce:transition-none ${
                expanded ? "rotate-180" : ""
              }`}
              aria-hidden
            />
            {expanded ? collapseLabel : expandLabel}
          </button>
        ) : null}
      </div>
    </section>
  );
}
