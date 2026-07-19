/**
 * Curated allowlist of official YouTube channel RSS feeds.
 *
 * Feed URL format (documented by YouTube):
 * https://www.youtube.com/feeds/videos.xml?channel_id=CHANNEL_ID
 *
 * Each channel ID was verified to return HTTP 200 and a valid Atom feed title.
 */

export type CuratedYouTubeSource = {
  id: string;
  sourceName: string;
  channelId: string;
  feedUrl: string;
  category: "markets" | "macro" | "crypto" | "general";
};

export const CURATED_YOUTUBE_SOURCES: CuratedYouTubeSource[] = [
  {
    id: "youtube-bloomberg-television",
    sourceName: "Bloomberg Television",
    channelId: "UCIALMKvObZNtJ6AmdCLP7Lg",
    feedUrl:
      "https://www.youtube.com/feeds/videos.xml?channel_id=UCIALMKvObZNtJ6AmdCLP7Lg",
    category: "markets",
  },
  {
    id: "youtube-cnbc-television",
    sourceName: "CNBC Television",
    channelId: "UCrp_UI8XtuYfpiqluWLD7Lw",
    feedUrl:
      "https://www.youtube.com/feeds/videos.xml?channel_id=UCrp_UI8XtuYfpiqluWLD7Lw",
    category: "markets",
  },
  {
    id: "youtube-coin-bureau",
    sourceName: "Coin Bureau",
    channelId: "UCqK_GSMbpiV8spgD3ZGloSw",
    feedUrl:
      "https://www.youtube.com/feeds/videos.xml?channel_id=UCqK_GSMbpiV8spgD3ZGloSw",
    category: "crypto",
  },
];
