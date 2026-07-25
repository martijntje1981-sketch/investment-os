"use client";

import { MarketVideoCard } from "@/components/news/MarketVideoCard";
import { NewsArticleCard } from "@/components/news/NewsArticleCard";
import { NewsCompactArticleRow } from "@/components/news/NewsCompactArticleRow";
import { NewsCompactVideoRow } from "@/components/news/NewsCompactVideoRow";
import { isStrongPortfolioItem } from "@/lib/services/news/newsFeedRanking";
import { resolveNewsMediaTypeFromItem } from "@/lib/services/news/newsMediaType";
import type { NewsContentItem } from "@/lib/types/newsContent";

export function NewsFeedItem({
  item,
  compact = true,
}: {
  item: NewsContentItem;
  compact?: boolean;
}) {
  const mediaType = resolveNewsMediaTypeFromItem(item);

  if (compact) {
    return mediaType === "video" ? (
      <NewsCompactVideoRow item={item} />
    ) : (
      <NewsCompactArticleRow item={item} />
    );
  }

  if (mediaType === "video") {
    return <MarketVideoCard item={item} />;
  }

  return (
    <NewsArticleCard
      item={item}
      variant={isStrongPortfolioItem(item) ? "portfolio" : "macro"}
    />
  );
}
