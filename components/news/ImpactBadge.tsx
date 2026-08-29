import type { NewsImpactLevel } from "@/lib/types/newsContent";

const IMPACT_STYLES: Record<
  NewsImpactLevel,
  { badge: string; dot: string }
> = {
  "High Impact": {
    badge: "bg-red-950 text-red-50",
    dot: "bg-red-500",
  },
  "Medium Impact": {
    badge: "bg-amber-100 text-amber-900",
    dot: "bg-amber-500",
  },
  "Low Impact": {
    badge: "bg-slate-100 text-slate-700",
    dot: "bg-slate-400",
  },
};

export function ImpactBadge({ level }: { level: NewsImpactLevel }) {
  const styles = IMPACT_STYLES[level];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${styles.badge}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${styles.dot}`} />
      {level}
    </span>
  );
}
