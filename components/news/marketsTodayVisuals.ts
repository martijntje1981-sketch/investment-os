import type { LucideIcon } from "lucide-react";
import {
  Bitcoin,
  Building2,
  Globe2,
  Landmark,
  Sunrise,
} from "lucide-react";

import type { MarketsTodayRegionId } from "@/lib/services/news/marketsTodayRegionalClassification";
import type { MarketsTodaySentiment } from "@/lib/services/news/newsMarketsToday";
import type { NewsImpactLevel } from "@/lib/types/newsContent";

export type MarketsTodayRegionVisual = {
  icon: LucideIcon;
  accentBorderClass: string;
  iconSurfaceClass: string;
  iconClass: string;
  gradientClass: string;
};

export const MARKETS_TODAY_REGION_VISUALS: Record<
  MarketsTodayRegionId,
  MarketsTodayRegionVisual
> = {
  global: {
    icon: Globe2,
    accentBorderClass: "border-t-violet-500",
    iconSurfaceClass: "bg-violet-50",
    iconClass: "text-violet-700",
    gradientClass: "from-violet-50/80 to-white",
  },
  europe: {
    icon: Landmark,
    accentBorderClass: "border-t-blue-500",
    iconSurfaceClass: "bg-blue-50",
    iconClass: "text-blue-700",
    gradientClass: "from-blue-50/70 to-white",
  },
  us: {
    icon: Building2,
    accentBorderClass: "border-t-emerald-500",
    iconSurfaceClass: "bg-emerald-50",
    iconClass: "text-emerald-700",
    gradientClass: "from-emerald-50/70 to-white",
  },
  asia: {
    icon: Sunrise,
    accentBorderClass: "border-t-amber-500",
    iconSurfaceClass: "bg-amber-50",
    iconClass: "text-amber-700",
    gradientClass: "from-amber-50/70 to-white",
  },
  crypto: {
    icon: Bitcoin,
    accentBorderClass: "border-t-yellow-500",
    iconSurfaceClass: "bg-yellow-50",
    iconClass: "text-yellow-700",
    gradientClass: "from-yellow-50/70 to-white",
  },
};

export const MARKETS_TODAY_SENTIMENT_STYLES: Record<
  MarketsTodaySentiment,
  { textClass: string; dotClass: string; label: string; shortLabel: string }
> = {
  Positive: {
    textClass: "text-emerald-700",
    dotClass: "bg-emerald-500",
    label: "Sentiment: Positive",
    shortLabel: "Positive",
  },
  Neutral: {
    textClass: "text-slate-600",
    dotClass: "bg-slate-400",
    label: "Sentiment: Neutral",
    shortLabel: "Neutral",
  },
  Negative: {
    textClass: "text-red-700",
    dotClass: "bg-red-500",
    label: "Sentiment: Negative",
    shortLabel: "Negative",
  },
  unavailable: {
    textClass: "text-slate-500",
    dotClass: "bg-slate-300",
    label: "Sentiment unavailable",
    shortLabel: "Unavailable",
  },
};

export const MARKETS_TODAY_IMPACT_STYLES: Record<
  NewsImpactLevel,
  {
    label: string;
    badgeClass: string;
    rowClass: string;
  }
> = {
  "High Impact": {
    label: "High impact",
    badgeClass: "bg-rose-100 text-rose-800 ring-1 ring-inset ring-rose-200",
    rowClass:
      "rounded-xl border border-rose-200/80 bg-rose-50/50 px-2.5 py-2 shadow-sm",
  },
  "Medium Impact": {
    label: "Medium impact",
    badgeClass: "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200",
    rowClass: "rounded-xl border border-slate-200 bg-white/80 px-2.5 py-2",
  },
  "Low Impact": {
    label: "Lower impact",
    badgeClass: "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200",
    rowClass: "rounded-xl border border-transparent bg-transparent px-1 py-1",
  },
};

export function marketsTodayRegionGridClass(index: number): string {
  return index < 3 ? "xl:col-span-2" : "xl:col-span-3";
}
