"use client";

import { PlayCircle } from "lucide-react";

import { MarketVideoCard } from "@/components/news/MarketVideoCard";
import { NewsArticleCard } from "@/components/news/NewsArticleCard";
import { isStrongPortfolioItem } from "@/lib/services/news/newsFeedRanking";
import type { NewsContentItem } from "@/lib/types/newsContent";

export function NewsFeedItem({ item }: { item: NewsContentItem }) {
  if (item.sourceType === "youtube") {
    return (
      <div className="relative">
        <span className="absolute right-4 top-4 z-10 inline-flex items-center gap-1 rounded-full bg-violet-600 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white">
          <PlayCircle className="h-3 w-3" />
          Video
        </span>
        <MarketVideoCard item={item} />
      </div>
    );
  }

  return (
    <NewsArticleCard
      item={item}
      variant={isStrongPortfolioItem(item) ? "portfolio" : "macro"}
    />
  );
}
