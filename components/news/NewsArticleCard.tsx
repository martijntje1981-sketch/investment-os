import { BookOpen, ExternalLink } from "lucide-react";

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
          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-600">
            {item.marketCategory}
          </span>
          {item.relevanceLabel ? (
            <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-[10px] font-bold text-emerald-800">
              {item.relevanceLabel}
            </span>
          ) : null}
        </div>

        {item.matchedHoldings.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {item.matchedHoldings.map((holding) => (
              <span
                key={holding.id}
                className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-bold text-emerald-900"
              >
                {holding.symbol}
              </span>
            ))}
          </div>
        ) : null}

        <h3 className="mt-5 text-2xl font-black leading-9 tracking-[-0.04em] text-slate-950">
          {item.title}
        </h3>

        <div className="mt-5 space-y-4">
          <div className="rounded-[22px] border border-slate-200/80 bg-slate-50/90 p-5">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
              Summary
            </p>
            <p className="mt-3 line-clamp-3 text-sm leading-7 text-slate-700">{item.summary}</p>
          </div>

          <div className="rounded-[22px] border border-violet-100 bg-violet-50/70 p-5">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-violet-700">
              <BookOpen className="h-3.5 w-3.5" />
              Interpretation
            </div>
            <p className="mt-3 line-clamp-3 text-sm leading-7 text-slate-700">{item.interpretation}</p>
          </div>
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
