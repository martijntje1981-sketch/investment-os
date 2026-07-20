"use client";

import { ArrowRight, BriefcaseBusiness } from "lucide-react";

import { formatNewsPublishedAt } from "@/components/news/newsFormatting";
import type { NewsContentItem } from "@/lib/types/newsContent";

export function PortfolioNewsPreview({
  items,
  totalCount,
  onViewAll,
}: {
  items: NewsContentItem[];
  totalCount: number;
  onViewAll: () => void;
}) {
  if (items.length === 0) return null;

  return (
    <section className="rounded-[24px] border border-emerald-200/80 bg-white p-4 shadow-sm lg:hidden">
      <div className="flex items-center gap-3">
        <BriefcaseBusiness className="h-5 w-5 text-emerald-700" />
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700">
            For your portfolio
          </p>
          <h2 className="text-base font-black text-slate-950">Top headlines</h2>
        </div>
      </div>

      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <li
            key={item.id}
            className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3"
          >
            <p className="line-clamp-2 text-sm font-bold leading-6 text-slate-950">
              {item.title}
            </p>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">
              {item.sourceName} · Published {formatNewsPublishedAt(item.publishedAt)}
            </p>
          </li>
        ))}
      </ul>

      {totalCount > items.length ? (
        <button
          type="button"
          onClick={onViewAll}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white"
        >
          View all portfolio news
          <ArrowRight className="h-4 w-4" />
        </button>
      ) : null}
    </section>
  );
}
