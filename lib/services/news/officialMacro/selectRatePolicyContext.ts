import { isOfficialMacroItem } from "@/lib/services/news/officialMacro/scoreOfficialMacro";
import type { NewsContentItem } from "@/lib/types/newsContent";

const RATE_POLICY_TOPICS = new Set(["interest_rates", "monetary_policy"]);

/**
 * Latest official rate-policy item already in the news pool.
 * Does not invent live policy rates or yields.
 */
export function selectOfficialRatePolicyContext(
  items: NewsContentItem[],
): NewsContentItem | null {
  const ranked = items
    .filter(
      (item) =>
        isOfficialMacroItem(item) &&
        (item.officialFeedKind === "policy_decision" ||
          (item.macroTopic != null && RATE_POLICY_TOPICS.has(item.macroTopic))),
    )
    .sort((left, right) => {
      const kindRank = (item: NewsContentItem) =>
        item.officialFeedKind === "policy_decision" ? 1 : 0;
      const kindDiff = kindRank(right) - kindRank(left);
      if (kindDiff !== 0) return kindDiff;
      return Date.parse(right.publishedAt) - Date.parse(left.publishedAt);
    });

  return ranked[0] ?? null;
}
