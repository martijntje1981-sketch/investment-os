import { ArrowUpRight, PlayCircle } from "lucide-react";

import { formatNewsPublishedAt } from "@/components/news/newsFormatting";
import type { NewsContentItem } from "@/lib/types/newsContent";

export function NewsCompactVideoRow({ item }: { item: NewsContentItem }) {
  const holdings =
    item.matchedHoldings.length > 0
      ? item.matchedHoldings.map((holding) => holding.symbol)
      : item.matchedSymbols;

  return (
    <article className="min-w-0 rounded-[16px] border border-slate-200 bg-white px-3 py-3">
      <div className="flex min-w-0 items-start gap-3">
        <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-100">
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
              <PlayCircle className="h-5 w-5 text-slate-400" aria-hidden />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-base font-semibold leading-snug text-slate-950">
            {item.title}
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
            <span>{item.sourceName}</span>
            <span aria-hidden>·</span>
            <span>{formatNewsPublishedAt(item.publishedAt)}</span>
            {holdings.length > 0 ? (
              <>
                <span aria-hidden>·</span>
                <span>{holdings.slice(0, 2).join(", ")}</span>
              </>
            ) : null}
          </div>
        </div>

        <a
          href={item.canonicalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-[44px] shrink-0 items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
        >
          Watch
          <ArrowUpRight className="h-4 w-4" aria-hidden />
        </a>
      </div>
    </article>
  );
}
