export type {
  NewsGlanceBiggerPictureItem,
  NewsGlanceHoldingRow,
  NewsGlanceMarketRegionId,
  NewsGlanceMarketTile,
  NewsGlanceMatchKind,
  NewsGlanceMoveDirection,
  NewsGlanceSynthesis,
  NewsGlanceView,
  NewsGlanceVisualFamily,
} from "@/lib/services/newsGlance/types";
export {
  NEWS_GLANCE_BIGGER_PICTURE_LIMIT,
  NEWS_GLANCE_HOLDING_LIMIT_DESKTOP,
  NEWS_GLANCE_HOLDING_LIMIT_MOBILE,
  NEWS_GLANCE_MARKET_REGION_IDS,
  NEWS_GLANCE_NO_MATERIAL,
} from "@/lib/services/newsGlance/types";
export { buildNewsGlance } from "@/lib/services/newsGlance/buildNewsGlance";
export { assertNoNewsGlanceAdvisoryLanguage } from "@/lib/services/newsGlance/wording";
export {
  NEWS_DETAIL_MODULES,
  NEWS_EXPLORE_DESTINATIONS,
  newsDetailHref,
  newsDetailTitle,
  resolveNewsDetailId,
} from "@/lib/services/newsGlance/newsDetailCatalog";
export type { NewsDetailId } from "@/lib/services/newsGlance/newsDetailCatalog";
