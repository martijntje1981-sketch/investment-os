import { ExternalLink, Sparkles } from "lucide-react";

import { ImpactBadge } from "@/components/news/ImpactBadge";
import { formatNewsPublishedAt } from "@/components/news/newsFormatting";
import type { NewsContentItem } from "@/lib/types/newsContent";

type NewsArticleCardProps = {
  item: NewsContentItem;
  variant?: "portfolio" | "macro";
};

export function NewsArticleCard({
  item,
  variant = "macro",
}: NewsArticleCardProps) {
  const accentClasses =
    variant === "portfolio"
      ? "border-emerald-200/80 bg-gradient-to-br from-emerald-50/80 to-white"
      : "border-slate-200 bg-white";

  return (
    <article
      className={`overflow-hidden rounded-[28px] border shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg ${accentClasses}`}
    >
      <div className="p-6 sm:p-7">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-slate-950 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-white">
            {item.sourceName}
          </span>
          <ImpactBadge level={item.impactLevel} />
          {item.relevanceLabel && (
            <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-[10px] font-bold text-emerald-800">
              {item.relevanceLabel}
            </span>
          )}
        </div>

        <h3 className="mt-5 text-2xl font-black leading-9 tracking-[-0.04em] text-slate-950">
          {item.title}
        </h3>

        <div className="mt-5 rounded-[22px] border border-slate-200/80 bg-slate-50/90 p-5">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-violet-700">
            <Sparkles className="h-3.5 w-3.5" />
            AI summary
          </div>
          <p className="mt-3 text-sm leading-7 text-slate-700">{item.aiSummary}</p>
          <p className="mt-4 border-t border-slate-200 pt-4 text-sm font-semibold leading-7 text-slate-800">
            {item.whyThisMatters}
          </p>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
            Published {formatNewsPublishedAt(item.publishedAt)}
          </p>
          <a
            href={item.canonicalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
          >
            Open original
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </article>
  );
}
