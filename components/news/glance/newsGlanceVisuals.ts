import type { NewsGlanceVisualFamily } from "@/lib/services/newsGlance";

export const NEWS_GLANCE_FAMILY_ACCENT: Record<
  NewsGlanceVisualFamily,
  { bar: string; chip: string }
> = {
  holding: {
    bar: "bg-sky-400/80",
    chip: "border-sky-400/25 bg-sky-500/10 text-sky-200",
  },
  macro: {
    bar: "bg-violet-400/80",
    chip: "border-violet-400/25 bg-violet-500/10 text-violet-200",
  },
  crypto: {
    bar: "bg-amber-400/80",
    chip: "border-amber-400/25 bg-amber-500/10 text-amber-200",
  },
  commodities: {
    bar: "bg-yellow-400/70",
    chip: "border-yellow-400/25 bg-yellow-500/10 text-yellow-100",
  },
};

export function newsGlanceMoveClass(
  direction: "up" | "down" | "flat" | "unknown",
): string {
  if (direction === "up") return "text-emerald-400";
  if (direction === "down") return "text-rose-400";
  return "text-white";
}
