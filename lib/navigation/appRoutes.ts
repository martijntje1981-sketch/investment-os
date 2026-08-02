/**
 * Canonical authenticated-app routes.
 * Prefer these constants over string literals so mobile and desktop share one href.
 */

export const DASHBOARD_PATH = "/dashboard";
export const PORTFOLIO_PATH = "/portfolio";
export const ANALYSIS_PATH = "/analysis";
export const GOALS_PATH = "/goals";
export const PORTFOLIO_HEALTH_PATH = "/portfolio-health";

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
