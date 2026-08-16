import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowUpRight,
  ClipboardList,
  Radio,
  Shield,
  Sparkles,
  Target,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import {
  appCardPaddingCompactClass,
  appSectionLabelClass,
  appSectionMetaClass,
  appTextLinkClass,
} from "@/components/layout/appSurface";
import type { DashboardConclusionCard } from "@/lib/client/dashboardConclusions";

export type DashboardConclusionTone =
  | "intelligence"
  | "resilience"
  | "goal"
  | "goalAttention"
  | "markets"
  | "review";

type DashboardConclusionModuleProps = {
  card: DashboardConclusionCard;
  testId?: string;
  tone?: DashboardConclusionTone;
  statusToneClassName?: string;
  /** Optional contextual visual replacing the tone icon (e.g. goal progress). */
  leadingVisual?: ReactNode;
};

const TONE_VISUAL: Record<
  DashboardConclusionTone,
  {
    surface: string;
    accentBorder: string;
    iconSurface: string;
    iconClass: string;
    labelClass: string;
    Icon: LucideIcon;
  }
> = {
  intelligence: {
    surface:
      "border border-blue-200/70 bg-gradient-to-br from-blue-50/90 via-white to-[#f3f7fb]",
    accentBorder: "border-l-[3px] border-l-blue-500",
    iconSurface: "bg-blue-50 text-blue-800 ring-1 ring-blue-100",
    iconClass: "text-blue-800",
    labelClass: "text-blue-900/80",
    Icon: Sparkles,
  },
  resilience: {
    surface:
      "border border-sky-200/70 bg-gradient-to-br from-sky-50/85 via-white to-[#f4f8fb]",
    accentBorder: "border-l-[3px] border-l-sky-500",
    iconSurface: "bg-sky-50 text-sky-800 ring-1 ring-sky-100",
    iconClass: "text-sky-800",
    labelClass: "text-sky-900/80",
    Icon: Shield,
  },
  goal: {
    surface:
      "border border-emerald-200/65 bg-gradient-to-br from-emerald-50/80 via-white to-[#f5faf7]",
    accentBorder: "border-l-[3px] border-l-emerald-500",
    iconSurface: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100",
    iconClass: "text-emerald-800",
    labelClass: "text-emerald-900/80",
    Icon: Target,
  },
  goalAttention: {
    surface:
      "border border-amber-200/70 bg-gradient-to-br from-amber-50/85 via-white to-[#fbf8f2]",
    accentBorder: "border-l-[3px] border-l-amber-500",
    iconSurface: "bg-amber-50 text-amber-800 ring-1 ring-amber-100",
    iconClass: "text-amber-800",
    labelClass: "text-amber-900/80",
    Icon: Target,
  },
  markets: {
    surface:
      "border border-violet-200/70 bg-gradient-to-br from-violet-50/80 via-white to-[#f7f5fb]",
    accentBorder: "border-l-[3px] border-l-violet-500",
    iconSurface: "bg-violet-50 text-violet-800 ring-1 ring-violet-100",
    iconClass: "text-violet-800",
    labelClass: "text-violet-900/80",
    Icon: Radio,
  },
  review: {
    surface:
      "border border-indigo-200/60 bg-gradient-to-br from-indigo-50/70 via-white to-[#f5f6fb]",
    accentBorder: "border-l-[3px] border-l-indigo-400",
    iconSurface: "bg-indigo-50 text-indigo-800 ring-1 ring-indigo-100",
    iconClass: "text-indigo-800",
    labelClass: "text-indigo-900/75",
    Icon: ClipboardList,
  },
};

/**
 * Lightweight conclusion-first module pattern for Dashboard.
 * Soft tone accents create rhythm without mechanical identical cards.
 */
export function DashboardConclusionModule({
  card,
  testId,
  tone = "intelligence",
  statusToneClassName = "text-slate-950",
  leadingVisual,
}: DashboardConclusionModuleProps) {
  const visual = TONE_VISUAL[tone];
  const Icon = visual.Icon;

  return (
    <section
      className={`min-w-0 overflow-hidden rounded-[24px] shadow-[var(--shadow-card)] md:rounded-[28px] ${visual.surface} ${visual.accentBorder} ${appCardPaddingCompactClass}`}
      data-testid={testId}
      aria-label={card.eyebrow}
    >
      <div className="flex items-start gap-3">
        {leadingVisual ? (
          <span className="mt-0.5 shrink-0">{leadingVisual}</span>
        ) : (
          <span
            className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl ${visual.iconSurface}`}
            aria-hidden
          >
            <Icon className={`h-4 w-4 ${visual.iconClass}`} />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className={`${appSectionLabelClass} ${visual.labelClass}`}>
            {card.eyebrow}
          </p>
          <p
            className={`mt-1 text-[1.05rem] font-bold tracking-[-0.02em] ${statusToneClassName}`}
          >
            {card.status}
          </p>
          <p
            className={`mt-1.5 line-clamp-2 ${appSectionMetaClass} text-[14px] leading-snug text-slate-700`}
          >
            {card.conclusion}
          </p>
          <Link
            href={card.ctaHref}
            className={`mt-3 inline-flex min-h-11 items-center gap-1.5 ${appTextLinkClass}`}
            data-testid={testId ? `${testId}-cta` : undefined}
          >
            {card.ctaLabel}
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
