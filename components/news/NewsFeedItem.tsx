"use client";

import { MarketVideoCard } from "@/components/news/MarketVideoCard";
import { NewsArticleCard } from "@/components/news/NewsArticleCard";
import { NewsCompactArticleRow } from "@/components/news/NewsCompactArticleRow";
import { NewsCompactVideoRow } from "@/components/news/NewsCompactVideoRow";
import { isStrongPortfolioItem } from "@/lib/services/news/newsFeedRanking";
import type { NewsContentItem } from "@/lib/types/newsContent";

export function NewsFeedItem({
  item,
  compact = true,
}: {
  item: NewsContentItem;
  compact?: boolean;
}) {
  if (compact) {
    return item.sourceType === "youtube" ? (
      <NewsCompactVideoRow item={item} />
    ) : (
      <NewsCompactArticleRow item={item} />
    );
  }

  if (item.sourceType === "youtube") {
    return <MarketVideoCard item={item} />;
  }

  return (
    <NewsArticleCard
      item={item}
      variant={isStrongPortfolioItem(item) ? "portfolio" : "macro"}
    />
  );
}
