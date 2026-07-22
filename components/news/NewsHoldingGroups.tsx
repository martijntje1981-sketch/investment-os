"use client";

import { useState } from "react";
import { ArrowUpRight } from "lucide-react";

import type { HoldingNewsGroup } from "@/lib/services/news/newsBriefingLayout";

function groupSummary(group: HoldingNewsGroup): string {
  const parts: string[] = [];
  if (group.articles.length > 0) {
    parts.push(`${group.articles.length} article${group.articles.length === 1 ? "" : "s"}`);
  }
  if (group.videos.length > 0) {
    parts.push(`${group.videos.length} video${group.videos.length === 1 ? "" : "s"}`);
  }
  if (group.analystUpdates.length > 0) {
    parts.push(
      `${group.analystUpdates.length} analyst update${group.analystUpdates.length === 1 ? "" : "s"}`,
    );
  }
  if (group.dividendUpdates.length > 0) {
    parts.push(
      `${group.dividendUpdates.length} dividend update${group.dividendUpdates.length === 1 ? "" : "s"}`,
    );
  }
  return parts.join(" · ");
}

export function NewsHoldingGroups({ groups }: { groups: HoldingNewsGroup[] }) {
  const [openSymbol, setOpenSymbol] = useState<string | null>(null);

  if (groups.length === 0) return null;

  return (
    <section aria-labelledby="news-holding-groups-heading" className="min-w-0 space-y-3">
      <div>
        <h2
          id="news-holding-groups-heading"
          className="text-lg font-black tracking-[-0.02em] text-slate-950"
        >
          By holding
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-slate-500">
          Portfolio coverage grouped by affected holding.
        </p>
      </div>

      <ul className="space-y-2">
        {groups.map((group) => {
          const isOpen = openSymbol === group.symbol;
          const primaryLink =
            group.articles[0]?.canonicalUrl ??
            group.videos[0]?.canonicalUrl ??
            group.analystUpdates[0]?.canonicalUrl ??
            group.dividendUpdates[0]?.canonicalUrl ??
            null;

          return (
            <li
              key={group.symbol}
              className="min-w-0 rounded-[16px] border border-slate-200 bg-white px-4 py-3"
            >
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-base font-semibold text-slate-950">{group.symbol}</p>
                  <p className="text-sm text-slate-500">{group.name}</p>
                  <p className="mt-1 text-sm text-slate-600">{groupSummary(group)}</p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setOpenSymbol((current) =>
                      current === group.symbol ? null : group.symbol,
                    )
                  }
                  className="inline-flex min-h-[44px] shrink-0 items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  {isOpen ? "Close" : "Open"}
                </button>
              </div>

              {isOpen ? (
                <ul className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                  {[...group.articles, ...group.videos, ...group.analystUpdates, ...group.dividendUpdates]
                    .slice(0, 5)
                    .map((item) => (
                      <li key={item.id}>
                        <a
                          href={item.canonicalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-h-[44px] items-center gap-1 text-sm font-semibold text-violet-700"
                        >
                          {item.title}
                          <ArrowUpRight className="h-4 w-4" aria-hidden />
                        </a>
                      </li>
                    ))}
                  {primaryLink ? (
                    <li>
                      <a
                        href={primaryLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-[44px] items-center gap-1 text-sm font-bold text-slate-700"
                      >
                        View primary source
                        <ArrowUpRight className="h-4 w-4" aria-hidden />
                      </a>
                    </li>
                  ) : null}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
