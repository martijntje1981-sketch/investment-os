"use client";

import { ChevronDown, PlayCircle } from "lucide-react";
import { useState } from "react";

import {
  appSectionLabelClass,
  appSectionMetaClass,
  appSectionTitleClass,
} from "@/components/layout/appSurface";
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
            <p className={appSectionLabelClass}>
              Secondary coverage
            </p>
            <h2 className={`mt-1 ${appSectionTitleClass}`}>
              Market videos
            </h2>
            <p className={`mt-1 ${appSectionMetaClass}`}>
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
