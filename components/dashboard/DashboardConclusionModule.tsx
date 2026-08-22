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
      "border border-brand/25 bg-gradient-to-br from-brand-soft via-white to-[#f4f8fc]",
    accentBorder: "border-l-[3px] border-l-brand",
    iconSurface: "bg-brand-soft text-q1-strong ring-1 ring-brand/20",
    iconClass: "text-q1-strong",
    labelClass: "text-q1-deep",
    Icon: Sparkles,
  },
  resilience: {
    surface:
      "border border-q2/30 bg-gradient-to-br from-q2-soft via-white to-[#f4f7fb]",
    accentBorder: "border-l-[3px] border-l-q2",
    iconSurface: "bg-q2-soft text-q2-strong ring-1 ring-q2/20",
    iconClass: "text-q2-strong",
    labelClass: "text-q2-deep",
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
      "border border-q4/30 bg-gradient-to-br from-q4-soft via-white to-[#f4f6f9]",
    accentBorder: "border-l-[3px] border-l-q4",
    iconSurface: "bg-q4-soft text-q4-strong ring-1 ring-q4/20",
    iconClass: "text-q4-strong",
    labelClass: "text-q4-deep",
    Icon: Radio,
  },
  review: {
    surface:
      "border border-q3/30 bg-gradient-to-br from-q3-soft via-white to-[#f4f6fa]",
    accentBorder: "border-l-[3px] border-l-q3",
    iconSurface: "bg-q3-soft text-q3-strong ring-1 ring-q3/20",
    iconClass: "text-q3-strong",
    labelClass: "text-q3-deep",
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
          {card.contextLine ? (
            <p
              className={`mt-1 line-clamp-1 ${appSectionMetaClass} text-[12px] text-slate-500`}
              data-testid="dashboard-goal-assumption-context"
            >
              {card.contextLine}
            </p>
          ) : null}
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
