import { ExternalLink, PlayCircle } from "lucide-react";

import { ImpactBadge } from "@/components/news/ImpactBadge";
import { formatNewsPublishedAt } from "@/components/news/newsFormatting";
import type { NewsContentItem } from "@/lib/types/newsContent";

export function MarketVideoCard({ item }: { item: NewsContentItem }) {
  return (
    <article className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="relative aspect-video bg-slate-100">
        {item.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.thumbnailUrl}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <PlayCircle className="h-12 w-12 text-slate-300" />
          </div>
        )}
        <span className="absolute left-3 top-3 rounded-full bg-slate-950/85 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white">
          {item.sourceName}
        </span>
      </div>

      <div className="p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <ImpactBadge level={item.impactLevel} />
        </div>
        <h3 className="mt-4 text-lg font-black leading-8 text-slate-950">{item.title}</h3>
        <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">
          {item.summary}
        </p>
        <div className="mt-5 flex items-center justify-between gap-3">
          <p className="text-xs font-semibold text-slate-500">
            {formatNewsPublishedAt(item.publishedAt)}
          </p>
          <a
            href={item.canonicalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-3 py-2 text-xs font-bold text-white transition hover:bg-slate-800"
          >
            Watch
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </article>
  );
}
