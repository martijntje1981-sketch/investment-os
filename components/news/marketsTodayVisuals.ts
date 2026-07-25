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
  { textClass: string; dotClass: string; label: string }
> = {
  Positive: {
    textClass: "text-emerald-700",
    dotClass: "bg-emerald-500",
    label: "Sentiment: Positive",
  },
  Neutral: {
    textClass: "text-slate-600",
    dotClass: "bg-slate-400",
    label: "Sentiment: Neutral",
  },
  Negative: {
    textClass: "text-red-700",
    dotClass: "bg-red-500",
    label: "Sentiment: Negative",
  },
  unavailable: {
    textClass: "text-slate-500",
    dotClass: "bg-slate-300",
    label: "Sentiment unavailable",
  },
};

export function marketsTodayRegionGridClass(index: number): string {
  return index < 3 ? "xl:col-span-2" : "xl:col-span-3";
}
