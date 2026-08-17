/**
 * Canonical authenticated-app routes.
 * Prefer these constants over string literals so mobile and desktop share one href.
 */

export const DASHBOARD_PATH = "/dashboard";
export const PORTFOLIO_PATH = "/portfolio";
export const ANALYSIS_PATH = "/analysis";
export const GOALS_PATH = "/goals";
export const PORTFOLIO_HEALTH_PATH = "/portfolio-health";
export const PORTFOLIO_HISTORY_PATH = "/portfolio-history";
export const REVIEW_PATH = "/review";
export const NEWS_PATH = "/news";
export const MARKET_PULSE_PATH = "/market-pulse";
export const PERSPECTIVES_PATH = "/perspectives";
export const DISCOVER_HUB_PATH = "/discover";
export const SETTINGS_PATH = "/settings";
export const UPLOAD_PATH = "/upload";
export const HELP_CENTRE_PATH = "/faq";
export const SUPPORTED_INSTRUMENTS_PATH = "/supported-instruments";

/** Four Questions authenticated hubs. */
export const WHAT_HAPPENED_HUB_PATH = "/what-happened";
export const WHAT_MATTERS_HUB_PATH = "/what-matters";
export const ON_TRACK_HUB_PATH = "/on-track";
export const WHATS_AHEAD_HUB_PATH = "/whats-ahead";

/** Holding detail — shared by Portfolio list and Dashboard movers. */
export function holdingDetailPath(symbol: string): string {
  const normalized = symbol.trim();
  if (!normalized) {
    return PORTFOLIO_PATH;
  }
  return `/holding/${encodeURIComponent(normalized)}`;
}

/** Optional Portfolio add-flow query. */
export function portfolioAddPath(
  assetType: "investment" | "cash" | "crypto" = "investment",
): string {
  return `${PORTFOLIO_PATH}?add=${assetType}`;
}

export function isPortfolioListPath(pathname: string): boolean {
  return (
    pathname === PORTFOLIO_PATH || pathname.startsWith(`${PORTFOLIO_PATH}?`)
  );
}
