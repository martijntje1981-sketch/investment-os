import { ArrowUpRight } from "lucide-react";

import { formatNewsPublishedAt } from "@/components/news/newsFormatting";
import type { NewsContentItem } from "@/lib/types/newsContent";

function reasonItMatters(item: NewsContentItem): string {
  if (item.interpretation?.trim()) {
    return item.interpretation.trim();
  }
  if (item.summary?.trim()) {
    return item.summary.trim();
  }
  return "Portfolio-relevant development in today's briefing.";
}

export function NewsCompactArticleRow({
  item,
  variant = "light",
  compact = false,
}: {
  item: NewsContentItem;
  variant?: "light" | "dark";
  compact?: boolean;
}) {
  const isDark = variant === "dark";
  const holdings =
    item.matchedHoldings.length > 0
      ? item.matchedHoldings.map((holding) => holding.symbol)
      : item.matchedSymbols;

  return (
    <article
      className={`min-w-0 rounded-[16px] border px-4 py-3 ${
        isDark
          ? "border-white/10 bg-white/[0.03]"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3
            className={`text-base font-semibold leading-snug ${
              isDark ? "text-slate-100" : "text-slate-950"
            }`}
          >
            {item.title}
          </h3>
          {!compact ? (
            <p
              className={`mt-1 line-clamp-2 text-sm leading-relaxed ${
                isDark ? "text-slate-300" : "text-slate-600"
              }`}
            >
              {reasonItMatters(item)}
            </p>
          ) : null}
          <div
            className={`mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs ${
              isDark ? "text-slate-400" : "text-slate-500"
            }`}
          >
            <span>{item.sourceName}</span>
            <span aria-hidden>·</span>
            <span>{formatNewsPublishedAt(item.publishedAt)}</span>
            {holdings.length > 0 ? (
              <>
                <span aria-hidden>·</span>
                <span>{holdings.slice(0, 3).join(", ")}</span>
              </>
            ) : null}
          </div>
        </div>
        <a
          href={item.canonicalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex min-h-[44px] shrink-0 items-center gap-1 rounded-xl border px-3 py-2 text-sm font-bold transition ${
            isDark
              ? "border-white/15 text-white hover:bg-white/10"
              : "border-slate-200 text-slate-700 hover:bg-slate-50"
          }`}
        >
          Open
          <ArrowUpRight className="h-4 w-4" aria-hidden />
        </a>
      </div>
    </article>
  );
}
