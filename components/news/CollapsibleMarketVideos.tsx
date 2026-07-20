"use client";

import { ChevronDown, PlayCircle } from "lucide-react";
import { useState } from "react";

import { MarketVideoCard } from "@/components/news/MarketVideoCard";
import { NewsEmptyState } from "@/components/news/NewsEmptyState";
import type { NewsContentItem } from "@/lib/types/newsContent";

export function CollapsibleMarketVideos({
  videos,
}: {
  videos: NewsContentItem[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left sm:px-8"
        aria-expanded={open}
      >
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-slate-950 text-white">
            <PlayCircle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
              Secondary coverage
            </p>
            <h2 className="mt-1 text-xl font-black tracking-[-0.04em] text-slate-950 sm:text-2xl">
              Market videos
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Bloomberg Television, CNBC Television, and Coin Bureau
            </p>
          </div>
        </div>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-slate-500 transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div className="border-t border-slate-100 px-5 pb-6 pt-2 sm:px-8 sm:pb-8">
          {videos.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {videos.map((item) => (
                <MarketVideoCard key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <NewsEmptyState
              title="No market videos available"
              description="Video feeds could not be loaded at the moment. Try refreshing your brief."
            />
          )}
        </div>
      ) : null}
    </section>
  );
}
