import type { NewsContentItem, NewsFeedFetchResult } from "@/lib/types/newsContent";

export type NewsProviderFetchContext = {
  fetchedAt: string;
  timeoutMs: number;
};

export interface NewsContentProvider {
  readonly id: string;
  readonly sourceName: string;
  readonly sourceType: NewsContentItem["sourceType"];
  fetchItems(context: NewsProviderFetchContext): Promise<NewsFeedFetchResult>;
}
